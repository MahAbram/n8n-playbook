# Learn Automation Working — Project State Summary

**Purpose of this document:** complete handover from one Claude conversation to the next. Read this top-to-bottom before drafting any new chapters. The next conversation should treat this file as the source of truth for all design decisions made so far.

---

## Project overview

An open-source playbook companion to **Course 1 (AI Automation with n8n)** — a 4-day intensive course delivered by trainer Obaydee. The playbook is the *companion artifact* readers can consult independently of the course.

**Modeled structurally** on Course 2's playbook ["Learn Agentic Working"](https://the-good-pixel.github.io/learn-agentic-working/) by the-good-pixel (open source, MIT). My playbook is the n8n-focused equivalent.

**Target audience**: Malaysian SME ops/BD/marketing leads + technical readers. Tone: warm, technically-grounded, opinionated where useful.

**Course 1 structure** (the source curriculum):
- 6 modules, 32 hours
- Capstone: Lead Qualification Engine
- Showcase: Personal Daily Briefing Bot
- Course IP is TL-proprietary; the playbook is the *open* companion

---

## Files produced (as of this handover)

All in `/mnt/user-data/outputs/`:

| File | Status | Word count | Notes |
|---|---|---|---|
| `CLAUDE.md` | Done | ~5,000 | Authoring guide — full transposition of Course 2's CLAUDE.md, retargeted to n8n |
| `INDEX.md` | Done | 3,037 | 31-chapter TOC, 4 appendices, 6 parts |
| `README.md` | Done | 977 | Homepage: 3 throughlines, 4 reading paths |
| `architecture-diagram.svg` | Done | n/a | Hero SVG: Trigger → Workflow → Connected Apps + Executions log, light/dark mode |
| `chapter-01.md` | Done | 2,220 | "What changes when you stop doing it by hand" |
| `chapter-02.md` | Done | 2,472 | "How does a workflow actually run" — references the hero SVG |
| `chapter-03.md` | Done | 3,049 | Landscape: n8n / Zapier / Make / Power Automate, **WITH decision tables at end** (user explicitly requested even though over word target) |
| `chapter-04.md` | Done | 2,103 | First win — Schedule → Calendar → Gmail on n8n Cloud |
| `chapter-05.md` | Done | 2,564 | "Do you still need that AI tool" — two thesis layers (skip manual + skip AI wrappers) |
| `chapter-06.md` | Done | 2,442 | Install: Cloud / Render / Hostinger / Pure Docker — all commands verified canonical |
| `chapter-07.md` | Done | 2,455 | Trust posture: ship-and-watch, reversibility heuristic |
| `chapter-08.md` | **Done — CORRECTED** | 2,925 | Credentials. **See "Critical correction history" below.** |
| `chapter-09.md` | Done | 2,374 | Workspace hygiene: Projects / Folders / Tags / Executions |
| `chapter-10.md` | Done | 2,682 | Triggers: Schedule / Webhook / App Event |
| `chapter-11.md` | Done | 2,679 | **The single most important conceptual chapter** — items, JSON, `$json`, Run-Once-For-All vs Run-Once-For-Each, item linking, binary data |

**Total drafted: 11 chapters + index + readme + CLAUDE.md + 1 SVG.**

---

## CRITICAL: canonical sources rule

Established mid-project after I shipped incorrect HubSpot and Slack guidance based on third-party blog sources:

> **For any walkthrough, parameter name, menu path, or recommendation, `github.com/n8n-io/n8n-docs` (the `main` branch) is the only authoritative source. Secondary sources (blog posts, YouTube tutorials, Medium articles) are used only as supplements — never as the primary source for *how* something works.**

**Pattern to follow**: before drafting any chapter that involves specific node configurations, fetch the relevant `docs/integrations/builtin/...` page from the GitHub repo. URLs follow the shape `https://github.com/n8n-io/n8n-docs/blob/main/docs/integrations/builtin/credentials/{node}.md` or `.../core-nodes/n8n-nodes-base.{node}.md`.

Vendor docs (HubSpot, Slack, Google) and Hostinger/Render tutorials are useful for *vendor-side* UI paths but **n8n-docs governs n8n-side configuration and recommendations**.

---

## Critical correction history

### Ch. 8 corrections (made and shipped — current version reflects them)

Earlier drafts got two things wrong by trusting non-canonical sources:

1. **HubSpot**: First draft said "Service Keys are the current recommendation; Private Apps moved to legacy status." **Wrong.** Canonical n8n-docs still teaches **Private Apps via Settings → Integrations → Private Apps**. Service Keys are an evolving HubSpot mechanism rolling out in newer accounts; either token type pastes into n8n's *HubSpot App Token* credential. Current Ch. 8 reflects this.

