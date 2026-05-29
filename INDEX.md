# Learn Automation Working — Playbook Index

**Working title:** *Learn Automation Working: A practical, open-source playbook for shipping real workflows with n8n.*

**End goal:** A reader who finishes Part I + Part II + their Part V chapter can build, ship, and defend a production-grade workflow at their workplace by the end of the same week. A reader who finishes the whole book is fluent enough to architect multi-workflow systems, self-host n8n, and advocate for automation as a strategic capability — not a side project.

**Shape:** Six parts, 32 chapters, four appendices. Each chapter ~1,800–2,500 words, scenario-led, with a "Try it yourself" exercise and an "In other tools" call-out (Zapier / Make / Power Automate equivalents) where useful. Every chapter is standalone.

The structure mirrors the Course 1 module spine but expands it from 6 classroom modules into 30 self-paced chapters that a reader can navigate non-linearly.

---

## Part I — Foundations

*The "why" and the first taste. A reader who finishes Part I can name what automation actually changes about their job, has built one workflow end-to-end, and knows whether to keep going.*

**Ch. 1 — What changes when you stop doing it by hand?**
The opening reframe. Most people experience automation as "I made a Zap once and it broke." The chapter draws the line between *ad-hoc copy-paste* (you, every day) and *a workflow* (something that runs whether you're at your desk or not). Introduces the **manual-work tax** — the time you spend shuttling data between Gmail, Sheets, and Slack — and frames the rest of the book as eliminating it. Ends with the three throughlines of the book.

**Ch. 2 — How does an automation actually run?**
The architecture chapter. Introduces the single mental model the whole book rests on: **Trigger → Workflow (Nodes + Connections) → Connected Apps**, with data flowing as JSON items. Walks through what an "execution" is, the difference between manual / partial / production executions, and what n8n's Executions log shows you. The diagram every later chapter refers back to.

**Ch. 3 — What's the automation landscape right now?**
The tool-neutrality chapter. Honest, opinionated tour of **n8n, Zapier, Make, Power Automate** — what each is best at, what each is bad at, when to pick which. Uses the Toyota / Subaru / Land Cruiser mental model. The reader leaves knowing why this book picks n8n as the primary tool *and* when they should reach for one of the others instead. **All later "in other tools" callouts defer back to this chapter rather than re-running the comparison.**

**Ch. 4 — A 10-minute first win.**
The "do the thing" chapter. One trigger, one action, one workflow. The reader installs (or signs up for) n8n, builds a Schedule → Send Email workflow that emails them their day's calendar at 7 AM, activates it, watches the first execution land in their inbox. Counter-instruction: don't install five integrations, don't try the AI Agent node yet, don't open three tabs. One workflow, one window, one win. *This becomes the running example reused in Ch. 12, 13, 14, 16.*

**Ch. 5 — Do you still need that AI tool?**
The strategic chapter most readers quietly need. Before the reader subscribes to "AI Email Assistant for $30/month" or "Lead Enrichment SaaS for $200/month," this chapter walks through the **"keep the systems, skip the manual work"** thesis. A general-purpose workflow engine plus an AI Agent node replaces a surprising number of single-purpose SaaS subscriptions when pointed at the systems the reader already pays for. Distinguishes what to *keep* (Gmail, HubSpot, QuickBooks — systems of record) from what to *replace* (the AI wrappers and copy-paste tools layered on top).

---

## Part II — Setup once

*The one-time investment that makes everything afterward easier. A reader who finishes Part II has n8n running where they want it, knows what they can and can't trust it with, and has wired up their first credentials.*

**Ch. 6 — Installing n8n: Cloud, Render, Hostinger, or self-hosted Docker?**
The decision chapter, then the install. Walks through the options and who each is for: **n8n Cloud** (the right default for most readers), **managed hosts** (Render, Hostinger — low-friction middle ground), and **self-hosted via Docker** (for teams with data-residency or compliance constraints — PDPA-sensitive Malaysian SMEs are the named example, framed as a risk-management choice rather than a legal requirement). Includes the actual install for each, but the chapter's job is helping the reader pick — the install is the easy part.

> **Patch flag:** A future revision should add a "production env vars you actually need" section covering `WEBHOOK_URL`, `GENERIC_TIMEZONE`, and `N8N_ENCRYPTION_KEY`. Ch. 14's production-traps section forward-references this. The deprecated `N8N_BASIC_AUTH_*` vars are already correctly flagged in the current draft.

**Ch. 7 — How much should you trust a workflow to run on its own?**
The trust and permissions chapter. The book's stance on autonomy: **build for production, monitor closely, intervene when wrong**. Covers what happens when a workflow fails (it shows up red in the Executions log, it doesn't break your data), the difference between reversible and irreversible actions, where to put **human-in-the-loop approvals** (introduced here, fully covered in Ch. 14), and how to think about the blast radius of every workflow you build. Establishes the **reversibility heuristic** that Ch. 14 cashes in as a decision table.

