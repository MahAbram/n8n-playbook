---
title: 3. What's the automation landscape right now? | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: The four tools that matter — n8n, Zapier, Make, Power Automate — what each is best at, and how to defend the choice.
meta-twitter:title: Learn Automation Working
---

# 3. What's the automation landscape right now?

You're sold on the idea. You can picture the architecture diagram. You open a browser tab to figure out which tool to actually install, and within ninety seconds you have fourteen tabs open — n8n, Zapier, Make, Power Automate, Workato, Pipedream, Tray, IFTTT, Activepieces, Pabbly — and a faint feeling that maybe you should just go to bed.

This chapter is the map. By the end of it you'll know which kind of tool you actually want, why there are so many of them, and roughly where each one shines. We aren't going to rank them. The field moves too fast — by the time you read this, at least one tool listed here will have a new headline feature, and at least one will have been quietly surpassed. The *categories*, though, will be stable.

## Four tools that matter

You can divide the automation tooling market into a much longer list — but for actually getting work done at an SME or in a mid-sized team, four tools cover 95% of the territory. Each one is genuinely good. Each one is best for something different. The trick is knowing which.

A useful mental model: think of them as cars, not features. Each has a personality, an audience, a price point, and a job it's the best in the world at.

- **Zapier — the Toyota Corolla.** The easiest on-ramp. The largest app catalog (8,000+ integrations as of writing). The most expensive at scale. The least flexible when your workflow needs anything more than a straight line.
- **Make — the Subaru.** Visual canvas closer to n8n. Cheaper than Zapier. Deeper on routers, iterators, and data manipulation than Zapier. Weaker on AI-native nodes. No serious self-hosting story.
- **n8n — the Land Cruiser.** The most flexible. The only one with serious self-hosting *and* AI-native cluster nodes baked in. Slightly steeper learning curve. Free if you self-host. The deepest tool of the four, and the running example throughout this book.
- **Power Automate — the company car.** The right pick if your team already lives inside Microsoft 365 and your ROI is gated on deep Microsoft connector access. Mention but don't dwell — most teams reading this book aren't in that situation.

Most teams end up using one of these as their primary, then occasionally reach for another for a specific job. You don't have to pick one forever. But you should *start* with one, learn the muscle, and add the others only when a real task pulls you to.

## Zapier — the easiest on-ramp

Zapier is the tool most people have heard of, and there's a reason. The setup is the smoothest in the market. Their app catalog is wider than anyone else's — if a SaaS exists, Zapier probably has a connector for it. The interface is so simple that a non-technical user can build a working *"new lead → Slack ping"* workflow in five minutes, on their first day, without watching a tutorial.

That simplicity is also Zapier's ceiling. A Zap is a linear sequence: trigger → action → action → action. Branching is possible but limited — Paths add IF/Else trees, but routing many cases gets clunky fast. Looping over an array of items requires Sub-Zaps and careful design; the tool wasn't built for it. Heavy data transformation means reaching for the Formatter step, which is powerful but UI-heavy and hard to reason about as workflows grow. AI is bolted on — Zapier has an AI step and OpenAI integrations, but it doesn't feel native the way n8n's cluster nodes do.

Pricing is where Zapier gets expensive. Their model charges per *task* (one action = one task), and a workflow that fans out across many items can burn through a monthly allowance fast. A growing team usually finds itself on a plan that's $400+/month (as of writing) within a year of serious use.

**When Zapier is the right call**: you need to ship workflows fast, the workflows are mostly linear (this happens → do that), the team is small enough that the per-task pricing stays manageable, and nobody on the team wants to think about hosting or self-managing anything.

**When to look past Zapier**: your workflows need real branching, looping, or data manipulation; you process hundreds of items per execution and the task pricing starts to bite; you need AI to be a first-class citizen rather than a step; or your data has regulatory constraints (PDPA, GDPR, HIPAA) that make a third-party cloud questionable.

## Make — the visual middle ground

Make (formerly Integromat, rebranded in 2022) is the tool most people *should* have heard of but haven't. It sits in the middle of the market — more flexible than Zapier, less powerful than n8n, often cheaper than both.

