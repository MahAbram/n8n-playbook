# PROJECT SUMMARY — *Learn Automation Working*

**Status:** Content-complete and QA-passed. Ready for a pre-deploy technical-validation pass (see Outstanding Items).
**Revision:** v0.4 (see INDEX.md changelog for full history).
**Last updated:** 29 May 2026.

---

## What this is

*Learn Automation Working* is an open-source, practical playbook for shipping real automation workflows with n8n. It is written for working operators at SMEs — business development, customer success, finance/ops, marketing, and individuals — not for engineers. It is the independent companion to a hands-on course (Course 1), not a capstone retelling of it. Every chapter is scenario-led, standalone, ~1,800–2,500 words, with a "Try it yourself" exercise, a "You'll know it worked when" success test, and an "In other tools" call-out where useful.

The throughline, stated in Ch. 1 and carried throughout: **if you can think a workflow through, you can build it · equip first, then engage · ship and watch.**

---

## Final shape

**Six parts, 32 chapters, four appendices.**

| Part | Chapters | Theme |
|---|---|---|
| I — Foundations | 1–4 | What automation is, how a workflow runs, the tool landscape, a 10-minute first win |
| II — Setup & trust | 5–9 | Replacing SaaS subscriptions, installing n8n, the trust/reversibility posture, credentials, workspace organisation |
| III — Building blocks | 10–18 | Triggers, items, expressions, branching, waits/HITL, error handling, batching/scale, data shaping, calling any API |
| IV — AI | 19–21 | The AI Agent + cluster nodes, purpose-built AI nodes (classification/extraction), vector stores & RAG |
| V — Role workflows | 22–26 | Pattern surveys for BD, CS, finance/ops, marketing, and personal automation (4 patterns each) |
| VI — Advanced | 27–32 | Sub-workflows, self-hosting at depth, direct database ops, scheduling/scale, advanced code, closing retrospective |

**Appendices:**
- **A — Glossary** (68 terms, alphabetical, each with chapter pointers)
- **B — Reference workflow library** (20 importable workflows + READMEs; 4 per Part V role)
- **C — Credentials cheat sheet** (20 apps, consistent template, real gotchas)
- **D — Further reading** (opinionated, annotated; credits Daniel Rosehill / Course 2 for house style)

**Plus:** INDEX.md (canonical table of contents + changelog).

---

## Deliverable inventory (all in `/outputs`)

- `chapter-01.md` … `chapter-32.md` — 32 chapters, complete
- `appendix-a.md` … `appendix-d.md` — 4 appendices
- `appendix-b/01-*.json` … `appendix-b/20-*.json` — 20 importable n8n workflow files
- `INDEX.md` — table of contents + version changelog
- `PROJECT-SUMMARY.md` — this file

---

## House style & locked conventions