**Ch. 8 — Setting up your first credentials.**
The "give n8n hands" chapter. Walks through connecting Gmail, Google Sheets, Slack, and one CRM (HubSpot is the default example) — the four credentials that unlock 80% of beginner workflows. Frames authentication as something **n8n handles for you once you complete an OAuth flow**, not something you configure with client IDs and tokens. Explains how credentials are reused across workflows and shared across teammates in n8n's permission system.

> **Patch flag:** A future revision should add a generic-doctrine section — how OAuth2 credentials work in n8n, how API key credentials work, the difference between service-level and user-level credentials, how shared credentials work in Projects — separate from the four specific walkthroughs. Without it, readers hit a wall the moment they need Notion, Stripe, or any service outside the four named.

**Ch. 9 — Your workspace setup: workflows, folders, tags.**
The hygiene chapter that pays dividends in month three. How to organise workflows in **projects** and **folders**, when to use **tags**, how to name workflows so future-you can find them ("nightly-customer-export-to-warehouse" beats "Workflow 14"), and where the **Executions** log lives. Short chapter, high return. Introduces the **at-least-two-owners rule** for team workflow ownership.

> **Patch flag:** A future revision should add a node-naming convention sub-section. Ch. 12's `$('Node Name')` accessor relies entirely on stable, drag-and-drop-safe node names; while drag-and-drop is the recommended habit, explicit naming-convention guidance is cheap insurance.

---

## Part III — Building real workflows

*The technical core of the book. A reader who finishes Part III can build any workflow they can describe — branching, looping, merging, transforming data, calling arbitrary APIs — without writing significant code.*

**Ch. 10 — Triggers: how does a workflow know when to run?**
The three trigger families: **Schedule** (cron-style, runs at a time), **Webhook** (something else calls n8n), and **App Event** (a third-party app pushes a change — new email, new row, new ticket). When to pick which, with one worked example per family. The chapter also introduces **polling vs. push** — why some triggers feel "instant" and others lag by a few minutes — and how to choose given your latency tolerance.

**Ch. 11 — Why does data flow as items?**
The single most important conceptual chapter in the book. Explains n8n's **item-based data model** — every node receives an array of JSON items and emits an array of JSON items — using the metaphor of a mail-sorting belt. Once a reader internalises this, branching, looping, and merging all become obvious. Covers what an "item" looks like, how to inspect data between nodes, item linking (`pairedItem`), and the difference between *"runs once per workflow"* and *"runs once per item"*. Grounded in `docs.n8n.io/data/data-structure/`.

**Ch. 12 — How do you actually write an expression?**
The expression-language chapter. The `{{ }}` syntax, `$json` for the current item, `$('Node Name')` for reaching into prior nodes, **Luxon for date math** (`$now`, `$today`, `.plus()`, `.toFormat()`), string operations, and the three idioms for missing-field fallbacks (`??`, `||`, ternary). Strong emphasis on **drag-and-drop expression building** so non-technical readers build expressions visually before they read the syntax. Closes with the three classic expression errors and how to read them.