2. **Slack**: First draft said the token path was the recommended default. **Wrong.** Canonical n8n-docs recommends **OAuth2 for the Slack node**; token path is *required* for Slack Trigger node and simpler operationally but not n8n's recommendation. Current Ch. 8 reflects this.

3. **`N8N_BASIC_AUTH_*` env vars in Ch. 6** — correctly flagged as deprecated (modern n8n uses in-app user management).

**Going forward**: never trust a secondary source for what something "should" be without verifying against `github.com/n8n-io/n8n-docs`.

---

## Voice and format rules (locked)

- **Word target**: 2,000–2,500 per chapter. Reference-heavy chapters can exceed when justified (Ch. 3, 8 went over with the user's explicit approval).
- **Chapter structure**: Cold open scenario → body sections → takeaway → try-it-yourself → what's next
- **"In other tools" callouts** for n8n-specific features (compare to Zapier / Make / Power Automate)
- **Real workflow examples only** — "would an ops lead at a 50-person Malaysian SME ship this on Monday?"
- **Pricing always says "at time of writing"** with link to vendor pricing page
- **Inline external links** at point of relevance (not "Further Reading" blocks)
- **Decision tables welcomed** even if they push past word limit (Ch. 3 set this precedent)
- **Diagrams**: Mermaid inline + SVG hero diagrams; the 5-box Trigger→Workflow→Data→Apps→You is the spine
- **No emojis** in book content
- **Malaysian RM prices** used for SaaS examples (not USD conversions)

---

## The three throughlines (the book's spine)

1. **"If you can think a workflow through, you can build it in n8n"** — meta-thesis for non-technical readers
2. **"Equip first, then engage"** — verbatim from Course 2, retargeted to nodes/credentials/templates. Means: before building, check templates and credentials.
3. **"Ship and watch"** — n8n-native version of Course 2's "monitor, don't block." Means: activate workflows against real data, watch the Executions log, intervene when wrong.

These three should feel present in every chapter — Ch. 11 paid off throughline 1 explicitly; Ch. 7 paid off throughline 3; throughline 2 lives in Ch. 8 hygiene rules.

---

## Five canonical reference workflows

Used as recurring examples across chapters:

1. **Lead Qualification Engine** (course capstone — covered in detail in Ch. 20)
2. **Personal Daily Briefing Bot** (course showcase — first win in Ch. 4)
3. **Invoice-to-Ledger** (finance example — Ch. 22)
4. **Ticket Triage** (CS example — Ch. 21)
5. **Meeting-Notes Action Item Extractor** (cross-functional — Ch. 23/24)

---

## Tool-neutrality stance (locked)

n8n is primary; Zapier/Make/Power Automate are equivalents. Use the **Toyota / Subaru / Land Cruiser / company car** mental model:
- **Zapier = Toyota Corolla** — easiest, broadest catalog, most expensive at scale
- **Make = Subaru** — visual canvas, cheapest middle ground
- **n8n = Land Cruiser** — most flexible, deepest, self-hostable
- **Power Automate = company car** — Microsoft 365 default

No tribalism. Ch. 3 builds the decision tables that readers can defend in budget meetings.

---

## Part-by-part status

### Part I — Foundations (Ch. 1–5) — COMPLETE
1. What changes when you stop doing it by hand
2. How does a workflow actually run (+ hero SVG)
3. What's the automation landscape (+ decision tables)
4. A 10-minute first win
5. Do you still need that AI tool

### Part II — Setup once (Ch. 6–9) — COMPLETE
6. Installing n8n — Cloud / Render / Hostinger / Docker
7. How much should you trust a workflow
8. Setting up your first credentials (Gmail / Slack / Sheets / HubSpot) — **CORRECTED**
9. Workspace setup — projects / folders / tags

### Part III — Working with workflows (Ch. 10–16) — IN PROGRESS
10. Triggers — how does a workflow know when to run? ✓
11. Why does data flow as items? ✓ **(THE most important conceptual chapter)**
12. Expressions — `$json`, Luxon dates, string ops — **NEXT**
13. Branching — IF, Switch, Filter — **NEXT**
14. Approval gates and Wait nodes
15. Errors — Error Trigger, retry logic, common failure modes
16. Loops — Loop Over Items, batch processing, rate limits

### Part IV — AI and intelligence (Ch. 17–19) — NOT STARTED
17. AI Agent node + OpenAI/Anthropic/Gemini credential setup — **HIGHEST STALENESS RISK**
18. Text Classifier, Sentiment Analysis, Information Extractor
19. Vector stores and Q&A chains (Pinecone, Supabase, Postgres)

### Part V — Workflows by role (Ch. 20–24) — NOT STARTED
20. For business development (Lead Qualification Engine — course capstone)
21. For customer success
22. For finance / ops
23. For marketing
24. For everyone — personal automations

### Part VI — Going further (Ch. 25–31) — NOT STARTED
25. Browser automation
26. Sub-workflows and modularity
27. Self-hosting at depth (queue mode, Postgres, scaling)
28. Database operations (Postgres node, Supabase)
29. Scheduling and queueing patterns
30. Running automations responsibly
31. What's next

### Appendices A–D — NOT STARTED

---

## Critical gaps to address before Part IV (Ch. 17–19)

**These chapters have the highest staleness risk in the book.** Before drafting:

1. **AI Agent node docs** — fetch `github.com/n8n-io/n8n-docs/blob/main/docs/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent.md` (and the sub-agent variants — Tools Agent, ReAct Agent, etc.)
2. **OpenAI credential setup** — current API key path
3. **Anthropic credential setup** — current API key path
4. **Google Gemini credential setup** — current path
5. **Text Classifier, Sentiment Analysis, Information Extractor** — each has its own docs page under `cluster-nodes/root-nodes/`
6. **Vector store nodes** — Pinecone, Supabase, Postgres (pgvector) — fetch each docs page

**Why high risk**: these nodes were added/reworked extensively in 2024–2025. Most secondary sources are stale or wrong about parameter names and configuration.

---

## Critical gaps to address before Part VI Ch. 27 (self-hosting deep dive)

1. **Queue mode docs** — `docs.n8n.io/hosting/scaling/queue-mode/`
2. **Worker setup** — task runners, Redis requirements
3. **Postgres production tuning** — connection pooling, retention env vars
4. **Backup strategies** — `n8n_data` volume, Postgres dumps

---

## Two judgment calls already approved by user

1. **Ch. 8 doesn't cover OpenAI/Anthropic credentials** — those defer to Ch. 17 where they belong with the AI nodes that use them.
2. **Ch. 9 introduces the "at-least-two-owners rule"** for team workflow ownership — n8n-specific addition not present in Course 2.

---

## User feedback patterns observed

The user has been consistent on:
- **Tables are welcome even if over word limit** (set in Ch. 3, applied since)
- **Judgment calls should be explicit at the end of each chapter**
- **Canonical sources only** (set after Ch. 8 correction)
- **Concrete pricing with "at time of writing"** + link to vendor pricing page
- **"Glaring" staleness must be flagged AND fixed** — not just flagged

---

## Resume instructions for next conversation

1. **Read this file in full** before doing anything else.
2. **Verify the existing chapter outputs** in `/mnt/user-data/outputs/` if they're available — these are the canonical versions.
3. **Continue with Ch. 12 (Expressions)** unless the user asks otherwise.
4. **Apply the canonical-docs-first rule unconditionally** — before each chapter, fetch the relevant n8n-docs GitHub markdown pages.
5. **For Part IV** (Ch. 17–19), expect to need 5–8 docs fetches per chapter. Don't draft without them.
6. **Word target is 2,000–2,500 per chapter** — overages are OK with explicit justification (reference-heavy, decision tables, multi-walkthrough chapters earned it before).
7. **Each chapter ends with**: takeaway → try-it-yourself → what's next → design rationale in the response (not in the chapter itself).

---

## Canonical n8n docs URLs (for fast lookup)

- Repo root: `https://github.com/n8n-io/n8n-docs`
- Credentials: `docs/integrations/builtin/credentials/{node}.md`
- Core nodes: `docs/integrations/builtin/core-nodes/n8n-nodes-base.{node}.md`
- App nodes: `docs/integrations/builtin/app-nodes/n8n-nodes-base.{node}.md`
- Trigger nodes: `docs/integrations/builtin/trigger-nodes/n8n-nodes-base.{node}trigger.md`
- AI cluster nodes: `docs/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.{node}.md`
- Data structure (Ch. 11 source of truth): `docs/data/data-structure.md`
- Item linking: `docs/data/data-mapping/data-item-linking/`
- Expressions: `docs/data/expressions/`
- Hosting: `docs/hosting/`

Live URLs (rendered): replace `github.com/n8n-io/n8n-docs/blob/main/docs/` with `docs.n8n.io/` and strip the `.md` extension.

---

*Last updated: end of conversation containing Chapters 1–11. Next conversation begins with Ch. 12.*