- **Voice:** second person, concrete cold opens, names the failure modes and trade-offs (never vendor-cheerleading). "Show it failing, show the rate limits, show where you step in."
- **Tool stance:** tool-agnostic in principle, n8n-primary in practice. Zapier/Make/Power Automate get fair "In other tools" call-outs.
- **Datable claims:** pricing and model names carry "at time of writing" hedges and link to canonical sources. n8n Cloud pricing in Ch. 30 uses **EUR primary, MYR in brackets**, with an explicit at-time-of-writing disclaimer and link to n8n.io/pricing.
- **PDPA framing:** self-hosting is presented as a **risk-management choice**, not a legal localisation requirement (reflects Malaysia's April 2025 Cross-Border Transfer Guidelines). Set in Ch. 28; INDEX Ch. 6 blurb aligned.
- **Word band:** 1,800–2,500 per chapter. Two deliberate exceptions left long (earned density): **Ch. 3** (tool landscape, ~3,040) and **Ch. 19** (AI Agent intro, ~3,090). Part VI runs slightly heavier (2,400–2,950) by design — multi-concern bridging chapters.
- **Model naming:** standardised to the gpt-4o-mini / Claude Haiku / Gemini Flash generation, hedged; Ch. 32 and Appendix C kept model-agnostic where a specific name added nothing.

---

## QA record (full book-wide pass, completed)

A six-part adversarial QA pass was run across all 32 chapters + appendices + INDEX, accuracy-first then readability. Defects found and fixed:

**Cross-reference drift (the dominant defect class)** — caused by the v0.2 renumbering (two chapters inserted into Part III) and the v0.3 restructure. All resolved:
- "31/30 chapters" count errors (Ch. 1, INDEX) → 32
- Sub-workflow refs "Ch. 26" → "Ch. 27" (Ch. 2, 10, 11, 13)
- Self-hosting refs "Ch. 27" → "Ch. 28" (Ch. 3, 4)
- Queue-mode ref "Ch. 29" → "Ch. 28" (Ch. 6)
- Three mis-pointed role-chapter refs in one sentence (Ch. 8) → 22/23/24
- **Wrong-subject "what's next"** (highest-severity class): Ch. 16 previewed the AI Agent when Ch. 17 is data-shaping → rewritten; Ch. 30 previewed dropped content for Ch. 31 → rewritten.

**Stale framing:**
- "Course 1 capstone" / "one full workflow" residue (Ch. 5, Ch. 21) → reframed as pattern-survey
- Ch. 32 mis-cited Ch. 22 for a cost-ratio table that doesn't exist → corrected to Ch. 16, phantom comparison removed

**Other:**
- "structural output parser" typo (Ch. 22) → "Structured Output Parser"
- "GPT-5" eliminated book-wide (4 locations) for naming consistency
- "ten reference workflows" → "twenty" (Ch. 26, after Appendix B expansion)
- Appendix A: added 3 missing glossary terms (Text Classifier, Sentiment Analysis, Information Extractor); fixed S-cluster alphabetical ordering
- Appendix B: removed a fictional "Pattern 5" mapping
- Appendix D: removed a dead placeholder repo link
- INDEX: corrected Ch. 6 title (dropped non-existent "Desktop" option), dropped Ch. 17 subtitle, added v0.4 changelog entry

**Verified clean:** all technical claims (node names, operations, env vars, version behaviour), no fabricated nodes, datable AI facts properly hedged.

---

## Outstanding items before deploy

1. **Live import-and-run validation of the 20 Appendix B JSON files.** These are structurally valid, importable scaffolds (0 connection errors, filenames matched to READMEs, credentials empty by design). They have **not** been round-trip-tested on a live n8n instance. The plain nodes are solid; the **AI/LangChain cluster nodes** (in workflows 1, 4, 5, 6, 9, 10, 14, 17, 18, 19, 20) have version-sensitive schemas and may need a `typeVersion` nudge or node re-add on import. **Recommend one import pass on a live n8n v2 instance before publishing these**, prioritising WF 1, 5, 6, 9, 19. Each file carries a sticky-note telling the reader how to self-heal a node that errors on import.

2. **Cross-reference link-format decision (publish-stage).** Ch. 1–26 use bare-text refs ("Ch. 14"); Part VI + appendices use clickable Markdown links (`[Chapter 17](./chapter-17.md)`). Not an accuracy issue. Decide at publish based on output format:
   - Website / GitBook / linked PDF → standardise *up* to links (mechanical, can be scripted)
   - Raw Markdown / print / undecided → standardise *down* to bare text, or leave as-is
   The link format also hard-codes filenames (`chapter-17.md`); if files are renamed for URL slugs, links need updating.

3. **Final filename / slug convention.** If publishing to web, decide chapter file naming (`chapter-17.md` vs `17-shaping-data.md` vs numbered slugs) before wiring any links — see item 2.

4. **A real "report corrections / contribute" destination.** Several places (Ch. 32, Appendix B intro, Appendix D) invite readers to contribute back or report drift. Appendix D's dead repo link was removed, but the *promise* of a maintained home still appears. Either stand up the open-source repo these references imply, or soften the remaining "PRs welcome" language to match reality.

5. **One human read-through for flow.** The QA pass was accuracy- and consistency-focused. A single cover-to-cover human read would catch any remaining rhythm/transition issues that mechanical passes don't surface — particularly at part boundaries.

---

## Considerations for future iterations

These are not defects — they're the natural backlog for a living playbook.

**Content depth / new chapters worth adding:**
- **Native AI evaluation** deserves its own chapter (currently an undercurrent in Part IV and flagged in Ch. 32). n8n shipped Evaluations; eval-as-discipline is what separates "shipped once" from "shipped reliably."
- **MCP (Model Context Protocol)** is treated lightly (Ch. 31/32 mention it). As MCP Server Trigger / Client Tool mature, this likely warrants dedicated treatment.
- **Agentic workflows with eval-driven iteration** — the synthesis of AI Agent + Evaluations + MCP that Ch. 32 points at as the field's direction.
- **A testing/CI chapter** — version-controlling workflows, staging vs prod promotion, automated regression testing of workflows. Currently implicit.

**Maintenance / freshness (the playbook's standing tax):**
- **Pricing tables** (Ch. 3, Ch. 6, Ch. 30) need a refresh each release; the EUR↔MYR rate in Ch. 30 drifts.
- **Model names** (Ch. 19, 22) will date; the "at time of writing" hedges buy time but a periodic sweep is needed.
- **CVE references** (Ch. 28, 31) are point-in-time examples; they'll become historical.
- **n8n version behaviour** — v2.x specifics (task runners, the sub-workflow wait-fix, default pruning) will shift at v3. The INDEX changelog discipline should continue.
- **Third-party app integrations** (Appendix C, Part V chapters) — OAuth flows and API specifics change; annual review.

**Reference library (Appendix B):**
- After live-testing, consider shipping the **KB ingestion workflow** that WF 6 (Q&A bot) depends on as a prerequisite — currently the reader must build it from Ch. 21.
- Consider a **versioned export set** per n8n major version, since cluster-node schemas drift.
- A **community-contributed variants** section could grow the library beyond the canonical 20.

**Structural / production:**
- A genuine **errata + contribution mechanism** (ties to outstanding item 4).
- **Localisation** — the book is Malaysia-flavoured (RM examples, PDPA, named cities). A future edition could parameterise the local context for other SME markets.
- **Diagrams** — Ch. 2's architecture diagram is the only one. Selected Part III/VI chapters (queue mode, sub-workflow nesting, RAG flow) could benefit from a diagram each.

---

## Acknowledgement

House style and the "opinionated > comprehensive" editorial disposition are credited to Daniel Rosehill and the Course 2 companion material (see Appendix D). The patterns throughout are the n8n community's; the contribution here is their organisation into a teachable sequence.