**Ch. 13 — How do you route different items down different paths?**
The branching chapter. Three nodes, three jobs: **Filter** (drop items that fail a check), **If** (two branches), **Switch** (three or more branches). Covers the Merge-after-If gotcha, Switch's Rules mode vs. Expression mode, the production-critical Fallback Output setting, and the **type-strictness trap** that bites everyone the first time. Worked example: lead routing by deal value to three different downstream channels.

**Ch. 14 — How do you pause a workflow for a human?**
The reliability chapter for the cases where automation should stop and wait. Covers the **Send and Wait for Response** primitive (Slack, Telegram, Send Email, Discord, WhatsApp, Chat) and Gmail's **Send and Wait for Approval** equivalent — the modern one-node HITL pattern. The **Wait node**'s four resume modes (time interval, specified time, on webhook call, on form submitted). Three production traps: bot-clicked resume URLs, `localhost` self-host misconfig, and webhook waits without a timeout. Cashes in Ch. 7's reversibility heuristic as a decision table.

**Ch. 15 — What happens when a node fails?**
The error-handling chapter. Introduces the **four-layer error model**: per-node **Retry On Fail** (caps at 5 attempts / 5000ms wait), per-node **Continue (using error output)** for routable failures, the workflow-level **Error Trigger** workflow attached once-per-instance to all production workflows, and the **Stop And Error** node for explicit data-validation failures. Reframes error handling not as "preventing failures" but as "noticing them fast and recovering cheaply." Builds out the canonical Slack alert template every production instance should have.

**Ch. 16 — How do you process 10,000 items without breaking everything?**
The throughput, rate-limit, and cost chapter. Three problems, distinct patterns: **Loop Over Items** for explicit batch-size control (paired with a Wait node — the most common rate-limit mistake), **built-in batching** on HTTP Request and AI Agent / AI Tool, the **manual retry loop** with exponential backoff for cases the 5-try cap can't handle, and the five-pattern **AI cost-control stack** (filter before spending, strip the input, use cheap models for cheap tasks, cap Max Iterations, log token usage).

**Ch. 17 — How do you shape data between nodes?**  *NEW*
The data-transformation chapter. The **Edit Fields (Set)** node — n8n's workhorse — covered in both Manual Mapping and JSON modes, with the all-vs-current-item *Run Once* toggle that's a frequent debug point. The **Merge** node's four modes (Append, Combine by Position, Combine by Field, Multiplex) with canonical use cases for each. The **Code** node as the escape hatch — fewer than 5% of workflows need it, but when they do, three or four lines of JavaScript replace ten nodes. Teaches the canonical "copy-pasteable patterns" promise of Course 1 Module 2: array manipulation, deduplication, date math, string normalisation. *Set is forward-referenced from Ch. 12 onwards; this chapter delivers the teaching that those references rely on.*

**Ch. 18 — How do you call any API n8n doesn't already integrate with?**  *NEW*
The HTTP Request chapter — the node that unlocks every service not in n8n's built-in catalog. Covers GET / POST / PUT / PATCH / DELETE at the level a non-developer needs, query params / headers / request bodies, the three authentication modes (**API Key**, **Bearer Token**, **OAuth2**), pagination patterns (offset vs cursor), and the **Import cURL** button — pasting a working `curl` command and getting a configured node — which is the fastest path for non-developers. Closes with the **Respond to Webhook** action node as the synchronous counterpart for workflows that something else is calling and waiting on (Stripe webhooks, Typeform integrations, custom-built API receivers).

---

## Part IV — Adding AI

*The chapters where n8n stops being "Zapier plus a UI" and starts being a platform for agentic work. A reader who finishes Part IV can integrate AI Agent nodes into structured workflows without burning their budget or producing inconsistent output.*

**Ch. 19 — The AI Agent node: setup, models, and your first agent.**
The foundational AI chapter. Introduces the **AI Agent root node** and its cluster (chat model sub-nodes, memory sub-nodes, tool sub-nodes, output parsers). Credential setup for **OpenAI, Anthropic, and Google Gemini**, model selection for the job (when to reach for a small/fast/cheap model vs. a capable/slow/expensive one), and the **system prompt** as the most cost-effective lever you have. Builds the canonical first agent: a structured-data extractor that turns messy email subject lines into clean fields.