Make's signature is the visual canvas. Where Zapier draws workflows as a linear list of cards stacked top-to-bottom, Make draws them as nodes on a 2D canvas with curved lines between them — which is what an actual workflow graph looks like once it has branches and merges. Their **Router** module fans out to many paths cleanly. Their **Iterator** and **Aggregator** modules handle looping over arrays elegantly. Their data transformation is genuinely good — better than Zapier's Formatter, comparable to n8n's expression editor for most tasks.

Where Make falls short is at the two ends of the spectrum. On the simple end, it's a *fraction* less polished than Zapier — you'll fight slightly more with the first-time setup, the documentation is thinner in places, and the integration catalog is narrower (~1,500 apps vs Zapier's 8,000). On the complex end, Make doesn't have n8n's AI-native nodes (no AI Agent node, no built-in Text Classifier or Information Extractor), no real self-hosting story, and the Code module is more limited than n8n's Code node.

Pricing is Make's strongest practical argument. Their **operation-based** model (one operation per module call, with batch discounts) tends to come out 2–4× cheaper than Zapier for the same workflow at the same scale. The free tier (1,000 operations/month) is generous enough to run real personal workflows for free.

**When Make is the right call**: your workflows have real branching and looping, your budget is tighter than Zapier wants, you don't need AI to be a first-class node, and you're fine with a cloud-only deployment.

**When to look past Make**: you want AI deeply integrated, you need to self-host for compliance reasons, or you need to extend with custom code more than Make's Code module allows.

## n8n — the deepest of the four

n8n (pronounced "n-eight-n", short for *nodemation*) is the tool this book is built around. The reasons, in order of weight:

**Self-hosting is real.** n8n is the only one of the four that you can run on your own infrastructure for free — on a Docker container on your laptop, on a VPS, in your company's data centre, behind your firewall, in a region your regulator approves. The cloud version exists too (and is the recommended starting point for most readers), but the option to bring the whole platform in-house is the killer feature for Malaysian SMEs dealing with PDPA, for regulated industries, and for anyone whose data shouldn't leave their jurisdiction. Ch. 28 covers the operational reality of self-hosting honestly — it's not free in time even when it's free in dollars.

**AI is first-class, not bolted on.** n8n's **AI Agent node** is a cluster of pre-wired components — model, system prompt, structured output parser, optional memory, optional tools — that you configure visually in English. The **Text Classifier**, **Sentiment Analysis**, and **Information Extractor** nodes handle the most common business-AI tasks without prompt engineering from scratch. Where Zapier and Make treat AI as *"add an OpenAI step"*, n8n treats it as *"here's a category of nodes for cognitive work."* Part IV of this book is the deep tour.

**The data model is the right one.** n8n moves data as JSON items between nodes (the model from Ch. 2). Once that lands, branching, looping, merging, batching, and AI integration all become composable in a way that Zapier and Make's models don't quite manage. The cost is a slightly steeper learning curve — about a chapter's worth, namely Ch. 11.

**It's free if you self-host, and predictably priced in the cloud.** n8n's pricing is per-execution on cloud, not per-task — a workflow that processes 100 items in one execution counts as one execution. For workflows that fan out across many items (an invoice batch, a list of customers, an enrichment loop), that pricing model can be dramatically cheaper than per-task tools.

**Where n8n is honestly weaker**: polish is a notch below Zapier's on first-time onboarding. The integration catalog is narrower (~650 built-in nodes vs Zapier's 8,000), though the **HTTP Request node** closes the gap for anything else. The community is smaller. And the cognitive load of "I have a real workflow engine in front of me" is higher than Zapier's *"I'm building a Zap"* simplicity.

**When n8n is the right call**: any of the reasons above. Especially: you're building anything AI-native, you need self-host for compliance, you're processing batches of items, or you want the option to drop down into custom code without leaving the platform.

## Power Automate — the company car

