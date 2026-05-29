# CLAUDE.md — Instructions for agents working on this book

You are helping write **Learn Automation Working** — an open-source book that teaches teams how to use workflow automation tools (n8n primarily, Zapier and Make where relevant) to do real work, for both technical and non-technical audiences.

Read `README.md` first for the full vision, structure, and audience. This file is the *style and working* guide for any agent (you) helping write or edit the book.

The book is built backwards from a four-day intensive course outline ("AI Automation with n8n"); the playbook is the reading-and-reference companion that audience can read on their own, finish in a week, and reach for in the months after.

---

## The reader

Default to writing for **two audiences side-by-side**:

1. **The technical reader** — engineer, data analyst, devops, IT operations. Comfortable with JSON, APIs, the basics of a CLI. Has probably wired up at least one webhook in their career.
2. **The non-technical reader** — operations manager, marketing technologist, business analyst, founder, finance ops, customer-success lead. Comfortable with spreadsheets, Slack, Google Workspace, a CRM. Has *seen* JSON but doesn't write it; has *heard* of APIs but has never authenticated to one by hand.

**Rules of thumb:**
- Assume they know what a spreadsheet is. Don't assume they know what a "node", "trigger", "webhook", "JSON", "expression", "execution", or "sub-workflow" is — introduce each on first use.
- When something requires light JavaScript (the Code node), say so plainly, give a copy-pasteable pattern, and tell the non-technical reader *"you can skim this — the pattern matters more than the syntax."*
- Every concept is taught **with a runnable workflow**. No abstract definitions without a concrete trigger-action pair next to them.
- Bias toward **"here's a workflow you'd actually run at work"** over toy examples. The bar is: *would an ops lead at a 50-person Malaysian SME ship this on Monday?*

---

## Tone & voice

- Conversational, second-person ("you"), opinionated but humble.
- Short sentences. Active voice. No corporate hedging.
- It's okay to say "this is the part that always trips people up" or "skip this section if you don't care about X."
- No marketing speak. No "unleash the power of." No "in today's fast-paced world." No "supercharge your workflow."
- No emojis in the book content (the audience is international and many corporate readers find them unserious). Diagrams and screenshots are fine.

---

## Tool-neutrality policy

The book is **n8n-led but not n8n-only**.

- Primary running examples use **n8n** because it is the deepest, most flexible tool, self-hostable, and the curriculum is built on it.
- Every chapter that teaches an n8n feature must include a short **"In other tools"** call-out noting the equivalent in **Zapier**, **Make** (formerly Integromat), and **Power Automate** where one exists. If no equivalent exists, say so plainly.
- The mental hierarchy to keep in your head when writing these call-outs:
  - **Zapier** — the easiest on-ramp, the largest app catalog, the most expensive at scale, and the least flexible for branching/looping/data manipulation. The Toyota Corolla.
  - **Make** — visual canvas closer to n8n, cheaper than Zapier, less self-hostable, deep on routers and data ops, weaker on AI-native nodes. The Subaru.
  - **n8n** — the most flexible, the only one with serious self-host and AI-native cluster nodes, slightly steeper learning curve, free if you self-host. The Land Cruiser.
  - **Power Automate** — the right pick if the team already lives inside Microsoft 365 and ROI is gated on Microsoft connectors. Mention but don't dwell.
- Never claim a feature is unique to n8n without checking. Automation tooling moves fast — when in doubt, hedge ("at the time of writing…").

---

## Sourcing examples — real workflows by department

When you need an illustrative use case, **prefer real, department-specific workflows from the categories below** over invented ones. The bar is *"someone at a Malaysian SME would ship this on Monday morning"*. Each category lists the workflow shape, the apps it touches, and the chapter(s) it pairs with.

**Business Development & Sales — the highest-ROI category in the book**
- **Lead capture and triage** — Typeform/website form → enrich via Clearbit/Apollo HTTP Request → score with AI Agent → Slack notification with action buttons → HubSpot/Pipedrive write. *Best for: Ch. 4 (first win), Ch. 16 (capstone), Ch. 24 (sales chapter).* This is the canonical "lead qualification engine" the course is built around.
- **Cold-outreach personalisation** — Google Sheet of prospects → LinkedIn scrape via HTTP Request → AI Agent drafts personalised opener → human approval via Slack → SendGrid/Gmail send.
- **Meeting prep brief** — Calendar trigger 15min before meeting → enrich attendee via HTTP Request → AI Agent summarises company news + last touchpoints → email/Slack to user.
- **Deal stagnation watcher** — Schedule trigger weekly → HubSpot read deals "Negotiation" stage older than 14 days → AI Agent drafts nudge → Slack approval → send.