> **Highest staleness risk in the book.** Per PROJECT-SUMMARY: requires 5–8 canonical doc fetches before drafting (AI Agent root node, three chat model sub-nodes, the agent variants — Tools Agent vs. ReAct Agent — memory sub-nodes, output parser sub-nodes). Do not draft without them.

**Ch. 20 — Classifying and extracting from unstructured text.**
The "unstructured → structured" chapter. Covers the **Text Classifier**, **Sentiment Analysis**, and **Information Extractor** nodes — n8n's purpose-built AI nodes for the most common SME tasks (tag this ticket, score this email's sentiment, extract these fields from this PDF). When to use each vs. when to build a general AI Agent with a structured-output parser. Worked example: customer support ticket triage with sentiment scoring.

**Ch. 21 — Memory, embeddings, and Q&A over your own documents.**
The **vector store + retrieval** chapter. How to load PDFs, web pages, or a folder of internal documents into **Pinecone, Supabase pgvector, or Postgres pgvector**, and how to build a Q&A chain that answers questions grounded in your own data. Covers chunking, embedding choices, and the two architectural patterns: *retrieval-augmented agent* (agent decides when to look something up) vs. *direct Q&A chain* (every question goes through the same retrieval pipeline). Honest about when this is overkill — most SMEs don't need a vector DB; they need better folder structure.

---

## Part V — Workflows by role

*The "build something useful by Monday" section. Each chapter surveys 3–4 canonical workflow patterns for a specific role, with one chosen for a full Try-It-Yourself walkthrough. The point is patterns transferable to your work, not one signature build. Skip to yours; the others won't shame you.*

**Ch. 22 — For business development.**
Patterns for BD/sales workflows: lead capture and qualification scoring, inbound lead enrichment via third-party APIs, pipeline-stalled follow-up reminders, and meeting-prep brief automation. The chapter pulls together Switch (Ch. 13), Send and Wait for Approval (Ch. 14), AI Agent scoring (Ch. 19), and HTTP Request enrichment (Ch. 18) in real BD contexts. The Lead Qualification Engine appears as one of the patterns surveyed, not as the whole chapter.

**Ch. 23 — For customer success.**
Patterns for CS workflows: ticket triage with classifier + sentiment (Ch. 20), automated FAQ-style replies grounded in your knowledge base (Ch. 21 RAG), sentiment-driven escalation to humans, and SLA tracking with proactive alerts. The chapter for support team leads who want their team focused on the hard tickets, not the FAQ-shaped ones.

**Ch. 24 — For finance and ops.**
Patterns for finance/ops workflows: invoice extraction from PDF to ledger, receipt-to-spreadsheet personal automation, payment-failure follow-up sequences, monthly reconciliation against bank-feed records, and budget anomaly alerts. Uses the Information Extractor (Ch. 20), Switch routing (Ch. 13), and Error Trigger workflows (Ch. 15).

**Ch. 25 — For marketing.**
Patterns for marketing workflows: broadcast approval gates for mass sends, A/B subject-line variant generation, content calendar assembly from multiple sources, lead-magnet delivery, and post-event follow-up sequences. The chapter where Ch. 14's 12,000-recipient broadcast scenario becomes a deployable pattern.

**Ch. 26 — For everyone — personal workflows.**
Patterns for personal automation: daily briefing bot (calendar + weather + news + Slack), receipt capture to expense sheet, networking enrichment for new contacts, focus-time auto-scheduling, and weekly reading roundup. The chapter that turns automation from a work thing into a quietly-raise-your-floor thing. *"If you owned this, you'd ship it before lunch."*

---

## Part VI — Going further

*The advanced patterns. Pull these in only when a real workflow makes you wish you had them. Not gates between you and value — opt-in upgrades.*

