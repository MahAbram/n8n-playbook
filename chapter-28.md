---
title: 28. Self-hosting at depth — Docker, queue mode, the PDPA case | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: When self-hosting n8n actually pays off, the production environment variables Chapter 6 didn't have room for, Postgres as the production database, queue mode with workers and Redis, backup discipline, and the honest operational cost — including the updated PDPA cross-border transfer framework that came into force in April 2025.
meta-twitter:title: Learn Automation Working
---

# 28. Self-hosting at depth — Docker, queue mode, the PDPA case

You're on n8n Cloud, and things mostly work. But you've started feeling pressure from three directions at once. A customer asked last week where exactly your workflows process their personal data. Your monthly execution count is climbing toward the ceiling of your plan, and the next tier up is a steeper price than the workload justifies. And you've started wanting capabilities that Cloud doesn't expose — a custom Docker image, deeper monitoring, queue mode tuned the way you want.

You're wondering if self-hosting would be cheaper, more controlled, or both. This chapter is the honest version of that calculation. Most readers will finish it and decide Cloud is still the right answer; some will finish it and start a Docker Compose file. Either is a good outcome — *deciding accurately* is the win.

You do not need this chapter on day one. Chapter 6 covered the install. This one is for the day the install is no longer the limiting factor.

## Who actually needs to self-host

Three honest reasons to self-host, and one anti-reason.

**Data sovereignty and regulated industries.** If you're handling health data under MOH guidelines, financial data under BNM oversight, or government contracts that name specific data-handling requirements, self-hosting gives you a defensible answer to *"where does this data live?"* — "on our infrastructure, in this jurisdiction, and here's the network diagram." n8n Cloud is also a defensible answer for many of these cases, but a more complicated one. Self-hosting eliminates a category of conversation.

**Cost at scale.** n8n Cloud's pricing scales with executions and active workflows. The crossover point varies, but as a rough heuristic: if you're running tens of thousands of executions a month *and* you have someone in-house who can operate a Docker stack, self-hosting starts paying off. Below that volume, the operational time you'll spend almost certainly exceeds the subscription saved.