**Customer Support & Success**
- **Ticket triage with sentiment + routing** — Zendesk/Freshdesk trigger → AI Agent classifies (urgent/billing/technical) + sentiment → IF node routes → Slack channel notification + auto-acknowledge email. *Best for: Ch. 9 (AI in workflows), Ch. 13 (branching).*
- **Knowledge-base answer drafting** — new ticket → AI Agent + Question and Answer Chain on KB → drafts reply for agent review → never auto-sends. *Best for: Ch. 15 (human-in-the-loop).*
- **Renewal-risk early warning** — Schedule trigger daily → reads CSAT scores + ticket volume per customer → AI Agent flags at-risk accounts → email to CS lead.

**Finance & Operations**
- **Invoice extraction and ledger entry** — Gmail Trigger on invoices@ alias → Extract From File on PDF → AI Agent (Information Extractor) pulls vendor/amount/due date → Google Sheet/Xero append → Slack confirmation. *Best for: Ch. 9, Ch. 16.*
- **Multi-currency expense categorisation** — Schedule trigger weekly → reads expense Sheet → AI Agent (Text Classifier) categorises by GL code → writes back with audit column.
- **Daily cash position briefing** — Schedule trigger 8am → reads bank API + AR/AP sheets → AI Agent composes one-paragraph briefing → email to founder/CFO.

**Marketing & Content**
- **RSS-to-newsletter pipeline** — RSS Read Trigger on competitor blogs → AI Agent summarises + tags → Notion database append → weekly digest email. *Best for: Ch. 4 (showcase: Daily Briefing bot).*
- **Social-post repurposing** — new blog publish → AI Agent generates LinkedIn + Twitter/X + Threads variants → human approval → Buffer/native API post.
- **Campaign UTM audit** — Schedule trigger weekly → reads Google Sheet of campaign URLs → checks each is alive + has valid UTM → flags broken ones to Slack.

**HR & People**
- **JD draft from request form** — Typeform "open a req" → AI Agent reads existing JDs in Drive folder → drafts new JD in team voice → review request via Slack → Notion append.
- **Onboarding checklist generator** — new hire row in HRIS Sheet → fans out: creates Google Calendar onboarding events, drafts welcome email, creates Notion task list, posts in #welcome.
- **Resume pre-screen** — new application via webhook from job board → AI Agent scores against JD criteria → ranked list to hiring manager.

**Internal Ops / IT / Knowledge Work**
- **Meeting-notes to action items** — Gemini/Otter transcript dropped in Drive folder → Drive Trigger → AI Agent extracts owners + deadlines → Linear/Asana create tasks → Slack confirm to attendees.
- **Document sync watcher** — Google Drive Trigger on legal/ folder → flags any contract change to legal lead → diff via AI Agent → email summary.
- **System-health digest** — Schedule trigger hourly → pings 5 internal endpoints → IF any non-200 → PagerDuty/Slack alert with last-known-good state.

**Personal / Founder-level (the "if you owned this, you'd ship it before lunch" set)**
- **Morning briefing bot** — Schedule 7am → fans out: weather, calendar, top 5 unread emails, top 3 RSS items → AI Agent stitches into one digest → email. *Best for: Ch. 4 showcase.*
- **Receipt-to-spreadsheet** — Gmail Trigger on label "receipts" → Extract From File → AI Agent normalises → Google Sheet append.

When citing: **paraphrase, never invent screenshots or fabricated execution outputs**. Strip any client names, internal hostnames, ticket IDs, credentials, or personal data. If a real example would require too much anonymisation, label the parallel one as illustrative.

### Real workflow templates to reference as worked examples

When a chapter needs a concrete reusable workflow, prefer building on the **n8n template library** (`https://n8n.io/workflows/`) and the official courses. Workflows the book treats as canonical reference patterns:

- **The "Lead Qualification Engine"** — the course capstone. Typeform → enrich → AI score → draft email → Slack approval (human-in-the-loop) → CRM write + Sheet append → Error Trigger fallback. Touched by Ch. 14 (approvals), Ch. 15 (errors), Ch. 16 (orchestration).
- **The "Personal Daily Briefing Bot"** — the course showcase. Schedule → multi-source fan-out (RSS + Calendar + Weather) → AI Agent composition → Gmail send. Touched by Ch. 4 (first win), Ch. 9 (AI integration).
- **The "Invoice-to-Ledger Pipeline"** — Gmail Trigger + Extract From File + Information Extractor + Sheet/Xero write. Touched by Ch. 9, Ch. 11 (data manipulation), Ch. 12 (loops over many invoices).
- **The "Ticket Triage with Routing"** — webhook from helpdesk + Text Classifier + Sentiment + IF/Switch routing + Slack channel post. Touched by Ch. 9, Ch. 13.
- **The "Meeting-Notes Action Item Extractor"** — Drive Trigger + AI Agent + Linear write + Slack confirm. Touched by Ch. 9, Ch. 24 (ops chapter).

These five are the spine. Most other examples in the book should be small variants on one of them — same shape, different department.

---

## The architecture diagram

The book's backbone diagram (in `assets/`, source in the project root) shows:

```
Trigger → Workflow (Nodes + Connections) → Connected Apps
              ↑                                   ↓
              └────── Data flow (JSON items) ─────┘
```

- **Triggers** start an execution: a Schedule, a Webhook, an app event (new email, new row in Sheet, new Typeform submission), or a manual run from the editor.
- **Workflows** are the canvas: a directed graph of **Nodes** connected by lines that represent **data flow**. Each node receives data from upstream, does one thing (transform, branch, write to an app, call an AI), and passes output downstream.
- **Connected Apps** are the systems the workflow reads from and writes to — Gmail, Slack, Sheets, HubSpot, Stripe, your database, an external API via HTTP Request. n8n connects via **built-in app nodes** (650+ integrations) or the **HTTP Request node** for anything else. Authentication is handled once via **Credentials**, reused across workflows.
- **Data flows as items** — every node receives an array of JSON items, processes them, and emits an array of JSON items. The whole book turns on understanding this: workflows are *not* about "if this then that" — they're about *items flowing through a pipeline*.

This is the **single mental model** the whole book builds on. Refer back to it any time you introduce a new concept — say which box of the diagram you're zooming into. Two recurring framings to watch for and correct in drafts: (a) *"n8n is like Zapier but free"* — wrong, n8n is a *workflow engine* with first-class data manipulation, branching, looping, and AI-native nodes; Zapier is a linear if-this-then-that runner; (b) *"the workflow is the code"* — close, but the workflow is the **graph of intent**; the data flowing through it is what makes it work or fail.

Use this diagram explicitly when introducing:
- **Nodes & connections** (Ch. 1)
- **The execution model** (Ch. 2) — manual run vs production trigger vs partial execution
- **The data structure** (Ch. 6) — items, arrays, JSON
- **Branching and merging** (Ch. 13)
- **Sub-workflows** (Ch. 25) — when one workflow calls another, it's a nested instance of the diagram

---

## Writing rules