**Ch. 27 — Sub-workflows: keeping the canvas readable.**
The day your main workflow has 60 nodes and you can't find the one that's failing, you want sub-workflows. Covers the **Execute Sub-workflow** node, the reusability pattern (a "send-standard-customer-email" sub-workflow used by every workflow that emails customers), and how sub-workflows enable team-scale automation — different team members own different sub-workflows, none of them stomp on each other. Includes the n8n v2.0 sub-workflow + wait behaviour that Ch. 14 flagged.

**Ch. 28 — Self-hosting n8n at depth: Docker, queue mode, the PDPA case.**
The chapter for Malaysian SMEs, regulated industries, and anyone whose data shouldn't leave their jurisdiction. Walks through production Docker deployment beyond what Ch. 6 covered: **queue mode** with workers and Redis, Postgres as the production database (not SQLite), connection pooling, retention env vars, backup strategies for `n8n_data` volumes, and the realistic operational cost — what you save in subscription fees, you pay in ops time. Honest about whether the reader actually needs this. Most don't.

**Ch. 29 — Connecting to a database and writing real records.**
The graduation chapter. Reading and writing to **Postgres** or **Supabase** directly from a workflow — bypassing CRM rate limits, building internal tools, treating n8n as the orchestration layer over your real systems of record. Includes the safety patterns: read-only credentials for analytics workflows, scoped writes, never running ad-hoc UPDATE without a WHERE clause review.

**Ch. 30 — Scheduling, queueing, and running at scale.**
The performance chapter. n8n's concurrent-execution model, how to think about cost as you scale from 10 executions/day to 10,000, **n8n Cloud concurrency limits**, and when self-hosting starts to pay off. Cross-references Ch. 28's queue mode coverage for self-hosted readers.

**Ch. 31 — Custom code: advanced patterns.**
The follow-on to Ch. 17's Code intro. When workflows you've already built grow Code nodes that grow into Code-node monsters, when to refactor a Code node into a sub-workflow, when to reach for the **AI Transform** node as the "describe what you want, get JavaScript" alternative, and the canonical advanced patterns: streaming responses, structured retry logic, custom error objects, JMESPath for deeply-nested queries.

**Ch. 32 — What we got wrong, and what's next.**
The closing chapter. Anti-patterns the author has seen and committed (over-staging, under-monitoring, the 200-node monolith, the workflow nobody owns, the AI node that costs RM 900 a month before anyone notices). What's coming in n8n and the wider automation landscape — MCP integration, agentic workflows, native AI evaluation. What this book will get wrong as the tools change underneath it.

---

## Appendices

**Appendix A — Glossary.**
Plain-English definitions of every term the book uses: *Item, Execution, Trigger, Webhook, Expression, Credential, Sub-workflow, Cluster node, Queue mode, Polling vs. push,* and the rest. Alphabetical, each entry one or two sentences, with chapter pointers.

**Appendix B — Reference workflow library.**
Ten canonical reference workflows from the book, exported as importable JSON, with at least two per Part V role: **Lead Qualification Engine** and **Inbound Lead Enrichment** (BD), **Ticket Triage with Sentiment Routing** and **Knowledge-Base Q&A Bot** (CS), **Invoice-to-Ledger Pipeline** and **Receipt-to-Spreadsheet** (finance), **Broadcast Approval Gate** and **Content Calendar Assembly** (marketing), **Personal Daily Briefing Bot** and **Meeting-Notes Action Item Extractor** (personal). Each with a README explaining what it does, credentials needed, and what to expect on first run. The reader can import any of them into their n8n instance and have a working starting point in two minutes. Worth noting: the appendix grew in importance once Part V chapters shifted to pattern-survey format — this is where the *complete-artefact-per-role* lives.

**Appendix C — Credentials cheat sheet.**
A one-page reference for connecting the 20 most common apps the book references — Gmail, Slack, Google Sheets, HubSpot, Pipedrive, Salesforce, Stripe, Xero, Notion, Linear, Asana, Typeform, OpenAI, Anthropic, Postgres, Supabase, Webhook, HTTP Request (with Bearer auth), HTTP Request (with OAuth2), HTTP Request (with API key in header). For each: where to find the API key / OAuth flow, what scopes to grant, common gotchas.

