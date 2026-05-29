---
title: 30. Scheduling, queueing, and running at scale | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: How n8n's execution model scales — concurrency limits per Cloud plan, when self-hosting pays off, the cost difference between polling and event-driven triggers, and the execution-data tax that eats your disk if you let it.
meta-twitter:title: Learn Automation Working
---

# 30. Scheduling, queueing, and running at scale

It's the third week of the month and you just got a Cloud overage notification. The workflow you built to poll a Stripe webhook every five minutes has fired 8,640 times this month — alone, that's already three times your Starter plan's monthly execution quota, and you have nine other active workflows. You're staring at the bill considering whether to upgrade tiers, redesign the workflow, or finally self-host.

Scale is rarely about *is the workflow fast enough?* — it's about whether the shape you've given a workflow makes economic sense at the volume you're running it at. A polling workflow firing every five minutes is a perfectly reasonable thing to build until you realise it's burning your execution budget on 99% of fires that found nothing to do.

This chapter is about the three knobs you have when scale becomes a real concern: *what triggers your workflows*, *where they run*, and *what data they leave behind*. None of the knobs is hard to turn. The trick is knowing which one to reach for.

## How n8n's execution model actually scales

Three things determine whether you'll outrun your plan.

**An execution is one full run of a workflow.** Regardless of how many nodes it has, how much data it processes, how many sub-workflows it calls, or how long it takes — one run = one execution. This is the unit n8n bills on (Cloud) and the unit your performance budget needs to count in. A 50-node workflow that runs once a day is 30 executions/month. A 3-node workflow that polls every five minutes is 8,640.

