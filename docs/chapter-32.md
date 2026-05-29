---
title: 32. What we got wrong, and what's next | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: The closing chapter. Six anti-patterns the book is still seeing in working n8n estates, the things this book got wrong and will increasingly get wrong, three directions n8n is moving that this edition treats lightly (native evaluations, MCP integration, agentic workflows), and what to do after closing the book.
meta-twitter:title: Learn Automation Working
---

# 32. What we got wrong, and what's next

The book opened by saying you'd ship one workflow in ten minutes and that the rest would scale up from there. Three hundred-odd pages later, you have. Or you've decided not to. Either is a legitimate endpoint for the journey the book asked you to start.

This chapter is for both readers. The first reader has a working n8n estate now and wants to know what comes after the book closes. The second reader has decided automation isn't the leverage they thought it was, or that this isn't the right season, and needs the closing chapter to land without making them feel they should have built something they didn't. Both are correct outcomes.

What follows is three things: the anti-patterns the book keeps seeing in working n8n estates (even ones built by readers of material like this), the parts of this book that will date — some of which already have — and the directions n8n is moving that this edition treats lightly. The chapter closes with a takeaway and a try-it-yourself pitched at *posture*, not technique. The technical instruction is done.

## Six anti-patterns we still see, after all this

These are the patterns the rest of the book taught you to avoid. They keep appearing anyway. Naming them once more in one place, with the framing *this is what we keep finding in working estates, even ones built by careful people.*

**The 200-node monolith.** [Chapter 27](./chapter-27.md)'s sub-workflow guidance, never applied. One canvas, five conceptual jobs, three rotating owners, debugging impossible. The honest fix is hours of refactor, so it never happens, so the monolith grows. The discipline is to split *before* it hurts, not after — and almost nobody manages this without a calendar reminder.

**The workflow nobody owns.** [Chapter 9](./chapter-09.md)'s two-owners-minimum rule, broken quietly. The person who built it left; nobody fully understands it; everyone is afraid to touch it. It runs. It even mostly works. Nobody can fix it when it breaks, so when it breaks, the team builds a workaround beside it instead. Within a year there are three workarounds and the original workflow is a monument.

**The AI node that costs RM 900/month before anyone notices.** [Chapter 23](./chapter-23.md)'s cost-control patterns ignored. A loop calling a frontier model with no iteration cap, no fallback to a cheaper model, no monitoring on token usage. The invoice arrives. It's the cost of a junior employee. The post-mortem reveals the workflow has been firing 14× the intended frequency for two months and nobody set up an alert.

**Polling that should have been a webhook.** [Chapter 30](./chapter-30.md)'s named anti-pattern. Schedule Trigger every minute checking for new HubSpot leads, burning 43,200 executions a month — when the HubSpot Trigger fires once per actual new lead, perhaps fifty times a month. The polling version *works*. The webhook version is the same business outcome at 0.1% of the cost. Most teams ship the polling version and never revisit.

**The single super-user credential.** [Chapter 29](./chapter-29.md)'s safety pattern ignored. One Postgres credential with full read-write grants, used by every workflow — including the read-only analytics ones, including the dashboard, including the workflow built by the intern. A runaway query is one bad expression away from corrupting production. The credential exists because setting up two was *slightly more work* in the first hour, and nobody went back.

**The workflow you stopped reading.** [Chapter 26](./chapter-26.md)'s discipline. The daily briefing bot, the personal automation, the morning digest — still running, still firing, you stopped opening it three months ago. It's burning compute, contributing nothing, and quietly adding to the cognitive cost of "things I have that need maintaining." Delete it. The version that runs but doesn't get consumed is worse than no workflow.

The thread running through all six: each is a *governance* failure, not a *technical* one. The technical knobs to avoid them are all in this book. The discipline to actually turn them is mostly about caring whether things keep working — not about being clever, not about knowing the right pattern, just about doing the unglamorous work of reviewing, deleting, splitting, and rotating credentials when nothing is currently on fire.

That discipline doesn't come from reading. It comes from setting recurring time on a calendar — quarterly workflow reviews, monthly cost-check-ins, weekly look-at-the-error-log habits. The book can name the discipline. It can't install it.

## What this book got wrong (and will increasingly get wrong)

Honest accounting. Some of what's in this book is already mildly out of date by the time you're reading it. More will be by the time you finish. The categories that decay fastest:

**Cloud pricing tables.** [Chapter 30](./chapter-30.md)'s pricing was current in May 2026. It will move. Check `n8n.io/pricing` before making upgrade decisions. The *shape* of the pricing model — execution-based with concurrency tiers — is more durable than the specific numbers.

**CVE references.** [Chapter 28](./chapter-28.md) and [Chapter 31](./chapter-31.md) named specific 2026 CVEs because they were the freshest examples of "self-hosting means you patch." New CVEs will land. Older ones will be ancient context. The lesson — subscribe to security advisories, have an upgrade process you can run in a day, not a week — is what stays.

**Version-specific behaviours.** v2.0's task-runner architecture, the Wait-in-sub-workflow fix from Chapter 27, the v2.0 default-on pruning from Chapter 30 — all current as of mid-2026. v3.0 will change some of them. The migration tool is your friend on each version bump; the architecture diagrams in this book may need redrawing.

**The PDPA framing.** [Chapter 28](./chapter-28.md) corrected the older "PDPA requires Malaysian data localisation" framing using the April 2025 Cross-Border Transfer Guidelines. Malaysian data protection law continues to evolve; the correct framing in eighteen months may be different again. The honest position remains: *talk to a Malaysian-qualified data-protection lawyer for anything that depends on the specifics*, and treat the framing in this book as the starting context, not the legal answer.

**The AI cost-control patterns.** [Chapter 16](./chapter-16.md)'s cost-control stack — model tiering, the cheap-model-for-cheap-tasks rule, capped iterations — rests on today's model line-up and prices, which will look different inside eighteen months. The *shape* of cost-aware AI architecture stays; the specific models and dollar amounts don't.

**Specific tool integrations.** HubSpot's API will change. Slack's auth flow will change. The Gmail Trigger will gain new options. The chapters that named specific app behaviours (Chapters 24, 25, 26 in particular) will need touch-ups annually. Cross-reference the canonical docs at point of use; don't trust this book's claims about a third-party API more than you trust the API's own docs.

The honest line: this book is a snapshot of mid-2026 n8n. The patterns that endure are *shapes* — event-driven beats polling, read-only credentials beat super-users, two owners beats one, sub-workflows for reuse, layered AI cost control. The specifics decay faster. When something in the book disagrees with the current n8n docs, the docs are right.

## Three directions n8n is moving that this book treats lightly

The book mostly stays in 2026's current capabilities. Three directions are real, shipping, and likely to define the next edition of this material.