**Appendix D — Further reading.**
A short, opinionated list. The n8n docs (`docs.n8n.io`), the official courses, the template library (`n8n.io/workflows`), the community forum, three good YouTube channels, two books on automation strategy. Not a link-dump — each entry annotated with *what to read it for*.

---

## How to read this book

Four reading paths, depending on who you are:

- **Brand new to automation** — Part I and Part II in order, then jump to the workflow chapter in Part V that matches your role. Skip everything else for now.
- **Convince me before I invest in setup** — Part I, then skip ahead to **Part V** and your role chapter. Loop back to Part II once you're sold.
- **Already shipped a few Zaps** — skim Part I, settle in for Part III (this is where the depth jump happens), and treat Parts IV–VI as reference.
- **Rolling this out across a team** — Part I, then Ch. 7 (trust), Ch. 14 (human-in-the-loop), Ch. 27 (sub-workflows), and Ch. 28 (self-hosting) — the four chapters that make automation a team capability instead of one person's side project.

Every chapter is standalone. Workflow JSON is importable. Examples are real — drawn from actual working teams, paraphrased and anonymised.

---

## What you'll be able to do when you're done

A reader who works through this playbook end-to-end can:

1. **Explain to a colleague or boss** why automation is a strategic capability — not a side project — and defend the choice of n8n over Zapier or Make in concrete operational terms.
2. **Build a production-grade workflow from scratch** that triggers on a real event, transforms data through branches and loops, integrates an AI Agent for unstructured-data handling, pauses for human approval where stakes warrant it, and recovers cleanly from errors.
3. **Ship and own a workflow at work**, monitor its executions, debug failures, and iterate on it as the underlying systems change.
4. **Architect multi-workflow systems** with sub-workflows and shared credentials, where multiple team members each own a slice.
5. **Make the self-host call** — knowing when n8n Cloud is fine, when PDPA / GDPR / data-residency requires self-hosting, and what the operational cost of that choice actually is.
6. **Advocate for automation as a budget item** with real ROI numbers — time saved, subscriptions replaced, response-time improvements — grounded in their own workflows, not vendor marketing decks.

That's the technical-advocacy bar the book is built around.

---

## Changelog

**v0.4** *(this revision)* — Completed Part VI (Ch. 27–32: sub-workflows, self-hosting at depth, direct database operations, scheduling/scale, advanced code, and the closing retrospective) and all four appendices (A glossary, B reference-workflow library, C credentials cheat sheet, D further reading), bringing the book to its final **32-chapter** shape. Expanded Appendix B to **20 reference workflows** (all four patterns per Part V role). Corrected the PDPA framing in Ch. 28 to reflect Malaysia's April 2025 Cross-Border Transfer Guidelines (self-hosting as a risk-management choice, not a legal localisation requirement). Ran a full book-wide QA pass: resolved cross-reference drift from the v0.2 renumbering, removed residual "Course 1 capstone" framing, and standardised model naming.

**v0.3** — Decentered Part V from single-workflow-per-role-chapter to pattern-survey-per-role. Each Part V chapter now surveys 3–4 canonical workflow patterns for that role with one chosen for the Try-It-Yourself walkthrough; reflects the playbook's stance that it's an independent companion to Course 1, not a capstone retelling. Updated Part V intro paragraph and all five role-chapter blurbs (Ch. 22–26) to reflect this. Expanded Appendix B from 5 to 10 reference workflows so each Part V role has at least two complete importable artefacts.

**v0.2** — Inserted two new Part III chapters (Ch. 17 *Shaping data*, Ch. 18 *Calling any API*); renumbered Parts IV–VI accordingly (28 → 30 chapters total). Moved Code-node teaching from old Ch. 30 (Part VI) to new Ch. 17 (Part III); old Ch. 30 becomes new Ch. 31 "Custom code: advanced patterns." Aligned all Part III chapter titles to question-format. Added scope notes for Ch. 4's running-example role, Ch. 7's reversibility-heuristic role, and three patch flags for Ch. 6, 8, 9.

**v0.1** — Initial 28-chapter index, six parts, four appendices.
