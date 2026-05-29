# Learn Automation Working — Project State Summary (v2)

**Purpose of this document:** complete handover from one Claude conversation to the next. Read this top-to-bottom before drafting any new chapters. The next conversation treats this file as the source of truth for all design decisions made so far.

**This is v2.** The original PROJECT-SUMMARY covered Ch. 1–11. This regeneration covers everything through Ch. 26 + INDEX v0.3 + the major framing decisions made during Ch. 12–26 drafting.

---

## Project overview

An open-source playbook companion to **Course 1 (AI Automation with n8n)** — a 4-day intensive course delivered by trainer Obaydee. The playbook is the *companion artifact* readers can consult independently of the course.

**Modeled structurally** on Course 2's playbook ["Learn Agentic Working"](https://the-good-pixel.github.io/learn-agentic-working/) (open source, MIT). My playbook is the n8n-focused equivalent.

**Target audience**: Malaysian SME ops/BD/marketing leads + technical readers. Tone: warm, technically-grounded, opinionated where useful.

**A locked framing decision (made during Ch. 22 prep):** the playbook is **independent of Course 1's capstone structure**. Course 1 has two named capstones (Personal Daily Briefing Bot, Lead Qualification Engine); the playbook treats these as *examples within role chapters*, not chapters of their own. Part V is now a pattern-survey across roles, Course-2-style, with 3–4 canonical workflow patterns per role.

---

## File inventory (as of this handover)

All in `/mnt/user-data/outputs/`:

| File | Status | Word count | Notes |
|---|---|---|---|
| `INDEX.md` v0.3 | Done | ~3,800 | 30-chapter index, six parts, four appendices. v0.3 decentred Part V from capstone-centric to pattern-survey-per-role. |
| `chapter-12.md` | Done | 2,225 | Expressions — `$json`, `$('Node Name')`, Luxon, fallbacks |
| `chapter-13.md` | Done | 2,242 | Branching — Filter / If / Switch |
| `chapter-14.md` | Done | 2,716 | Pause for a human — Send and Wait for Response, Wait node |
| `chapter-15.md` | Done | 2,570 | Errors — four-layer model |
| `chapter-16.md` | Done | 2,362 | Throughput, rate limits, AI cost control |
| `chapter-17.md` | Done | 2,739 | Shaping data — Set, Merge, Code |
| `chapter-18.md` | Done | 2,619 | Calling any API — HTTP Request, Respond to Webhook |
| `chapter-19.md` | Done | 3,116 | AI Agent — three-layer build pattern |
| `chapter-20.md` | Done | 2,758 | Purpose-built AI nodes — Classifier, Sentiment, Information Extractor |
| `chapter-21.md` | Done | 2,781 | Vector stores and RAG |
| `chapter-22.md` | Done | 1,822 | **Part V begins.** BD patterns |
| `chapter-23.md` | Done | 1,837 | CS patterns |
| `chapter-24.md` | Done | 1,980 | Finance/ops patterns |
| `chapter-25.md` | Done | 2,001 | Marketing patterns |
| `chapter-26.md` | Done | 2,112 | Personal automations — closes Part V |

**Plus, from the prior conversation (uploaded but not in `/outputs/`):** `CLAUDE.md`, `README.md`, `course1-outline.md`, `course2-outline.md`, `chapter-10.md`, `chapter-11.md`. Earlier chapters (Ch. 1–9) exist as drafts from prior conversations but are not currently on disk.

**Total drafted: Ch. 1–26 + INDEX + CLAUDE.md + README. ~26 chapters of 30.** Part VI (Ch. 27–32) and the four appendices remain.

---

## CRITICAL: canonical sources rule (carried forward, still in force)

> **For any walkthrough, parameter name, menu path, or recommendation, `github.com/n8n-io/n8n-docs` (the `main` branch) — or its rendered counterpart `docs.n8n.io` — is the only authoritative source. Secondary sources (blog posts, YouTube tutorials, Medium articles) are used only as supplements, never as the primary source for *how* something works.**