**Native AI evaluation.** n8n shipped an Evaluations feature in late 2025 — Data Tables holding test cases, runs of those cases through a workflow, offline and online eval patterns, LLM-as-judge support. The [n8n Evaluations docs](https://docs.n8n.io/advanced-ai/evaluations/) cover the mechanics; the [n8n blog post on evaluating AI agents](https://blog.n8n.io/how-to-evaluate-the-performance-of-ai-agents/) covers the discipline.

The book treats evaluation as undercurrent in [Chapters 19-21](./chapter-19.md) but doesn't centre it. As AI agents become more central to working automation, *eval-as-discipline* is the part that separates "shipped once" from "shipped reliably." A workflow with no eval set is a workflow you can't safely refactor — every change is a coin flip. The teams investing in eval are the ones who can keep shipping AI features past the demo phase. Worth its own chapter in the next edition of this book.

**MCP (Model Context Protocol) integration.** n8n added first-class MCP support in late 2025 — the [MCP Server Trigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.mcptrigger/) lets n8n workflows be invoked as tools by external AI assistants (Claude, ChatGPT's agent mode, anything else speaking MCP); the [MCP Client Tool](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp/) lets n8n AI Agents call external MCP-exposed tools.

This unifies two themes the book covered separately. "n8n is the orchestration layer over real systems" (Chapter 29) and "AI agents need tool access" ([Chapter 21](./chapter-21.md)) become the same thing when MCP is the protocol underneath. The book mentions MCP only in passing; the operational layer is genuinely real now, and the teams running both n8n and MCP servers are reusing tool definitions across multiple AI clients rather than wiring each one independently.

**Agentic workflows with eval-driven iteration.** The combination of AI Agent + Evaluations + MCP is where n8n's roadmap pointer is heading. The shape: build an agent, run it through a test set, measure outcomes, refine the prompt or tool list, re-test. This is closer to ML engineering discipline than to traditional automation engineering, and the people doing both — building automation *and* evaluating their AI components like an engineer rather than a tinkerer — will increasingly own the most leveraged workflows.

What's *not* on this list: pure vibe coding, no-code-only automation, "let the AI build the whole thing." The directions that actually move are the ones combining human judgement with AI execution — where the workflow's structure encodes the judgement and the AI fills the dynamic gaps. The book has bet on this framing throughout; the next edition will bet on it harder.

## The takeaway

- **The biggest failures aren't technical, they're governance.** The 200-node monolith, the unowned workflow, the runaway AI cost — none of these are about not knowing the right pattern. They're about not setting recurring time to apply patterns when nothing is currently on fire. Calendars beat cleverness.
- **The shapes endure; the specifics decay.** Event-driven beats polling. Read-only credentials beat super-users. Two owners beat one. Sub-workflows for reuse. Layered AI cost control. The specific Cloud prices, CVE numbers, app integrations, and model costs in this book will be wrong inside two years; the shapes will still be right.
- **The future is more eval, more MCP, more agent.** Native evaluations, MCP integration, and eval-driven agentic workflows are where n8n is moving. The next edition of this book will treat them as load-bearing chapters rather than undercurrents.
- **The three things that don't change: ship small · review quarterly · delete ruthlessly.** Carry those out the door.

## Try it yourself

**One. Open your n8n instance right now.** Look at your active workflows. Find one that fits one of the six anti-patterns from earlier in this chapter — a monolith, an unowned workflow, an unmonitored AI loop, a poller that should be a webhook, a super-user credential, a workflow you've stopped reading. Pick the one that's most clearly wrong.

You don't have to fix it now. Schedule fifteen minutes this week to address it. Put the calendar invite in before you close this book; the discipline that doesn't get scheduled doesn't happen.

You'll know it worked when fifteen minutes from now your workflow estate has one less anti-pattern in it than it did when you opened this chapter.

If nothing comes to mind, common ones other readers catch themselves on: *the daily briefing bot you stopped reading three months ago* (delete it); *the Postgres credential that has DELETE rights on tables it never deletes from* (rotate to read-only); *the workflow built by the colleague who left and that nobody's touched since* (open it, document it, add a second owner — or deprecate it).

**Two. Find one workflow you built early in the book that no longer fits how it's used.** Workflows evolve in deployment in ways the original build couldn't anticipate. The receipt-capture workflow turned out to need foreign currency handling. The BD lead-routing turned out to need a different scoring weight. The morning brief turned out to be the wrong delivery channel.

Refactor it. Not rewrite — refactor. Keep the parts that work, change the parts that don't, document what you learned. The workflows in your estate that have been refactored at least once are the workflows that are still useful; the ones built once and never revisited are usually the ones quietly drifting toward being deleted.

You'll know it worked when the workflow's output is something you'd build today, and you have a one-line note in your team's runbook about why it's shaped the way it is now.

If you can't think of one, the canonical candidates: the daily briefing bot from Ch. 26 (cadence and source-list invariably need tuning after the first month); any Schedule-Trigger polling workflow (Ch. 30's anti-pattern); any AI workflow built before you'd read Ch. 23 (cost-control likely missing).

**Three. Close the book. Pick one workflow you haven't built yet, on something you've been quietly putting off because the SaaS UI is bad, the form is long, the report is tedious, or the data lives in three places at once.**

Build it this week. Not perfectly — just shipped. The Ch. 4 ten-minute first-win discipline, applied once more, after everything else this book taught you.

You'll know it worked when there's one more workflow in your estate by Friday than there was when you finished this chapter, and you have a clearer sense of what to build next than you did before you built this one.

If nothing comes to mind, the canonical candidates: (a) the weekly status update you've been writing by hand; (b) the monthly cost-tracking sheet you reconcile manually; (c) the customer follow-up you've been meaning to systematise. Pick one.

---

Automation is a craft, not a product. The tools change; the patterns endure; the discipline to apply them is mostly about caring whether things keep working — not about being clever, not about being early, not about being comprehensive. Build patiently. Delete ruthlessly. Write down what you learn so the person after you doesn't have to learn it the same way.

If this book gave you the vocabulary to think about your own automations as workflows, owners, triggers, and patterns rather than as a heap of scripts and SaaS subscriptions, it did its job. The rest is yours.

Thank you for reading.