**Capabilities Cloud doesn't expose.** Custom community nodes you've built or forked. Direct database access for monitoring (querying n8n's own Postgres for execution stats). Specific networking topologies (private VPC, on-prem reverse proxy with corporate TLS). Queue mode tuned to your workload. These all need self-host.

The anti-reason: **"Cloud feels like a black box."** It is somewhat opaque, and that bothers a particular kind of engineer. But the opacity is rarely an *operational* problem; it's an *aesthetic* one. If your real complaint is that you'd like more knobs to turn, self-hosting will give you those knobs and also give you the responsibility for what happens when you turn them wrong. Make sure the knobs are worth the responsibility before crossing over.

### A note on PDPA and cross-border data transfer

The framing of "self-hosting because PDPA requires it" was widely repeated and partly inaccurate before [Malaysia's PDPA Amendment Act 2024](https://www.dlapiperdataprotection.com/?t=transfer&c=MY) came into force in stages through 2025. The cross-border transfer regime took effect on 1 April 2025, with the [Cross-Border Personal Data Transfer Guidelines](https://www.rahmatlim.com/publication/articles/30646/new-guidelines-on-cross-border-personal-data-transfer) published on 29 April 2025.

The accurate picture: **Malaysia has no general data-localisation requirement.** Personal data can be transferred outside Malaysia under Section 129 of the PDPA if the receiving jurisdiction has substantially similar laws or equivalent protection, or if specific exceptions apply — consent, contract performance, due-diligence by the data controller. The new regime replaced the old "whitelist" approach with a risk-based framework where the controller does the assessment.

So self-hosting is not legally required for most PDPA-scope workflows. What it *does* is eliminate the cross-border question entirely — your data never crosses a border in the first place, so you never need to assess whether the destination jurisdiction qualifies. For SMEs that prefer "this conversation doesn't exist" to "we documented our risk assessment," self-hosting is a clean answer. It's a *risk management choice*, not a *compliance requirement*. This chapter is written for SMEs making that choice.

Anything in this section that touches legal interpretation: talk to a Malaysian-qualified data protection lawyer. The 2024 amendments also introduced mandatory DPO appointment thresholds, mandatory breach notification, and data portability rights that aren't directly about hosting — but matter for the same workflows that prompted the hosting question.

## The production env vars Chapter 6 didn't cover

Chapter 6 set up the install. It pointed forward to "the production env vars you actually need" and the chapter you're now reading is where they live. There are perhaps thirty environment variables that matter at depth; the five below are the ones that bite first.

**`N8N_ENCRYPTION_KEY`** — the most important variable in your entire deployment. n8n uses it to encrypt every credential before storing it in the database. Lose it and every credential becomes unreadable; you re-enter them by hand. Generate one good random string (`openssl rand -hex 32`), store it in a secret manager *outside* the database backup, and set it explicitly before first run — the auto-generated default is not something to rely on.

**`WEBHOOK_URL`** — the single most common deployment break. Behind a reverse proxy, n8n runs internally on port 5678 but is exposed externally on 443. Without `WEBHOOK_URL`, n8n auto-calculates the URL wrongly and bakes `localhost:5678` into production webhook nodes. Set it to your full public URL with protocol: `https://n8n.example.com/`.

**`GENERIC_TIMEZONE`** — controls when Schedule Trigger nodes (Chapter 10) decide it's 7 AM. Default is UTC. Build a "daily at 7 AM" workflow without `GENERIC_TIMEZONE=Asia/Kuala_Lumpur` (or your team's zone) and the schedule fires at the wrong hour for months before someone notices.

**`DB_TYPE` and the `DB_POSTGRESDB_*` family** — switches n8n from default SQLite to Postgres for production. The minimum set: `DB_TYPE=postgresdb`, `DB_POSTGRESDB_HOST`, `DB_POSTGRESDB_PORT`, `DB_POSTGRESDB_DATABASE`, `DB_POSTGRESDB_USER`, `DB_POSTGRESDB_PASSWORD`. Next section covers the why.

**`EXECUTIONS_TIMEOUT`** — how long an execution can run before n8n kills it. Default is no timeout, which means a stuck workflow can consume memory until your container OOMs. Set it to a generous-but-finite ceiling (`3600` seconds is a reasonable starting point).

What *not* to set: the legacy `N8N_BASIC_AUTH_ACTIVE`, `N8N_BASIC_AUTH_USER`, `N8N_BASIC_AUTH_PASSWORD` family. These are deprecated and you'll see them in older blog posts and cheat-sheets. Modern n8n uses [in-app user management](https://docs.n8n.io/user-management/) — you set up users through the UI on first run, n8n stores credentials properly, and the basic-auth approach is gone. If you find these variables in a tutorial, it's out of date in other ways too; verify against the [official deployment env var reference](https://docs.n8n.io/hosting/configuration/environment-variables/deployment/).

## Postgres as the production database

SQLite is fine for development and small single-user installs. It's not fine for production. Three reasons:

**Database lock errors under concurrent load.** SQLite serialises writes. Two workflows finishing at the same time, both writing execution records, and one of them fails with `SQLITE_BUSY`. n8n v2.0 added [a pooling driver](https://blog.n8n.io/introducing-n8n-2-0/) that's roughly 10x faster than the old SQLite driver, but the architectural ceiling is still there — it's a single-writer database.

**Slow editor performance once execution history grows.** Browsing execution logs in the n8n UI gets visibly slower past a few thousand executions on SQLite. On Postgres it stays responsive into the hundreds of thousands.

**Queue mode doesn't work on SQLite.** If you ever want to scale beyond one main process, you need Postgres.

The minimum Postgres setup is a second Docker container alongside the n8n container, on the same Docker network, with the env vars from the previous section pointing at it. A bare-bones `docker-compose.yml` skeleton looks like:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: n8n
    volumes:
      - postgres_data:/var/lib/postgresql/data

  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    environment:
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_DATABASE: n8n
      DB_POSTGRESDB_USER: n8n
      DB_POSTGRESDB_PASSWORD: ${POSTGRES_PASSWORD}
      N8N_ENCRYPTION_KEY: ${N8N_ENCRYPTION_KEY}
      WEBHOOK_URL: https://n8n.example.com/
      GENERIC_TIMEZONE: Asia/Kuala_Lumpur
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres

volumes:
  postgres_data:
  n8n_data:
```

Two operational notes. First, `DB_POSTGRESDB_POOL_SIZE` controls how many connections n8n holds open against Postgres; default is 2, raise to ~10 if you see connection-exhaustion errors at scale. Second, managed Postgres (Supabase, RDS, DigitalOcean Managed Databases) is a perfectly valid replacement and usually a better trade-off — you offload backups, replication, point-in-time recovery, and patching to the provider while keeping n8n self-hosted. The data residency question moves to *"where does the managed provider host the database,"* which is a shorter conversation than self-hosting Postgres yourself.

## Queue mode: when scaling pays off

In the default single-mode setup, one main n8n process handles everything: the web UI, webhook reception, schedule firing, *and* actually running the workflows. That works fine up to roughly 200 executions a day on modest hardware. Past that — when a heavy workflow makes the editor lag for everyone else, or when executions visibly queue up waiting for the main process to free up — you've outgrown single mode.

Queue mode splits the work. The main process keeps the UI, webhook reception, and scheduling. **Worker processes** — separate n8n instances run with the worker command — pull executions from a Redis-backed queue and run them in parallel. You scale horizontally by adding workers. The main process never blocks on a long-running execution; it just enqueues and moves on.

The architectural picture: trigger fires → main process creates an execution record in Postgres → main process puts the execution ID onto a Redis queue → next available worker picks it up → worker runs the workflow against the Postgres record → worker writes results back → main process is notified the execution finished. The [official queue mode docs](https://docs.n8n.io/hosting/scaling/queue-mode/) cover the full topology.

The env vars that turn it on: `EXECUTIONS_MODE=queue` on every n8n container, `QUEUE_BULL_REDIS_HOST` and `QUEUE_BULL_REDIS_PORT` pointing at your Redis instance, and a separate worker container that runs `n8n worker` instead of `n8n start`. Optionally `OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=true` if you want the editor's "Execute Workflow" button to also route through workers.

A v2.0-specific note: **task runners are now enabled by default.** Every Code node execution runs in an isolated task-runner process (`N8N_RUNNERS_ENABLED=true`), which is now the default rather than an opt-in. This is a security improvement — Code-node JavaScript can no longer read host environment variables or escape its sandbox as easily. In queue mode the canonical pattern is a `n8nio/runners` sidecar container alongside each worker, with `N8N_RUNNERS_MODE=external`. There have been [real teething issues](https://github.com/n8n-io/n8n/issues/23553) in early v2.x — Code-node timeouts, networking between the runner and worker containers — so test the upgrade path before pushing it to production.

You don't need queue mode until you do. The threshold isn't a precise number; it's a feeling — the editor lags, executions queue, you reach for queue mode. If your workload is steady at a few hundred executions a day and the editor still feels snappy, single mode with Postgres is genuinely enough.

## Backup discipline

The part everyone forgets, and the part that turns a casual outage into an existential one. Three things to back up; missing any one breaks recovery.

**The Postgres database.** Workflows, credentials (encrypted), execution history, user accounts — all in Postgres. The standard tool is `pg_dump`, run nightly via cron, output written to a different machine. A typical command from a Docker host:

```bash
docker exec n8n-postgres pg_dump -U n8n -Fc n8n \
  > /backups/n8n-$(date +%Y%m%d).dump
```

**The `n8n_data` volume.** Not in Postgres: custom community nodes you've installed, binary data from file-handling workflows, the local config file. A complete recovery needs this too. Back it up by running a temporary container that tars the volume:

```bash
docker run --rm \
  -v n8n_data:/source:ro \
  -v /backups:/backup \
  alpine tar czf /backup/n8n-data-$(date +%Y%m%d).tar.gz -C /source .
```

**The encryption key, separately, in a secret manager.** This is the one people get wrong. If you back up the Postgres dump alongside the encryption key in the same place, an attacker who gets the backup gets the keys to decrypt every credential it contains. The key lives in your secret manager (1Password, AWS Secrets Manager, Hashicorp Vault, your team's password manager), separately from the database backups, and gets rotated as carefully as any production secret.

And test the restore. An untested backup is a hypothesis, not a backup. Once a quarter, spin up a fresh n8n instance from scratch using your backup files, confirm you can log in, confirm at least one credential decrypts and authenticates. If the test restore breaks, you've found a real problem before you needed the backup, which is the whole point.

## The honest operational cost

What you stop paying in subscription fees, you start paying in operations time:

- **Patching when CVEs land.** n8n has had real vulnerabilities — [CVE-2026-27495](https://osv.dev/vulnerability/CVE-2026-27495) on external task runners is a recent example. Subscribe to n8n's security advisories and have an upgrade process you can execute in a day.
- **Database upgrades.** Postgres major-version migrations (15 → 16 → 17) happen every year or two. Plan an hour, allocate two.
- **TLS renewal and monitoring.** Let's Encrypt + Caddy usually handles certificates automatically, but breaks occasionally; monitor expiry. A simple uptime check (UptimeRobot, Healthchecks.io) plus a Slack alert covers most of the value of "knowing when n8n is down."
- **The two-engineer rule.** Don't self-host with only one person who can fix it. The day that person is on holiday is the day Redis runs out of disk and every execution queues silently. The operational version of Chapter 9's at-least-two-owners rule.

If reading that list made you tired, Cloud is the right answer for you. If it made you start thinking about the runbook you'd write, self-hosting is genuinely on the table.

## Try it yourself: minimum-viable production self-host

Stand up a self-hosted n8n with Postgres on a VPS or local Docker host. Three services, the essential env vars, named volumes, TLS via a reverse proxy. Budget two hours for a first run; substantially less for subsequent ones.

You'll need: a domain pointing at the machine (`n8n.yourdomain.com`), Docker and Docker Compose installed, and a generated `N8N_ENCRYPTION_KEY` (`openssl rand -hex 32` will do).

1. Create a working directory with a `.env` file containing `N8N_ENCRYPTION_KEY`, `POSTGRES_PASSWORD`, and `N8N_HOST=n8n.yourdomain.com`.
2. Use the `docker-compose.yml` skeleton from the Postgres section above, with `WEBHOOK_URL=https://${N8N_HOST}/` and `N8N_HOST` substituted in.
3. Add a [Caddy](https://caddyserver.com/) or [Traefik](https://traefik.io/) service in the same compose file to handle TLS termination — Caddy is the lower-friction choice (it auto-provisions Let's Encrypt certificates with a one-line config).
4. `docker compose up -d`. Wait for Postgres to be healthy, then n8n.
5. Visit `https://n8n.yourdomain.com/`. Complete the first-run user setup (Owner account, email, password).
6. Build one trivial workflow (Manual Trigger → Set node → No-op), execute it, and run a backup of both Postgres and the `n8n_data` volume using the commands from the backup section.

**You'll know it worked when** you can reach the instance via HTTPS with a valid certificate, you have one working workflow, you've taken a backup, and — the real test — `docker compose down && docker compose up -d` leaves your workflow, credentials, and account intact.

What to add next, in order: a non-trivial workflow using real credentials (proves the encryption key persists across restarts), automated nightly backups via cron, an uptime check, and queue mode only if and when workload demands it.

## The takeaway

- **Most readers don't need to self-host.** Cloud is fine for most SMEs. The three honest reasons are data sovereignty, cost at scale (tens of thousands of executions monthly), and Cloud-not-exposed capabilities.
- **Malaysia's PDPA does not require self-hosting.** The April 2025 Cross-Border Transfer Guidelines replaced the old whitelist with a risk-based framework where cross-border transfer is permitted under defined conditions. Self-hosting *eliminates* the cross-border question; it doesn't fulfil a localisation mandate.
- **`N8N_ENCRYPTION_KEY` is the single most important variable.** Lose it, lose every credential. Store it in a secret manager separately from database backups.
- **`WEBHOOK_URL` is the most common deployment break.** Set it explicitly to your full public URL; don't rely on auto-detection behind a reverse proxy.
- **Postgres for production, not SQLite.** SQLite has lock errors under concurrent load and no queue mode support.
- **Queue mode when you need it, not before.** Single mode handles up to roughly 200 executions/day comfortably. Past that, workers + Redis + Postgres.
- **Three things to back up:** Postgres dump, `n8n_data` volume, encryption key (separately). Test the restore quarterly.
- **The deprecated `N8N_BASIC_AUTH_*` variables should not be used.** Modern n8n uses in-app user management; older tutorials that mention basic auth are out of date.
- **The two-engineer rule applies to self-hosting.** Don't go solo on production infrastructure.

## What's next

Chapter 29 is the graduation chapter for when n8n stops being enough on its own. Reading and writing to Postgres or Supabase directly from a workflow — bypassing CRM rate limits, building internal tools, treating n8n as the orchestration layer over your real systems of record. The same Postgres you might now be self-hosting alongside n8n becomes a *destination* for your workflows, not just n8n's own metadata store. The safety patterns matter: read-only credentials for analytics, scoped writes, never running ad-hoc UPDATE without a WHERE clause someone else has reviewed.