Modeled on [Learn Harness Engineering](https://github.com/walkinglabs/learn-harness-engineering) — read a lecture from that repo before drafting a chapter here to calibrate.

**File layout**
- One chapter per folder under `docs/en/<part>/chapter-NN-slug/index.md`. Optional `code/` subfolder for runnable workflow JSON exports (the file you'd Import into n8n).
- Kebab-case slugs derived from the chapter title (e.g. `chapter-09-integrating-ai-into-a-workflow/`).
- The site is rendered with **VitePress**, structured for multilingual translation (`en/`, eventually `zh/`, `ms/`).

**Chapter titling**
- **Conceptual chapters get question titles** ("Why does data flow as items?", "When should you split a workflow into sub-workflows?"). The question creates intrigue and frames the chapter as an investigation.
- **Setup, reference, and workflow chapters use declarative titles** ("Installing n8n", "For Business Development and Sales").

**Length**
- **Target 2,000–2,500 words per chapter.** Long enough to be useful; short enough to read in one sitting. If a chapter starts blowing past 3,000, split it.

**Chapter shape (every chapter follows this)**
1. **Opening hook** — a relatable scenario in 2–4 sentences, ending on a counterintuitive premise. Direct second-person ("You're staring at…"). Do *not* open with a definition.
2. **Body**: 4–7 named sections with `##` headings. Lead with concrete workflow examples, then generalise. Use metaphors (assembly line, restaurant kitchen, mail-sorting belt). Quote real numbers and real sources where you can (response-time stats, automation ROI studies). Weave external links **inline** at the point they're relevant — do not save them for a "Further Reading" block at the end.
3. **Wrap-up** — pick the form that serves the chapter, don't default to bullets:
   - *The takeaway* — 3–5 bullets, one tight sentence each. Best for conceptual chapters.
   - *A recap in one paragraph* — prose. Best for narrative/workflow chapters where bullets would feel mechanical.
   - *A checklist* — items the reader should now have done. Best for setup chapters.
4. **Try it yourself** — **1–3 hands-on exercises**, count chosen by the chapter (a setup chapter may only need one; an advanced chapter may want three escalating ones). Each exercise includes a "You'll know it worked when…" success criterion. No forced easy/medium/hard grading — only grade them when the chapter actually has three.
5. **What's next** *(optional)* — one line pointing to the natural follow-up chapter, only when there's a real dependency. Skip it on chapters that don't need it; do not pad.

**Voice**
- Conversational yet authoritative. Direct address ("you"). Active voice. Short sentences.
- Casual asides are welcome where they help ("I'm not joking", "skip this if you've already wired up a webhook before").
- No marketing speak. No "unleash". No emojis in chapter content.
- It's okay — encouraged — to show the workflow failing, getting redirected, getting it wrong the first time. The book is about *building reliable plumbing*, not selling magic.

**Concrete content rules**
- **Lead with a scenario, not a definition.** Definitions go in the glossary; chapters teach through situations.
- **Workflow JSON is copy-pasteable.** Annotate non-obvious node settings inline. Where a chapter ships a runnable workflow, the JSON lives in `code/` and the chapter says *"Import this into your n8n instance and follow along."*
- **Screenshots and GIFs** live in `assets/` and are referenced relatively. Prefer GIFs for "this is what it looks like when it executes." Annotate screenshots; an unannotated n8n canvas screenshot is useless to a new reader who doesn't know where to look.
- **Cite real numbers** when you have them (executions per day, AI cost per task, time saved per workflow). Vague claims weaken the book. The McKinsey/Gartner/HBR numbers in the course outline are good defaults.
- **"In other tools" callout**: every chapter that teaches an n8n-specific feature includes a short note on Zapier / Make / Power Automate equivalents, or explicitly says none exists.
- **Ground in the n8n docs.** When introducing a node, link to its docs page on `docs.n8n.io`. When describing the data model, link to `docs.n8n.io/data/data-structure/`. Do not paraphrase the docs at length — link and add the *teaching* layer the docs lack.

**Files you should not create**
- No `.md` files outside `docs/`, `assets/`, `examples/`.
- No planning docs, decision logs, or "summary.md" files unless the user explicitly asks.

---

## Working norms for the agent (you)

- This repo will be **published on GitHub** as a free open-source resource. Treat every file as something strangers will read.
- **Never commit or push** on this project without explicit, in-the-moment user confirmation. Staging changes is fine; running `git commit` or `git push` is not — even when the user has approved several commits earlier in the same session, treat the next one as needing fresh approval. When work is ready, *show the diff and ask*, don't act. The user deploys manually; when deployment is needed, provide the commands.
- **Commit messages are short** (one line). No `Co-Authored-By` trailer, no "Generated with Claude Code" trailer — the user has asked to skip those to save tokens.
- When the user asks for a new chapter, **draft an outline first** and confirm before writing the full chapter. Chapters are expensive to rewrite once they exist.
- When in doubt about a tool's current behaviour (a new n8n node, a Zapier feature, an AI provider's pricing), **verify with WebSearch or WebFetch** rather than relying on memory — this space changes fast. The n8n docs at `docs.n8n.io` are the canonical source for anything n8n-specific.
- Diagrams: prefer **Mermaid** for anything embedded in Markdown so it renders on GitHub Pages without an image pipeline. Reserve raster images for screenshots of the n8n canvas and the hero architecture diagram.
- **Workflow JSON exports**: when a chapter ships a runnable workflow, include the JSON in `code/<chapter-slug>/workflow.json`. Sanitise — strip credentials, IDs, and personal data. Include a `README.md` in the folder explaining what the workflow does, what credentials the reader needs, and what to expect when they execute it.

---

## Writing principle: "don't intimidate — start small, advanced is opt-in"

A new reader who looks at the full TOC will see *sub-workflows, error handlers, queueing, custom code, self-hosted Docker deployments, multi-step AI agents with vector stores* and reasonably conclude *"I have to learn all of this before I can use n8n."* That conclusion is wrong, and the book must actively counter it everywhere it could form.

**The shape of competence we're teaching is:**

```
Start with: pick a trigger → one action → run it once
Add over time, only when pulled: branching, loops, AI nodes,
                                 error handling, sub-workflows,
                                 self-hosting, queueing…
```

You grow into advanced patterns *when a real workflow makes you wish you had them*, not before. The book is a reference, not a textbook you have to finish first.

**When writing any chapter that introduces an advanced pattern** (Ch. 13 branching, Ch. 14 loops/batching, Ch. 15 error handling, Ch. 25 sub-workflows, Ch. 26 self-hosting, anything in Part VI):

- Open with a *"you need this when…"* trigger that names the concrete pain that makes the pattern worth learning. Example: *"You'll know you want a sub-workflow the day your main canvas has 60 nodes and you can't find the one that's failing."*
- Explicitly say: *"You do not need this on day one."* / *"Skip this chapter until [the trigger] is true for you."*
- Don't lead with the cool-factor or the technical complexity. Lead with the pain it solves.

**When writing for non-technical readers** in particular, take extra care not to plant the "I need to learn N hard things first" worry. A Part V audience chapter should be readable as a complete unit, even by a reader who has never opened Part III.

Avoid language that implies prerequisite knowledge: *"now that you understand expressions…"*, *"as we covered in Ch. 11…"*. Make every chapter survivable by a reader who hasn't read the others.

---

## Working principle: "equip first, then engage"

**Before starting any workflow, audit what built-in nodes, templates, and credentials already exist for the apps involved. Wire them up *first*. Only then begin building.**

This is a behaviour change the book asks of every reader. The old reflex: *"OK, new automation — let me start dragging nodes onto the canvas."* The new reflex: *"OK, new automation — what apps are involved? Are there built-in nodes? Are there community templates I can fork? Have I set up the credentials? Are there sample workflows on n8n.io for this shape?"*

Why it matters:
- A workflow built from scratch against an app you've never integrated produces lower-quality work than a workflow forked from a battle-tested template. The built-in node packages up *how* to authenticate and call the API; the template packages up *how a working team does it end-to-end*.
- Pre-equipping is a one-time cost that pays out across every future workflow in that domain — set up your HubSpot credential once, use it across every sales workflow forever.
- It is also a *discovery loop*: searching `n8n.io/workflows/` for *"lead qualification"* before building one saves you from inventing what someone has already debugged.

Sources of pre-built equipment to look for, in order:
1. **Your own existing workflows** in the same n8n instance — sub-workflow them if reusable
2. **Built-in app nodes** in the n8n nodes panel — almost always there for major SaaS (650+ integrations)
3. **The official n8n template library** at `n8n.io/workflows/` — vetted, tagged by use case
4. **Community templates** linked from the same library — variable quality, read the JSON before importing
5. **The n8n community forum** (`community.n8n.io`) for "has anyone done X" questions
6. **If nothing exists, build it from primitives** — HTTP Request, Set, IF, Code — and contribute back to the template library

When you write a chapter that introduces a new app or workflow shape, the first paragraph of the *workflow* should follow this reflex: "first, equip — does the n8n nodes panel already have this app? Is there a template for this shape? Are my credentials set up?" Don't show readers diving into a workflow without equipping; that trains the wrong reflex.

When you write about a workflow that calls for an integration the reader doesn't yet have, the language should be **"add the X credential"** or **"drag the X node onto the canvas"** — not "configure the X API" or "set up the X integration" (which suggest manual technical work).

---

## Meta-thesis: "if you can think about a workflow, it can be automated with n8n"

The book's single most important promise to non-technical readers is: **you do not need to write code, write configuration files, or understand REST APIs to build production-grade automations.** The visual canvas, the 650+ built-in nodes, the AI-native nodes for parsing unstructured data, and the template library do almost all of the technical lifting *for* you, if you just describe the workflow you want.

This must be a live thread throughout the book — not a single chapter mentioning it once, but a reminder at every point where a non-technical reader might otherwise think *"oh, this requires coding, I'll bounce."* Concretely:

- **Authentication** (Ch. 3, Ch. 12) — the reader does **not** read API documentation or generate signed tokens by hand. They click "Connect", complete an OAuth flow, and n8n stores the credential. Re-used everywhere.
- **Data transformation** (Ch. 6, Ch. 7) — the reader does **not** write JSON manually. They use the **Set node** with the drag-and-drop expression editor, or the **Edit Fields** UI. When something more advanced is needed, they reach for the **AI Transform** node which writes the JavaScript for them from a plain-English description.
- **Branching logic** (Ch. 8) — the reader does **not** write `if/else` code. They use the **IF** and **Switch** nodes with dropdown comparisons.
- **AI integration** (Ch. 9) — the reader does **not** call APIs. They drag the **AI Agent** node, pick a model, type a system prompt in English, and connect inputs.
- **Webhooks** (Ch. 12) — the reader does **not** set up a server. They drop the **Webhook** node, n8n gives them a URL, they paste it into the third-party app.
- **Error handling** (Ch. 15) — the reader does **not** write try/catch logic. They add an **Error Trigger** workflow and connect it to whatever they want to do on failure.

**Language to use when a non-technical reader might balk**:
- *"You don't write this code yourself — the node does it."*
- *"Describe the data transformation you want; the AI Transform node writes the JavaScript."*
- *"You don't need to know what JSON looks like — you can point at fields visually."*

**Code-talk audit rules for non-engineering chapters (Part V Ch. 22, 23, 24; parts of Ch. 11, 16)**:
- Don't use unexplained engineering jargon: `cron`, `polling`, `idempotency`, `OAuth2 client credentials grant`, `Bearer token`, `payload`, `cURL`, `pagination`, `rate limit headers`. If the concept matters, name it in plain English and parenthesize the technical term once.
- Frame technical concepts as **things n8n handles for you, not things the reader configures**. "n8n authenticates automatically once you connect the account" beats "you'll configure OAuth2 with client_id and client_secret".
- Never imply the reader is the one writing code unless the chapter is explicitly for technical readers (Ch. 10 on the Code node is the only place this is appropriate).
- "Inspecting a workflow's output" applies to **any** node's output (a Slack message, a Sheet row, an email draft, an AI classification) — not just code. The "data" pane is for everyone.

---

## Thesis nuance: "skip the manual work, keep the systems"

The Ch. 5 thesis is **not** anti-software. Be careful in any chapter that touches this idea:

- **Keep**: the systems of record themselves — Gmail, Slack, HubSpot, Stripe, QuickBooks, your CRM, your spreadsheet. These exist for good reasons: shared state, persistence, real-time collaboration, customer-facing UX, things that must run when you're not at your computer.
- **Skip**: the **manual work between them** — the copy-paste from Gmail into HubSpot, the daily export from Stripe into a Sheet, the Slack ping you send yourself every morning to remember to check the dashboard, the 40 minutes spent triaging your inbox by hand. A workflow engine like n8n collapses that work into a graph of intent that runs without you.
- Also **skip**: the **point-solution paid automations** layered on top of those systems — "AI Email Assistant for $30/month", "Lead Enrichment SaaS for $200/month", "Slack-to-Notion sync tool for $99/month", "AI meeting-notes app for $25/seat". A general-purpose workflow engine with built-in nodes and an AI Agent node does most of that work, against the systems you already pay for, for the cost of API tokens.

The rule of thumb: **manual copy-paste between systems → automate with n8n. Single-purpose SaaS that wraps an LLM call against a system you already own → strongly consider replacing with an n8n workflow. The systems of record themselves → keep.**

When writing, never frame this as "you don't need software anymore" or "SaaS is dead". The frame is: *"keep the systems where your data lives; eliminate the manual work and the SaaS upcharges that wrap them."*

---

## Guiding philosophy: build production, monitor closely

> **When in doubt, side with shipping, not staging forever.**

The book's stance on automation autonomy is **build for production, run real workflows against real data, add reliability when you actually need it** — not "stay in test mode until the workflow is bulletproof." Most n8n guidance online leans toward elaborate test setups, mocked data, staging instances, and weeks of refinement before activation. That keeps readers from shipping. The user's bias: *most workflows are reversible, most actions are observable in n8n's execution log, and the cost of a bad execution is almost always lower than the cost of *never shipping*.*

When you write any chapter that touches reliability, error handling, production activation, or money-handling:

1. **Ship to production by default.** Activate the workflow. Connect it to real Gmail, real HubSpot, the actual CRM. That's the *point* of automation, not the danger.
2. **Watch what it does.** The Executions log is your dashboard — every run, every input, every output, every error, stored for inspection. The human stays in the loop by *observing*, not by approving every execution.
3. **Stop or rollback when something's wrong.** Deactivate the workflow with one toggle. Re-run a failed execution with one click. Edit and retry. Interruption is cheap and easy in n8n; use *that*, not weeks of staging.
4. **The exception** is when the consequence is **big and irreversible**: mass customer email sends, large financial transfers, irreversible deletes, anything touching PII in regulated contexts (PDPA, GDPR). *Those* deserve explicit **Wait nodes with human-in-the-loop approval** (Ch. 14). Not everything else.

**The heuristic** is **"is this reversible? is the blast radius bounded?"** — *not* "could this be embarrassing if wrong?". An AI agent that mis-categorises 3 invoices and you re-run the workflow with a corrected prompt is reversible. A workflow that sends 5,000 customers a wrong renewal notice isn't.

**Language to use:** *"ship and watch"*, *"production is the only real test"*, *"build, monitor, iterate"*.
**Language to avoid:** *"thoroughly test before activation"*, *"never connect to production until…"*, *"if anything could go wrong → don't ship"*, and similar default-restrictive framings.

This applies to the anti-patterns chapter too: **the anti-pattern is over-staging** (treating every workflow like it might detonate) and **under-monitoring** (activate-and-forget), *not* "workflow does too much".

---

## Things to actively avoid

- **"Just automate it"** as advice. Every section should show the *how* — which trigger, which nodes, which credentials, which data shape — not the *whether*.
- **Pretending workflows are magic.** Show the failures, the schema drifts, the rate-limit hits, the moments where you have to step in and fix a node. n8n's Executions log is full of red entries; that's normal and useful.
- **Single-tool tribalism.** If Make does routing more elegantly, say so. If Zapier has a built-in connector for an app n8n doesn't, say so.
- **Coding-only examples** in chapters meant for non-technical readers. Test: would a marketing manager or finance ops lead finish this chapter and know what to do tomorrow?
- **Hypothetical features.** Only document what shipped in the current n8n release and what's stable in Zapier/Make.
- **Toy examples that don't survive Monday.** "Send me a Slack when it's sunny" is a toy. "Send me a Slack when a HubSpot deal stalls more than 14 days" is a workflow. Always pick the second.

---

## Site / publishing

- Hosted on **GitHub Pages**, source = Markdown in `docs/`.
- Theme: minimal, readable, code-friendly. (To be picked — keep it boring.)
- The site URL and Pages workflow will be set up by the user; don't push or configure deployment without explicit instruction.

---

## When the user gives you a task

1. If it's "write chapter X", start with an outline (h2-level bullet list), confirm, then draft.
2. If it's "find a real workflow example for Y", check the n8n template library (`n8n.io/workflows/`) and the department-specific examples in this file before inventing one.
3. If it's "add a tool-neutrality note", check Zapier, Make, and Power Automate docs via the web before writing.
4. If it's "build a workflow JSON for chapter X", construct it referencing real n8n node names from `docs.n8n.io`. Sanitise credentials. Place in `code/<chapter-slug>/workflow.json` with a sibling `README.md`.
5. Default to **editing existing files** rather than creating new scaffolding ones.