**Concurrent executions are how many can run at the same time.** Cloud caps this per plan. Self-hosted single-mode has no default cap — you can be running 200 workflows in parallel until your container runs out of memory, which is rarely what you want. The [self-hosted concurrency control docs](https://docs.n8n.io/hosting/scaling/concurrency-control/) cover the `N8N_CONCURRENCY_PRODUCTION_LIMIT` setting that adds a cap; rule of thumb is 1-2 per CPU core for CPU-bound work, 5-10 per core for I/O-bound work (HTTP / AI API calls that mostly wait).

**Production execution vs everything else.** Concurrency limits — and most billing logic — apply to *production executions*: those started by a webhook, Schedule Trigger, or app-event trigger. Manual executions you run from the editor, sub-workflow executions (from [Chapter 27](./chapter-27.md)), and Error Trigger executions don't count toward the limit or against your Cloud quota. This matters when you're debugging at scale — running a workflow manually 100 times to figure out what's going wrong doesn't burn 100 production executions.

## Cloud pricing, mapped to actual workloads

> *Pricing below is at time of writing (May 2026), drawn from [n8n.io/pricing](https://n8n.io/pricing/). Cloud pricing changes regularly — confirm current rates at that page before making decisions. MYR figures use an approximate rate of 1 EUR ≈ 4.6 MYR, which itself drifts; treat them as ballparks for comparison, not invoiced amounts.*

| Plan | Monthly executions | Concurrent | Max execution time | Approx /mo (EUR) | Approx /mo (MYR) |
|---|---|---|---|---|---|
| Starter | 2,500 | 5 | 5 min | €24 | RM 110 |
| Pro | 10,000 | 20 | 40 min | €60 | RM 275 |
| Business | 40,000 | 200+ | unlimited | €800 | RM 3,680 |
| Enterprise | custom | unlimited (queue mode) | unlimited | custom | custom |

Worked through against actual workloads:

- **2,500/month (Starter) = ~83 executions/day.** That's *one* workflow firing every 17 minutes around the clock, or a handful of workflows each firing a few times an hour. Fine for event-driven workflows where things happen when they happen. Not fine for polling.
- **10,000/month (Pro) = ~333/day.** One workflow firing every 4 minutes around the clock, or a handful of moderate-volume event-driven workflows. The Pro tier is where most working SMEs land before they decide between Business and self-hosting.
- **The polling-every-5-minutes workflow burns 8,640/month** on its own — already past Starter, three-quarters of Pro, and that's just one workflow.

The Cloud-vs-self-host crossover math: at Pro (€60 ≈ RM 275/month) you get 10,000 executions for roughly the cost of an hour or two of senior engineering time. At self-host, you avoid that subscription but spend the ops time covered honestly in [Chapter 28](./chapter-28.md) — patching, backups, monitoring, the two-engineer rule. The crossover usually sits around the Business plan threshold for SMEs: at €800 (≈ RM 3,680) /month you could rent two solid VPSes, hire some operating capacity, and have headroom. Below that, Cloud is almost always the cheaper answer when you count time honestly.

The execution-time caps in the table are a separate trap. A 5-minute ceiling on Starter means AI-heavy workflows that call long-running models, RAG workflows that embed large documents, or anything with a human-in-the-loop Wait node will fail. If you're building AI workflows, Pro's 40-minute ceiling is the minimum realistic plan.

## Schedule Trigger at scale: not every problem is a cron

The Schedule Trigger from [Chapter 10](./chapter-10.md) is the first trigger most readers reach for, and the most overused trigger in working n8n estates. The pattern: *"I want to know when there's a new lead in HubSpot, so I'll poll HubSpot every 5 minutes and check."* That works. It also burns 8,640 executions/month per workflow whether or not anything actually happened.

The honest rule: **if your Schedule Trigger fires more often than your data changes, you're wasting executions.**

Event-driven triggers — Webhook, HubSpot Trigger, Gmail Trigger, Stripe Trigger, the dozen or so app-specific triggers from [Chapter 10](./chapter-10.md) — cost an execution *per actual event*, not per poll. A HubSpot Trigger watching for new contacts costs one execution per new contact: maybe 5/day for a quiet pipeline, maybe 50/day for an active one. The Schedule Trigger polling for the same thing costs 288/day (every 5 minutes) regardless of pipeline activity. At Pro plan execution rates, that's the difference between blowing through the quota by mid-month and finishing the month with capacity to spare.

When Schedule *is* the right choice: genuinely periodic work. The daily report at 9 AM. The hourly health check. The Monday-morning content-calendar assembly from [Chapter 25](./chapter-25.md). Workflows where the *period* matters as much as the *event*, or where there's no event to listen for in the first place. Don't apologise for using Schedule Trigger when it fits — apologise for using it as a stand-in for an event trigger you didn't look for.

A few practical notes on configuration:

- **Set the per-workflow timezone explicitly.** Workflow Settings → Timezone, IANA format (`Asia/Kuala_Lumpur`, `Europe/Amsterdam`). This overrides the instance-level `GENERIC_TIMEZONE` from [Chapter 28](./chapter-28.md) and prevents the most common scheduling mistake: a workflow that fires at the right wall-clock time in the wrong zone.
- **Cron expressions** in the Schedule Trigger node support both 5-field standard cron (`0 9 * * 1` for "Monday at 9 AM") and an optional 6th field for seconds. Validate the expression at [crontab.guru](https://crontab.guru) before saving — syntax errors silently skip executions, which you'll discover the day the report doesn't arrive.
- **No catch-up.** If n8n is down at the scheduled time, the run is missed — n8n doesn't backfill. Schedule-critical workflows need the uptime monitoring from [Chapter 28](./chapter-28.md), or a fallback pattern where each run also checks "did the previous expected run actually fire?" and self-heals if not.

## Self-hosted: when queue mode pays off

The architectural details of queue mode live in [Chapter 28](./chapter-28.md); this section is about *when* to reach for it. Three signals:

**The editor lags when something heavy is running.** Single-mode self-host runs the UI, webhook reception, scheduling, *and* the workflow itself on the same process. A 30-second heavy execution makes the editor unresponsive for 30 seconds for everyone else. Past the point this happens noticeably, you've outgrown single mode.

**Executions visibly queue up.** Watch the Executions tab during a peak hour. If you see executions sitting in *waiting* state for seconds at a time before starting, single mode is the bottleneck. Queue mode lets workers run in parallel and the queue depth becomes a tuning lever rather than a wall.

**You need more than ~50 concurrent executions.** Below that, single mode with a sane `N8N_CONCURRENCY_PRODUCTION_LIMIT` (say, 10-30 depending on hardware) handles things fine. Above that, queue mode with multiple workers is the architectural shape you want — each worker has its own `--concurrency` flag, so total concurrency is workers × per-worker.

The honest comparison to Cloud Enterprise: n8n Cloud Enterprise also offers queue mode under the hood, but it's contact-sales pricing — typically meaningfully higher than running queue mode yourself on managed infrastructure. Self-hosters with queue mode are paying VPS/managed-service costs roughly 10-20% of Cloud Enterprise quotes — at the cost of the ops time covered in Chapter 28. The decision is the same as Chapter 28's: it's an ops-time-vs-subscription trade, and most SMEs find Cloud cheaper until they're at genuine enterprise scale.

## The execution-data tax

Every execution writes a record to n8n's database — input/output payloads for every node, timing information, error details. At 10,000 executions/month with non-trivial workflows, that's gigabytes of execution history piling up. Left untuned, this is the most common reason a self-hosted instance gradually slows down: the SQLite or Postgres database grows, query performance degrades, the editor lags.

The good news: **pruning is enabled by default in modern n8n.** The defaults are 14 days of execution history *or* the most recent 10,000 executions, whichever limit hits first. Older records get deleted; annotated executions (the ones you've tagged or rated) are never pruned, so the executions you've explicitly marked as important stay. The full [execution-data docs](https://docs.n8n.io/hosting/scaling/execution-data/) cover the mechanics.

For high-volume workflows, four environment variables tune the behaviour:

- **`EXECUTIONS_DATA_MAX_AGE=168`** — keep 7 days instead of 14 (in hours). Halves the typical disk footprint.
- **`EXECUTIONS_DATA_PRUNE_MAX_COUNT=5000`** — cap at 5,000 executions instead of 10,000.
- **`EXECUTIONS_DATA_SAVE_ON_SUCCESS=none`** — for workflows that fire thousands of times and you only care about failures: don't save the success payloads at all. Errors are still saved. This is the single biggest disk-saver for high-volume event-driven workflows.
- **`EXECUTIONS_DATA_SAVE_ON_ERROR=all`** — the default is already *all*, but if you've experimented with it, make sure error payloads are still being saved.

The SQLite gotcha (cross-ref [Chapter 28](./chapter-28.md)): pruning marks rows as deletable, but doesn't free disk space until you VACUUM. `DB_SQLITE_VACUUM_ON_STARTUP=true` runs VACUUM each restart; otherwise the database file grows monotonically even as pruning removes rows. Postgres handles this more gracefully, but heavy-volume Postgres instances still benefit from periodic `VACUUM ANALYZE` during off-peak hours.

n8n Cloud handles all of this for you — pruning runs automatically, disk capacity is monitored, and Cloud alerts you at 85% capacity before anything breaks. You don't tune this on Cloud; you stay within the plan's execution quota and the storage takes care of itself.

## Try it yourself: convert a polling workflow to event-driven

The fastest way to feel the difference is to build both shapes against the same data source and watch the execution counts diverge.

You'll need a Gmail account with a few labelled emails arriving regularly (most inboxes work for this).

1. **The polling version.** Schedule Trigger fires every 15 minutes (Workflow Settings → Timezone set to yours). Gmail node in Get Many mode, filtering for label `inbox`, returning the last 5 messages. Set node to extract subject and from. No further action — just record that an execution happened.
2. **The event-driven version.** Gmail Trigger (which polls Gmail's API every minute behind the scenes but only fires when there's actually a new message). Same downstream — extract subject and from, record the execution.
3. **Activate both.** Let them run for 24 hours.
4. **Compare.** Open each workflow's Executions log.

**You'll know it worked when** the Schedule Trigger version has fired 96 times in 24 hours (every 15 minutes, regardless of inbox activity), and the Gmail Trigger version has fired roughly once per email that actually arrived — typically 5-20 in a day for a real inbox. Same business outcome (you have a record of every email), one-fifth to one-twentieth of the execution count.

For workflows with no event trigger available, the polling pattern is still the right answer — just dial the frequency down to the minimum the business genuinely needs. Polling every 15 minutes burns 2,880 executions/month; polling every hour burns 720. If the data only changes a few times a day, "every hour" is plenty.

## The takeaway

- **An execution is one full run of a workflow**, regardless of node count or complexity. This is the unit Cloud bills on and the unit your performance budget thinks in.
- **Cloud concurrency caps are real, per-plan, and apply to production executions only.** Starter caps at 5 concurrent; Pro at 20; Business at 200+. Manual, sub-workflow, and error executions don't count toward the limit.
- **Self-hosted single mode has no default concurrency cap.** Set `N8N_CONCURRENCY_PRODUCTION_LIMIT` (1-2 per core for CPU-bound, 5-10 for I/O-bound) to prevent runaway parallel executions.
- **If your Schedule Trigger fires more often than your data changes, you're wasting executions.** Reach for an event-driven trigger first; reserve Schedule for genuinely periodic work.
- **Set the per-workflow timezone explicitly**, validate cron expressions at [crontab.guru](https://crontab.guru), and remember n8n doesn't catch up on missed runs.
- **Queue mode pays off when the editor lags during heavy executions, when executions visibly queue, or when you need 50+ concurrent workflows.** Below that, single mode with a sane concurrency cap handles it.
- **Pruning is on by default** (14 days / 10,000 executions). For high-volume workflows, tune `EXECUTIONS_DATA_MAX_AGE`, `EXECUTIONS_DATA_PRUNE_MAX_COUNT`, and `EXECUTIONS_DATA_SAVE_ON_SUCCESS=none`.
- **Cloud's pricing is in EUR and changes regularly.** Confirm current rates at [n8n.io/pricing](https://n8n.io/pricing/) before making upgrade or self-host decisions.

## What's next

Chapter 31 is the follow-on to [Chapter 17](./chapter-17.md)'s introduction to the Code node. The patterns you reach for when the Set node and expressions stop being enough — streaming responses, structured retry logic, custom error objects, the AI Transform node's "describe what you want, get JavaScript" approach. When to refactor a Code-node monster into a sub-workflow (Chapter 27), when to keep it inline, and the small library of copy-pasteable patterns most production estates end up needing.