Power Automate is Microsoft's workflow tool, and it lives in a category of its own. If your company runs on Microsoft 365 — Outlook for email, Teams for chat, SharePoint for docs, Excel Online for spreadsheets, Dynamics for CRM — Power Automate's Microsoft connectors are deeper than anyone else's. SharePoint list triggers, Outlook calendar events, Teams adaptive cards, Excel table operations are all first-class. You also get desktop automation (Power Automate Desktop) and AI Builder for the Microsoft ML stack.

The catch is the lock-in. Power Automate is genuinely good *inside* the Microsoft world and noticeably less convenient outside it. If half your workflows touch Google Workspace, HubSpot, Slack, or Stripe, you'll spend more time fighting connector limitations than you would on n8n or Zapier. Pricing is bundled with Microsoft 365 plans in a way that's either an excellent deal (if you already have the licenses) or a separate purchase (if you don't).

**When Power Automate is the right call**: you're a Microsoft shop, your team already has the licenses, and most of your data lives in the Microsoft ecosystem. In that situation, it's hard to beat.

**When to look past it**: anything else.

## Where these tools blur

The categories above are useful as a map, but the borders are softer than the marketing pages suggest. All four support **webhooks** and **HTTP Request** nodes, so the integration-catalog gaps matter less than they look — anything not built in can be reached over HTTP. All four are **adding AI features** as fast as their roadmaps allow; n8n is ahead today, the others catching up. All four offer **community template libraries** — the *"equip first, then engage"* throughline applies across all of them.

The strongest setups for serious teams in 2026 combine one primary engine (n8n if you're building anything AI-native or have compliance constraints; Zapier if you need the simplest possible on-ramp; Make if you want the middle ground) with a clear policy about when to reach for the others.

## What about Workato, Pipedream, Activepieces, IFTTT?

A short tour of the runners-up: **Workato** and **Tray.ai** are enterprise iPaaS — powerful, priced at $10K+/year (as of writing), sold to IT departments rather than the operator building a Monday-morning workflow. **Pipedream** is developer-flavoured: workflows as code, strongest on engineering-led teams. **Activepieces** is the closest open-source competitor to n8n — younger, smaller community, worth watching. **IFTTT** is the original consumer tool — fine for personal-life automation, not built for branching, looping, or team workflows.

None of these change the picture above.

## The four tools at a glance

A reference table you can come back to. All claims are accurate as of writing (mid-2026); the dimensions are stable even when the specifics drift.

| | **n8n** | **Zapier** | **Make** | **Power Automate** |
|---|---|---|---|---|
| **Best for** | AI-native workflows, branching/looping, regulated data | Fastest possible time-to-first-Zap, broadest integration catalog | Visual canvas with cheap pricing, deep on routers and iterators | Teams already on Microsoft 365 with the licenses |
| **Pricing model** | Per execution (1 run = 1 execution, regardless of items processed) | Per task (1 step = 1 task; fans out fast) | Per operation (1 module call = 1 operation; batch discounts) | Bundled into Microsoft 365 license tiers |
| **Free tier** | 200 executions/month, 1 active workflow + 14-day Pro trial | 100 tasks/month, 2-step Zaps only | 1,000 operations/month, unlimited workflows | Included in Microsoft 365 plans |
| **AI integration** | First-class — AI Agent node, Text Classifier, Sentiment, Information Extractor, all built-in | Bolted on — OpenAI step exists but feels like an action, not a native primitive | Bolted on — OpenAI integration available, no native AI primitives yet | Catching up via Azure OpenAI + AI Builder |
| **Self-hosting** | Yes — Docker, npm, VPS, on-prem, behind firewall (free, Community Edition) | No — cloud only | No — cloud only | No — Microsoft cloud only |
| **Integration catalog** | ~650 built-in + HTTP Request for anything else | ~8,000 built-in (largest in market) | ~1,500 built-in + HTTP module | ~1,000+ with deepest Microsoft integration |
| **Learning curve** | Moderate — the item-based data model takes a chapter to land | Lowest in the market — built for non-technical first-timers | Moderate — the visual canvas is intuitive, the data model has edges | Moderate — gentler if you already live in Microsoft |
| **Where it breaks down** | Niche-app integrations may lag; community smaller than Zapier's | Workflows with real branching or batching get clunky and expensive fast | No serious self-host story; no native AI primitives | Awkward outside the Microsoft ecosystem |

## When to pick which — a decision matrix

| Your situation | Pick |
|---|---|
| You need to ship a workflow this afternoon and you'll never need branching, looping, or AI | **Zapier** |
| Your data has PDPA, GDPR, HIPAA, or other compliance constraints | **n8n self-hosted** |
| You're building anything AI-heavy (classification, extraction, drafting, multi-step agent reasoning) | **n8n** |
| Your team is on Microsoft 365 and most of your data lives there | **Power Automate** |
| You have Zapier-shape workflows but the pricing has started to bite | **Make** |
| You process batches of items (hundreds of leads, all of yesterday's orders, every customer in a segment) | **n8n** or **Make** (per-execution / per-operation pricing beats per-task) |
| You want to commit workflow definitions to Git alongside your code | **n8n** (workflows are JSON, importable/exportable) or **Pipedream** |
| You want one tool to learn and one tool to defend in a budget meeting | **n8n** — it's the deepest of the four, free if self-hosted, predictably priced in the cloud |

## How fast is this changing?

Fast. Be calibrated about that. Pricing changes quarterly. AI feature parity changes monthly. New connectors ship weekly. By the time this paragraph reaches you, at least three things in this chapter will be slightly out of date.

This is fine, because the **architecture diagram from Ch. 2** is the part that doesn't churn. A new tool from a vendor you've never heard of will, almost certainly, be a trigger plus a workflow of nodes plus connected apps. Drop it into your mental model and ask: *which box is this competing in? what does it do better?* That question answers most "should we switch?" debates faster than any review article.

## So which one should you install first?

If you're brand new and want one defensible default: **install n8n** (Cloud version, free trial — Ch. 4 walks through it). It's what this book teaches against, the AI integration is the deepest, and once you've learned one workflow engine, the others come fast.

If your team is already on Zapier and shipping fine, **stay on Zapier** until a workflow hurts. Don't migrate for the sake of it. The lesson of Part V's role chapters — that workflow patterns matter more than tool choice — is the deeper point.

If you're a Microsoft 365 shop with the licenses, **try Power Automate first**; you may already have what you need.

If you're privacy-sensitive, regulated, or your data shouldn't leave Malaysia (or wherever you are), **self-hosted n8n** is the only honest answer of the four. Ch. 28 takes that seriously.

The next chapter has you installing n8n and running a first workflow in ten minutes. Don't agonize over the choice. You can have a Zapier account running by Sunday if you want a comparison.

## The takeaway

- Four tools that matter: **n8n** (the deepest, most AI-native, self-hostable), **Zapier** (the easiest, broadest catalog, most expensive at scale), **Make** (the visual middle ground, often cheapest), **Power Automate** (the Microsoft 365 answer).
- All four are variations on the **architecture from Ch. 2** — trigger, workflow of nodes, connected apps. New tools slot into that diagram without changing it.
- The field churns fast. Pick a default, learn the muscle, swap when a real task pulls you to.
- A reasonable starter set for most readers: **n8n** as the primary engine (Cloud for ease, self-hosted for compliance), with Zapier as a backup for ultra-simple workflows where it pays for itself.

## Try it yourself

Open the homepages of two tools — say, [n8n.io](https://n8n.io/) and [zapier.com](https://zapier.com/) — and read each one's homepage for two minutes.

Write down, in one line each:

- What kind of work each tool seems most proud of doing.
- One thing that's the *same* across both.
- One thing where they disagree (pricing model, AI story, self-host story, target audience).

**You'll know it worked when** the homepage marketing copy starts to feel transparent — you can see straight through it to "this is a workflow engine with these triggers and these connectors", instead of getting swept up in adjectives.

## What's next

Enough surveying. The next chapter has you install n8n and run one real workflow end-to-end. Theory off, hands on.