**Pattern**: before drafting any chapter that involves specific node configurations, fetch the relevant docs page from the GitHub repo or rendered docs site. URLs follow the shape `https://docs.n8n.io/integrations/builtin/{category}/{node}/` for rendered docs and `https://github.com/n8n-io/n8n-docs/blob/main/docs/integrations/builtin/{category}/{node}.md` for repo source.

Vendor docs (HubSpot, Slack, Google, OpenAI, Anthropic) and self-hosting tutorials (Render, Hostinger) are useful for *vendor-side* UI paths but **n8n-docs governs n8n-side configuration and recommendations**.

---

## Critical correction history (everything that's been canonically corrected)

These are findings where the canonical docs contradicted what secondary sources were teaching. **Do not regress on any of these.**

### Ch. 8 corrections (from prior conversation)

1. **HubSpot**: canonical n8n-docs still teaches **Private Apps via Settings → Integrations → Private Apps**. Service Keys are an evolving HubSpot mechanism; either token type pastes into n8n's *HubSpot App Token* credential.
2. **Slack**: canonical n8n-docs recommends **OAuth2 for the Slack node**; token path is required for Slack Trigger node and simpler but not n8n's recommendation.
3. **`N8N_BASIC_AUTH_*` env vars in Ch. 6** — correctly flagged as deprecated; modern n8n uses in-app user management.

### Ch. 14 corrections (during Ch. 14 drafting)

The "*Send and Wait for Approval*" framing was substantially restructured mid-chapter after canonical verification:

1. **Operation names differ across nodes.** *Send and Wait for Response* is the canonical primitive on **Slack, Telegram, Send Email, Discord, WhatsApp Business Cloud**, and the **LangChain Chat node**. **Gmail is the outlier** — uses *Send and Wait for Approval* (Approval-only type, but gains button-styling options the others don't have).
2. **Three response types** exist on most channels: *Approval* (default — Approve/Disapprove buttons), *Free Text* (n8n-hosted form for typed response), *Custom Form* (multi-field structured input). Gmail offers Approval only.
3. **Slack requires *Interactivity & Shortcuts* enabled** in the Slack app config — a real first-time setup gotcha.
4. **Telegram returns minimal output payload** (`{ "data": { "approved": true } }`, no `message_id`/`chat_id`). If you need to delete the prompt message after approval, use Slack instead.

### Ch. 19 finding (modern AI Agent is unified)

> Prior to n8n v1.82.0, the AI Agent had a setting for picking between agent types (Tools Agent, ReAct Agent, Plan and Execute, Conversational, OpenAI Functions). **This setting is gone.** The current node is unified, behaving as what was previously called the Tools Agent.

If a 2024 tutorial tells you to pick an agent type, the screenshots are out of date. **Do not teach the historical multi-type model.**

### Other corrections

- **Memory sub-node**: now called **Simple Memory**; previously called *Window Buffer Memory*. Same behaviour. Old templates use the old name.
- **`$fromAI()`** is the modern way for LLMs to populate tool parameters dynamically. Signature: `$fromAI(key, description, type, defaultValue?)`. Click the AI button in any tool parameter field; n8n pre-fills the expression.
- **Retry On Fail caps**: 5 attempts max, 5000ms between tries max. Both hard caps. Set 10/30000 in the UI and the values silently revert. For aggressive retry policies, build a manual retry loop (Ch. 16's escape hatch).

---

## Locked framing decisions (these do not get re-litigated)

### Word target: 1,800–2,500 per chapter

- **Hard upper preference: 2,500.** Overages allowed when justified (reference-heavy chapters, multi-node coverage).
- **Empirical reality:** Part III chapters ran 2,200–3,100 (some genuinely earned overage, some didn't). Part V chapters held discipline at 1,820–2,110 thanks to the pattern-survey shape.
- **The user explicitly noted in Ch. 22 conversation**: be more mindful of word limits. Pattern-survey structure naturally produces tighter chapters.

### Chapter structure (locked)

Every chapter:
1. YAML front matter
2. Cold open — second person, no named characters, scenario-driven
3. Body sections (varies by chapter type)
4. **Takeaway** — bullet list of crisp facts, not closing prose
5. **Try it yourself** — runnable exercise with "You'll know it worked when..." criterion
6. **What's next** — one paragraph, forward-looking, names the next chapter's substance

Per-chapter "design rationale" goes in the conversational response, NOT in the chapter itself.

### Voice rules (locked, from CLAUDE.md)

- No throat-clearing ("Let's dive in", "In this chapter we will explore...")
- No named characters in cold opens (Aisyah was an early mistake — reverted)
- Opinions welcome where defensible
- Malaysian RM prices for SaaS examples (not USD conversions where local context matters)
- "In other tools" callouts when they add value; Ch. 3 owns the full comparison
- No emojis in body content
- Inline external links at point of relevance (not "Further Reading" blocks)
- Pricing always says "at time of writing" with link to vendor pricing page

### Part V framing (locked via INDEX v0.3)

Pattern-survey-per-role, **not** capstone-centric. Each Part V chapter:

- Surveys **3–4 canonical workflow patterns** for that role
- Each pattern gets ~250 words: what it does, the node chain (in pseudocode), what to watch out for
- **One** pattern chosen for the full Try-It-Yourself walkthrough
- Patterns balance reactive vs proactive where natural (most chapters 2-2; Ch. 26 explicitly 1-3 because personal automation is naturally more reactive)

Course 1's capstones (Lead Qualification Engine, Personal Daily Briefing Bot) appear as worked examples *within* role chapters, not as their own chapter. The decision was made deliberately during Ch. 22 prep — the playbook is the open companion to the course, not the course in textbook form.

### Three throughlines (still in force)

1. **"If you can think a workflow through, you can build it in n8n"** — non-technical reader meta-thesis
2. **"Equip first, then engage"** — verbatim from Course 2, retargeted to nodes/credentials/templates
3. **"Ship and watch"** — n8n-native version of "monitor, don't block"

These should feel present in every chapter.

---

## Part-by-part status

### Part I — Foundations (Ch. 1–5) — COMPLETE (prior conversation)
1. What changes when you stop doing it by hand
2. How does a workflow actually run (+ hero SVG)
3. What's the automation landscape (+ decision tables)
4. A 10-minute first win
5. Do you still need that AI tool

### Part II — Setup once (Ch. 6–9) — COMPLETE (prior conversation)
6. Installing n8n — Cloud / Render / Hostinger / Docker
7. How much should you trust a workflow
8. Setting up your first credentials — corrected
9. Workspace setup

### Part III — Building real workflows (Ch. 10–18) — COMPLETE
10. Triggers
11. Items (the conceptual spine of the book)
12. Expressions
13. Branching (Filter/If/Switch)
14. Pause for a human (Send and Wait + Wait node) — corrected
15. Errors (four-layer model)
16. Throughput, rate limits, AI cost control
17. Shaping data (Set + Merge + Code) — new insertion in INDEX v0.2
18. Calling any API (HTTP Request + Respond to Webhook) — new insertion in INDEX v0.2

### Part IV — Adding AI (Ch. 19–21) — COMPLETE
19. AI Agent + three-layer build pattern (highest staleness risk; canonical-verified)
20. Purpose-built AI nodes (Classifier, Sentiment, Information Extractor)
21. Vector stores and RAG

### Part V — Workflows by role (Ch. 22–26) — COMPLETE
22. For business development — 4 patterns
23. For customer success — 4 patterns
24. For finance and ops — 4 patterns
25. For marketing — 4 patterns
26. Personal automations — 4 patterns, closes Part V

### Part VI — Going further (Ch. 27–32) — NOT STARTED
27. Sub-workflows: keeping the canvas readable
28. Self-hosting at depth (Docker, queue mode, PDPA case)
29. Connecting to a database and writing real records (Postgres/Supabase)
30. Scheduling, queueing, and running at scale
31. Custom code: advanced patterns
32. What we got wrong, and what's next (closing chapter)

### Appendices A–D — NOT STARTED

- A: Glossary
- B: Reference workflow library (**expanded to 10 workflows in INDEX v0.3** — two per Part V role)
- C: Credentials cheat sheet
- D: Further reading

---

## Active patch flags (deferred items, do not block Ch. 27+)

Three content additions in already-drafted chapters that should be revisited on a future QA pass. None blocks forward progress.

### Ch. 6 patch flag
Add a "production env vars" section covering `WEBHOOK_URL`, `GENERIC_TIMEZONE`, `N8N_ENCRYPTION_KEY`. **Ch. 14's production-traps section forward-references this** ("`$execution.resumeUrl` returning `localhost` on self-hosted"). If Ch. 6 doesn't cover `WEBHOOK_URL`, the forward-reference is broken.

### Ch. 8 patch flag
Add a generic-doctrine section — how OAuth2 credentials work in n8n, how API key credentials work, the difference between service-level and user-level credentials, shared credentials in Projects — separate from the four specific walkthroughs (Gmail/Slack/Sheets/HubSpot). Without it, readers hit a wall the moment they need Notion, Stripe, or any service outside the four named.

### Ch. 9 patch flag
Add a node-naming convention sub-section. Ch. 12's `$('Node Name')` accessor relies on stable, drag-and-drop-safe node names. Drag-and-drop is the recommended habit; explicit naming-convention guidance is cheap insurance.

---

## Critical prep notes for Part VI

### Ch. 27 (Sub-workflows) prep

Canonical docs to fetch before drafting:
- `docs.n8n.io/flow-logic/subworkflows/`
- `docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/`
- `docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflowtrigger/`

Key things to cover (from INDEX v0.3 scope):
- Execute Sub-workflow node + Execute Workflow Trigger node
- Reusability pattern (one shared sub-workflow used by many parents)
- Team-scale ownership (different team members own different sub-workflows)
- **The n8n v2.0 sub-workflow + wait behaviour** that Ch. 14 explicitly forward-referenced — v2.0 fixed a bug where `Execute Sub-workflow` with "Wait for Sub-workflow Completion" enabled would not actually wait if the sub-workflow contained a Wait node. Verify this is still the canonical position before drafting.

### Ch. 28 (Self-hosting at depth) prep
- `docs.n8n.io/hosting/scaling/queue-mode/`
- Worker setup, Redis requirements, task runners
- Postgres production tuning, connection pooling, retention env vars
- Backup strategies for `n8n_data` volumes

### Ch. 29 (Database operations) prep
- Postgres node + Supabase Postgres credential
- Read-only credentials, scoped writes, audit-trail discipline
- Treat n8n as orchestration layer over real systems of record

### Ch. 30 (Scheduling and scale) prep
- n8n Cloud concurrency limits
- When self-hosting pays off
- Cost modelling for 10/day vs 10,000/day execution scale

### Ch. 31 (Advanced Code patterns) prep
- Streaming responses
- Structured retry logic
- Custom error objects
- **AI Transform node** (mentioned in INDEX scope) — describe-what-you-want-get-JavaScript alternative. Verify current docs status before introducing.

### Ch. 32 (Closing chapter) prep
- Anti-patterns the author has seen/committed
- What's coming in n8n (MCP integration, agentic workflows, native AI evaluation)
- What this book will get wrong as tools change

---

## Two judgment calls (carried forward, still valid)

1. **Ch. 8 doesn't cover OpenAI/Anthropic credentials** — they were deferred to Ch. 19 where they belong with the AI nodes that use them. **Confirmed delivered**: Ch. 19 covers OpenAI / Anthropic / Google Gemini credential setup.

2. **Ch. 9 introduces the "at-least-two-owners rule"** for team workflow ownership — n8n-specific addition not present in Course 2.

---

## User feedback patterns observed

The user has been consistent on:
- **Tables welcome even if over word limit** (Ch. 3 set precedent; held in Ch. 13, 14, 15, 17, 20)
- **Judgment calls should be explicit at the end of each chapter** (in the conversational response, not the chapter)
- **Canonical sources only** (Ch. 8, Ch. 14, Ch. 19 all corrected mid-draft based on canonical verification)
- **Concrete pricing with "at time of writing"** + link to vendor pricing page
- **Glaring staleness must be flagged AND fixed** — not just flagged
- **Word discipline matters** — flagged after Ch. 17/19/20/21 ran heavy; Part V holding band cleanly
- **Decentre from capstones, focus on multiple workflows** — the major framing decision in the Part V transition

---

## Resume instructions for next conversation

1. **Read this file in full** before doing anything else.
2. **Read `INDEX.md`** as the structural source of truth.
3. **Read 1–2 recent chapters** for voice/pacing reference. Best choices: `chapter-25.md` and `chapter-26.md` (the freshest examples of the locked pattern-survey shape) or `chapter-19.md` and `chapter-21.md` (the most recent Part IV examples if Ch. 27's complexity profile is closer to those).
4. **Continue with Ch. 27 (Sub-workflows)** unless the user asks otherwise.
5. **Apply the canonical-docs-first rule unconditionally** — before each chapter, fetch the relevant docs.n8n.io pages.
6. **Word target is 1,800–2,500 per chapter** — overages are allowed with explicit justification, but Part V's discipline (1,820–2,110) showed that overage is usually a sign to trim.
7. **Each chapter ends with**: takeaway (bullets) → try-it-yourself (with "you'll know it worked when" criterion) → what's next. Design rationale lives in the conversational response, not the chapter.

---

## Canonical n8n docs URLs (for fast lookup)

- Repo root: `https://github.com/n8n-io/n8n-docs`
- Rendered docs: `https://docs.n8n.io/`
- Credentials: `docs/integrations/builtin/credentials/{node}.md`
- Core nodes: `docs/integrations/builtin/core-nodes/n8n-nodes-base.{node}.md`
- App nodes: `docs/integrations/builtin/app-nodes/n8n-nodes-base.{node}.md`
- Trigger nodes: `docs/integrations/builtin/trigger-nodes/n8n-nodes-base.{node}trigger.md`
- AI cluster nodes: `docs/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.{node}.md`
- AI sub-nodes: `docs/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.{node}.md`
- Data structure (Ch. 11 source of truth): `docs/data/data-structure.md`
- Item linking: `docs/data/data-mapping/data-item-linking/`
- Expressions: `docs/data/expressions/`
- Hosting: `docs/hosting/`
- Flow logic (sub-workflows, error handling): `docs/flow-logic/`

Live URLs (rendered): replace `github.com/n8n-io/n8n-docs/blob/main/docs/` with `docs.n8n.io/` and strip the `.md` extension.

---

## File handoff list for next conversation

The minimum-viable file set for the next conversation:

1. **`PROJECT-SUMMARY.md`** (this file) — read first, full
2. **`INDEX.md`** v0.3 — structural source of truth
3. **`CLAUDE.md`** — original instructions, voice/format rules
4. **`chapter-25.md` and `chapter-26.md`** — voice/pacing reference for Part V style (and Ch. 27 will continue this discipline at the start of Part VI)

Optionally helpful if context budget allows:
- `chapter-19.md` for AI-cluster-node pacing if Ch. 31 (advanced Code) comes up
- `chapter-14.md` for the verified Send-and-Wait patterns if Ch. 27 needs to cross-reference

---

*Last updated: end of conversation containing Chapters 12–26 and INDEX v0.3. Next conversation begins with Ch. 27 (Sub-workflows), opening Part VI.*
