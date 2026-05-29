---
title: 6. Installing n8n — Cloud, Render, Hostinger, or self-hosted Docker? | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: The decision chapter — four real install paths, when each one makes sense, and the commands that actually work.
meta-twitter:title: Learn Automation Working
---

# 6. Installing n8n — Cloud, Render, Hostinger, or self-hosted Docker?

You finished Ch. 4 with n8n Cloud running and a Personal Morning Brief in your inbox. Good. For most readers, that's the right install — Cloud is the easiest surface, n8n maintains it, and you can stay on it forever.

This chapter is for everyone else, plus the Cloud reader who wants to understand the tradeoff they've taken. Four real install paths, each with a genuine reason to exist. By the end you'll know which one is right for you — and you'll have the actual commands that work today, not the ones that worked in some YouTube tutorial from 2023.

A note up front: install commands age faster than book chapters. Every snippet below is correct at time of writing, pulled from the canonical vendor docs and verified. **If a command on this page doesn't match what's on the vendor's site, follow the vendor.** Links to the canonical docs are alongside each section.

## The four paths

Almost everyone running n8n falls into one of four buckets:

| Path | Best for | Cost (at writing) | Maintenance | Data location |
|---|---|---|---|---|
| **n8n Cloud** | First-time users, small teams, anyone who wants n8n to handle uptime | Free trial → from ~$20/mo on the Starter plan | None — n8n handles updates and uptime | n8n's cloud (EU or US region of choice) |
| **Render (managed Docker)** | Developers comfortable with a Dashboard, teams wanting a cheap cloud middle ground | Free tier viable for testing, ~$7–$25/mo for production | Low — Render handles infra, you handle n8n version bumps | Render's cloud (US, EU, or Asia regions) |
| **Hostinger VPS template** | Malaysian SMEs, small businesses wanting affordable self-host without command-line gymnastics | From RM 26/mo (~USD 6) for VPS with one-click n8n template | Medium — you own the server, the template installs n8n | Your VPS, your jurisdiction |
| **Pure Docker self-host** | Engineering-led teams, regulated industries, anyone with PDPA/GDPR data-residency constraints | Server cost only (often $5–$20/mo for VPS) | High — you own everything | Anywhere you want |

A decision matrix, in plain English:

- **Just learning, no production yet?** n8n Cloud free tier. Skip the rest of this chapter.
- **Want cheap managed hosting with more control than Cloud, and you can read a Dashboard?** Render.
- **In Malaysia or running a regional SME, want self-host without becoming a Docker admin?** Hostinger's n8n VPS template.
- **Regulated data, advanced workflows, full control needed?** Docker self-host on a VPS of your choice.

The rest of the chapter walks each one. Pick yours and read that section; skim the others for context.

## Option 1: n8n Cloud

You already did this in Ch. 4. The recap, plus what to do next:

Go to [n8n.io](https://n8n.io/) and start the free trial. The Cloud free tier (at time of writing: **200 executions/month, one active workflow, 14-day Pro trial** with full features for the first two weeks) is enough to run real workflows. After the trial, the Starter plan unlocks more executions and workflows; check the [n8n pricing page](https://n8n.io/pricing/) for current numbers.

**What Cloud is good at**: zero maintenance, instant setup, automatic updates, integrated billing for AI nodes, n8n-managed uptime SLA on paid tiers. Your credentials are encrypted at rest. The Cloud team handles patching, scaling, and Postgres maintenance — none of which you should be doing in year one.

**What Cloud is not for**: you cannot install community nodes outside the official catalog, your data sits in n8n's cloud (which is fine for most teams, a problem for some), and at high execution volumes the per-execution pricing eventually crosses the cost of self-hosting.

**When to graduate off Cloud**: when you've shipped enough workflows that the monthly bill hurts, when you need a community node that isn't available in Cloud, or when a compliance officer asks where your customer data lives and the answer "n8n's German servers" isn't acceptable. Most teams can live on Cloud for a year or more before any of those triggers fires.

## Option 2: Render (managed Docker)

[Render](https://render.com) is a cloud platform that runs Docker containers and managed databases for you. n8n publishes an official guide at [render.com/docs/deploy-n8n](https://render.com/docs/deploy-n8n), and it's the cleanest middle-ground option: you get the cost predictability and the control of self-hosting, without owning a server.

The recommended setup pairs a **Render web service** (running n8n's Docker image) with a **Render Postgres database** (storing workflow data), deployed together via Render's Blueprint infrastructure-as-code mechanism. The free tier covers both — useful for evaluation — though free Render Postgres databases expire after 30 days and free web services spin down after 15 minutes of inactivity. For anything you want to keep running, upgrade to the **Standard** web service (~$25/mo at writing) and the **basic-256mb** Postgres ($7/mo). Real, predictable numbers.

**The install in five steps:**

1. Sign up at [dashboard.render.com/register](https://dashboard.render.com/register).
2. Open the official template repo at [github.com/render-examples/n8n](https://github.com/render-examples/n8n) and click **Use this template → Create a new repository**.
3. In Render's Dashboard, click **New → Blueprint**, connect the repo you just created, and click **Deploy Blueprint**. Render reads the `render.yaml` file from your repo and provisions both the web service and the Postgres database.
4. Wait for both resources to go green (usually 3–5 minutes), then click your web service's `onrender.com` URL to open n8n.
5. Add a `WEBHOOK_URL` environment variable on the web service, pointing at your `onrender.com` URL (e.g. `https://n8n-service-q975.onrender.com/`). This is required for webhook-based workflows; without it, webhook nodes will display the wrong URL in the editor.

**Pinning your n8n version.** Render's default Blueprint uses the `latest` Docker tag, which updates over time and can introduce breaking changes. For production, edit your `render.yaml` to pin a specific version:

```yaml
services:
  - type: web
    image:
      url: docker.io/n8nio/n8n:1.83.2  # replace with current stable
```

Push the change to your repo; Render redeploys automatically.

**What Render is good at**: predictable pricing, zero server admin, automatic SSL on the `onrender.com` domain, free PR previews, easy custom-domain setup, painless rollback to a previous deploy. You get most of the *control* of self-hosting without any of the server-admin burden.

**What Render is not for**: extreme cost-sensitivity at very small scale (Hostinger's RM 26/mo beats Render's $25/mo on bare cost), and ultra-strict data-residency cases where Render's available regions don't match your jurisdiction.

## Option 3: Hostinger VPS template

[Hostinger's n8n VPS template](https://www.hostinger.com/my/self-hosted-n8n) is the right path for Malaysian SMEs and any small business that wants real self-hosting without becoming a Docker admin. The template is a pre-configured VPS image: select it during VPS setup, click through a few screens, and n8n is running on a server you control, in a region you choose (Singapore, Mumbai, US, EU). At writing, VPS plans with the n8n template start around **RM 26–30/month (~USD 6)** — competitive with the cheapest cloud-host options and meaningfully cheaper than n8n Cloud at most scales.

**The install via the template:**

1. Sign up at [hostinger.com](https://www.hostinger.com/my/self-hosted-n8n) and purchase a VPS plan that meets the minimum requirements — **2 GB RAM, 2 CPU cores** is the recommended starting point. Bare minimum is 1 GB / 1 CPU, but you'll regret it as your workflows grow.
2. In hPanel, navigate to **VPS** → select your server → **Manage**.
3. Open **OS & Panel** → **Operating System** in the VPS dashboard. Search for **n8n** in the template list.
4. Click **Change OS**, acknowledge that the VPS will be wiped (so do this on a fresh VPS, not one running other workloads), enter a root password, and confirm.
5. Wait ~5 minutes for the template to provision. When done, navigate to **VPS Overview** and click **Manage App** to open n8n in your browser.
6. Set up your domain. The template ships ready for a custom domain; point an A record at your VPS's IP, then run Hostinger's SSL setup (Let's Encrypt + Nginx, which the template scaffolds) to get HTTPS.

The full step-by-step is at [Hostinger's self-host n8n tutorial](https://www.hostinger.com/my/tutorials/how-to-self-host-n8n), which is kept current.

**What the Hostinger template is good at**: real self-hosting at SME prices, your data in your jurisdiction (Singapore region is the closest for Malaysian PDPA scenarios), no command-line setup required to get running, automatic weekly VPS backups, and Hostinger's support to lean on when something breaks. The template uses Docker under the hood, so when you do want to dig in, you have the standard Docker tooling available.

**What it's not for**: serious horizontal scaling (single VPS, single n8n instance), zero-maintenance setups (you own server updates, even if the template installs n8n itself), and teams whose preferred regions Hostinger doesn't operate in.

## Option 4: Pure Docker self-host

This is the engineering-led path. You provision a VPS yourself (Hetzner, DigitalOcean, Linode, or your existing cloud), install Docker, and run n8n as a container. Full control, lowest cost at scale, the most work to maintain. n8n's official Docker docs live at [docs.n8n.io/hosting/installation/docker](https://docs.n8n.io/hosting/installation/docker/) and at [hub.docker.com/r/n8nio/n8n](https://hub.docker.com/r/n8nio/n8n).

**The minimum viable install** (assuming Docker is already installed on your server):

```bash
docker volume create n8n_data
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

That's it. n8n is running on port 5678, persisting data to a Docker volume named `n8n_data`. Open `http://your-server-ip:5678` in a browser to access it. Note the registry: `docker.n8n.io/n8nio/n8n` is n8n's own registry (preferred for reliability); the older `n8nio/n8n` on Docker Hub still works but isn't the recommended source anymore.

**The production-ready install** uses Docker Compose with a separate Postgres database, persistent volumes, an Nginx reverse proxy for SSL termination, and Let's Encrypt for the certificate. The shape of `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: n8n
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD: <your-secure-password>
    volumes:
      - postgres_data:/var/lib/postgresql/data

  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=<your-secure-password>
      - N8N_HOST=your-domain.com
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://your-domain.com/
      - GENERIC_TIMEZONE=Asia/Kuala_Lumpur
      - N8N_RUNNERS_ENABLED=true
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres

volumes:
  postgres_data:
  n8n_data:
```

Replace `<your-secure-password>` (twice) and `your-domain.com`. Save as `docker-compose.yml`. Bring it up with `docker compose up -d`.

A few things worth understanding before you ship this:

- **Postgres beats SQLite** in production. n8n's default SQLite is fine for evaluation but doesn't handle concurrent writes well and doesn't support [queue mode](https://docs.n8n.io/hosting/scaling/queue-mode/) (Ch. 28). Use Postgres from day one if you expect any real load.
- **`N8N_RUNNERS_ENABLED=true`** is the new default for n8n's task runner architecture and should be set on every fresh install.
- **The `WEBHOOK_URL` environment variable matters.** Without it, webhook nodes in the editor display the wrong URL and external services calling your webhooks fail.
- **The `N8N_BASIC_AUTH_*` environment variables you'll see in older tutorials are deprecated.** Modern n8n uses an in-app user management system — the first time you open the editor, you create the owner account. Don't use basic auth env vars on new installs.
- **SSL is mandatory in production.** n8n requires HTTPS by default; without it, secure cookies fail. The standard pattern is Nginx as a reverse proxy on the host, with Let's Encrypt via Certbot. Hostinger's tutorial walks through this end-to-end; the [n8n hosting docs](https://docs.n8n.io/hosting/) cover it in the *Server Setups* section.

**Updating** is two commands when you used Compose:

```bash
docker compose pull
docker compose down
docker compose up -d
```

Your workflows are safe — they're in the Postgres database and the `n8n_data` volume, not the container.

**What pure Docker self-host is good at**: full control, lowest cost at scale, ability to install community nodes, full feature access (queue mode, external secrets, custom worker setups), data in any jurisdiction you choose.

**What it costs**: your time. Server patching, n8n version bumps, SSL renewal monitoring, backup verification, database tuning, scaling decisions — all yours. Treat it like the engineering project it is. If your team doesn't have someone who already runs Docker workloads in production, **start on Cloud or Render and migrate later** — it's a much cheaper learning curve.

## What about n8n Enterprise?

n8n offers an Enterprise tier with SSO, audit logs, external secrets management (Vault, AWS Secrets Manager), advanced RBAC, and dedicated support. It runs on the same self-hosted Docker image with an Enterprise license key activating the additional features. If you're at a scale where SSO and audit logs are compliance requirements — most teams aren't — talk to n8n directly.

The free Community Edition (the Docker image above) covers everything in this book including AI nodes, sub-workflows, queue mode, and all major integrations. You can self-host Community indefinitely without ever touching Enterprise.

## The takeaway

- **n8n Cloud** is the right default for most readers. Stay on it until something forces you off.
- **Render** is the cleanest managed middle ground — predictable pricing, no server admin, Blueprint-based deploys.
- **Hostinger's n8n VPS template** is the right path for Malaysian SMEs and anyone wanting affordable self-host without command-line work — at writing, RM 26+/mo gets you a real, controlled n8n install.
- **Pure Docker self-host** is the engineering-led path: full control, lowest cost at scale, most work to maintain. Production-ready means Postgres + reverse-proxy + Let's Encrypt, not just `docker run`.
- Install commands age fast. **Use the linked vendor docs as the authoritative source**, not this chapter, when something doesn't match.

## Try it yourself

You only need to pick *one*. If you're already on Cloud and happy, skip this — you're done.

Otherwise, pick the install path that matches your situation from the decision matrix at the start of the chapter, and follow that section's steps end-to-end. Set a 60-minute timer; if you blow through it, that's a signal to either swap to an easier path (Cloud, then come back later) or post the specific error you hit to the [n8n community forum](https://community.n8n.io) before going deeper.

**You'll know it worked when** you can open n8n in a browser, log in, create a Schedule trigger, and run a test execution — same workflow shape as Ch. 4's Personal Morning Brief, just on the install path you picked. Bonus: if you self-hosted, confirm the data persists by stopping and restarting the container — your workflow should still be there.

## What's next

You have n8n running where you want it. The next question is the one most install guides skip entirely: **how much should you let a workflow do on its own?** Ch. 7 is the trust posture — how to think about reversibility, where human-in-the-loop approval gates earn their cost, and why "test endlessly before activating" is bad advice for most workflows.
