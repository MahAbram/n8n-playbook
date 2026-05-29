---
title: Appendix B — Reference workflow library | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: Twenty canonical reference workflows from Part V — all four patterns per role across BD, CS, finance/ops, marketing, and personal automation. Each with a README explaining what it does, credentials needed, and what to expect on first run.
meta-twitter:title: Learn Automation Working
---

# Appendix B — Reference workflow library

This appendix is the *complete-artefact* version of Part V. Where the role chapters (22–26) surveyed patterns and walked through one Try-It-Yourself per role, this appendix gives you all twenty workflows as importable starting points — every pattern from every Part V chapter, ready to drop into a fresh n8n instance and customise.

## How to use this library

**Import flow.** Each workflow ships as a JSON file in the `appendix-b/` directory of the open-source repo. To import: open your n8n instance, click the workflow list dropdown, select *Import from File*, pick the JSON. The workflow loads with its nodes, expressions, and structure intact — credentials are *not* included (n8n never exports those) and you'll need to attach your own before the first run.

**Treat these as starting points, not finished products.** Every estate's specifics differ. The reference workflows ship with sensible defaults — sample channel names, placeholder API endpoints, conservative cadences — but every one of them will need at least a few minutes of customisation before it fits your actual setup. The READMEs name the specific configuration points to tune.

**Credentials are your responsibility.** Most workflows reference one or more app credentials (Slack, Gmail, HubSpot, Postgres, OpenAI, etc.). Appendix C is the companion reference for setting these up. The discipline from [Chapter 8](./chapter-08.md) applies: never paste API keys into workflow JSON, never share credentials across workflows that need different access levels, and rotate anything that touches a production system on a schedule.

**What about errors and monitoring?** Reference workflows include the error-handling patterns from [Chapter 15](./chapter-15.md) at a baseline level — Retry On Fail on retryable nodes, Stop and Error for assertion failures. They do *not* wire up Error Trigger workflows for cross-workflow failure routing; that's an estate-level decision (one Error Trigger workflow per estate, not one per workflow), and the canonical pattern is named in Ch. 15 rather than duplicated here.

**Difficulty levels in this appendix:**

- *Beginner* — Single trigger, ≤10 nodes, one credential. Runnable within 20 minutes including credential setup.
- *Intermediate* — Multiple nodes, AI or routing logic, 2–3 credentials. Allow 30–45 minutes.
- *Advanced* — Sub-workflows, vector stores, queue-mode considerations, or human-in-the-loop. Allow 60+ minutes and read the companion chapter first.

The twenty workflows are organised by Part V role: BD, CS, finance/ops, marketing, personal.

---

## BD — Business Development (Chapter 22)

### Workflow 1 — Lead Qualification Engine

**Companion to:** Chapter 22, Pattern 1
**Difficulty:** Intermediate
**Setup time:** ~30 minutes
**Credentials needed:** HubSpot (or other CRM), OpenAI or Anthropic, Slack

**What it does.** Watches your CRM for new inbound leads. For each new lead, calls an AI agent to score against your ideal-customer profile (firmographics, role, stated intent), writes the score back to the lead record, and routes high-scoring leads to your BD lead's Slack DM with a one-line brief.

**Trigger.** HubSpot Trigger on new contact (or Salesforce / Pipedrive equivalent).

**Node chain.**
- HubSpot Trigger (new contact)
- Set node (extract scoring inputs)
- AI Agent (system prompt: your ICP definition; Structured Output Parser: `{score: 1–10, rationale: string, top_signals: array}`)
- Switch on score (high ≥ 7, medium 4–6, low ≤ 3)
- HubSpot Update Contact (write score + rationale to custom fields)
- Slack DM to BD lead (high-score branch only)

**What to expect on first run.** The first lead through the workflow will look unusually well-scored or unusually poorly-scored — the AI's calibration takes 5–10 examples to feel reliable. Plan to tune the system prompt's ICP definition after the first batch.

**Configuration to tune for your use.**
- The ICP definition in the AI Agent's system prompt (this is where your team's actual qualification logic lives)
- The score thresholds in the Switch node
- The Slack channel / DM target for high-scoring leads
- HubSpot custom field names for `score` and `rationale`

**Import file:** [01-lead-qualification-engine.json](/workflows/01-lead-qualification-engine.json)

---

### Workflow 2 — Inbound Lead Enrichment

**Companion to:** Chapter 22, Pattern 2
**Difficulty:** Intermediate
**Setup time:** ~25 minutes
**Credentials needed:** HubSpot, OpenAI or Anthropic, HTTP Request (for enrichment provider)

**What it does.** When a lead lands without a company-size or industry, the workflow calls a public-information enrichment source (Clearbit-style API, LinkedIn-via-third-party, or just a website-scrape with HTTP Request) and writes the missing context back to the CRM record.

**Trigger.** HubSpot Trigger on new contact, filtered to contacts missing key fields.

**Node chain.**
- HubSpot Trigger (new contact)
- If node (proceed only if `company` or `industry` is empty)
- HTTP Request (enrichment API call)
- AI Agent (synthesise the raw enrichment data into clean fields: company name, industry, employee count, brief)
- HubSpot Update Contact (write enriched fields)

**What to expect on first run.** Enrichment APIs return wildly varied data shapes per provider. The first 2–3 runs will likely surface fields the AI synthesis didn't expect; tune the AI prompt's output schema accordingly.

**Configuration to tune for your use.**
- The enrichment provider URL and authentication (Clearbit, FullContact, Apollo, or your own scrape endpoint)
- The HubSpot fields the workflow writes back to
- The AI prompt's output schema (which fields you actually want)

**Import file:** [02-inbound-lead-enrichment.json](/workflows/02-inbound-lead-enrichment.json)

---

### Workflow 3 — Stalled Deal Surfacing

**Companion to:** Chapter 22, Pattern 3
**Difficulty:** Beginner
**Setup time:** ~20 minutes
**Credentials needed:** HubSpot (or Pipedrive / Salesforce), Slack

**What it does.** Every Monday at 8 AM, queries your CRM for deals that haven't had a stage change or note in 14+ days, ranks by deal value, and posts the top five to your BD Slack channel as a digest. Each entry includes deal name, value, owner, and last-activity date.

**Trigger.** Schedule Trigger, weekly, Monday 8 AM.

**Node chain.**
- Schedule Trigger
- HubSpot Get All (or equivalent), filtered to open deals
- Code or Filter node (deals where `days_since_last_activity > 14`)
- Sort by deal value descending, limit to 5
- Set node (format the digest message)
- Slack Post Message to BD channel

**What to expect on first run.** If your CRM has been quietly accumulating stale deals, the first digest will be longer than expected — possibly uncomfortable. That's the point.

**Configuration to tune for your use.**
- The stale-deal threshold (14 days is a starting point; some pipelines need 7, some 30)
- The deal-stage filter (you may want to exclude *Closed Lost* explicitly)
- The Slack channel and the schedule time

**Import file:** [03-stalled-deal-surfacing.json](/workflows/03-stalled-deal-surfacing.json)

---

### Workflow 4 — Meeting Follow-Up Drafter

**Companion to:** Chapter 22, Pattern 4
**Difficulty:** Intermediate
**Setup time:** ~30 minutes
**Credentials needed:** Otter or Fireflies (or Google Drive for transcripts), OpenAI or Anthropic, Gmail

**What it does.** Pulls a meeting transcript from your recorder of choice, asks an AI agent to draft a follow-up email — summary, decisions made, next steps with owners — and saves the draft to your Gmail Drafts folder for review and send. The workflow never sends directly; it always drafts.

**Trigger.** Webhook from Otter/Fireflies on new transcript (or Schedule Trigger checking Google Drive for new files in a watched folder).

**Node chain.**
- Webhook Trigger (or Google Drive Trigger)
- HTTP Request (fetch transcript content if not in payload)
- AI Agent (system prompt: your tone preferences + structure: summary, decisions, next steps; Structured Output Parser)
- Set node (format as email HTML)
- Gmail Create Draft

**What to expect on first run.** The AI's tone will not match yours on the first run. Plan to revise the system prompt with 3–5 examples of your past follow-up emails before the workflow earns its keep.

**Configuration to tune for your use.**
- The system prompt (tone, structure, signature)
- The Gmail account the draft goes to (use the BD lead's account if delegating)
- The transcript source format (Otter, Fireflies, Zoom native have different shapes)

**Import file:** [04-meeting-followup-drafter.json](/workflows/04-meeting-followup-drafter.json)

---

## CS — Customer Success (Chapter 23)

### Workflow 5 — Ticket Triage with Sentiment Routing

**Companion to:** Chapter 23, Pattern 1
**Difficulty:** Intermediate
**Setup time:** ~35 minutes
**Credentials needed:** Help desk (Zendesk / Intercom / Front), OpenAI or Anthropic, Slack

**What it does.** When a new support ticket arrives, an AI agent classifies it by category (billing, technical, account, feature request) and sentiment (positive, neutral, negative, urgent). Routes urgent-and-negative tickets to a dedicated Slack escalation channel; routes the rest to category-specific queues.

**Trigger.** Zendesk Trigger / Intercom Trigger / Webhook from your help desk on new ticket.

**Node chain.**
- Help desk Trigger
- Set node (extract subject + body)
- AI Agent (Structured Output Parser: `{category, sentiment, urgency, suggested_response_template}`)
- Switch on `urgency == "urgent" && sentiment == "negative"`
- On escalation branch: Slack Post to #escalations with @here
- On normal branch: Help desk Add Tag + Assign to category queue

**What to expect on first run.** Sentiment classification is the noisiest part of this workflow. Expect 10–15% of "negative" labels to be the AI being conservative; tune the prompt with explicit examples after the first 50 tickets pass through.

**Configuration to tune for your use.**
- The category taxonomy in the AI's system prompt
- The escalation thresholds (urgency + sentiment combination)
- The Slack channel and the help desk queue mappings

**Import file:** [05-ticket-triage-sentiment-routing.json](/workflows/05-ticket-triage-sentiment-routing.json)

---

### Workflow 6 — Knowledge-Base Q&A Bot

**Companion to:** Chapter 23, Pattern 2
**Difficulty:** Advanced
**Setup time:** ~75 minutes (longest in the library)
**Credentials needed:** Postgres or Supabase with pgvector, OpenAI (embeddings + chat), Slack or Webhook

**What it does.** A retrieval-augmented generation workflow that answers customer questions from your knowledge base. On a Slack mention or webhook input, retrieves the top relevant KB articles via vector search, hands them to an AI agent with the user's question, and returns a sourced answer with article links.

**Trigger.** Slack mention or Webhook.

**Node chain.**
- Trigger (Slack / Webhook)
- Set node (extract user question)
- Embeddings node (OpenAI embeddings, model: text-embedding-3-small)
- Postgres / Supabase Vector Store (Get Many, top K = 5)
- AI Agent (system prompt: "answer from provided context only; cite article links; say 'I don't know' if context is insufficient")
- Slack Reply / Webhook Response

**Pre-build requirement.** A separate ingestion workflow that embeds your KB articles into the vector store. See [Chapter 21](./chapter-21.md) for the canonical ingestion pattern. The Q&A workflow assumes the vector store already exists.

**What to expect on first run.** The bot will confidently make up answers if the retrieval returns nothing relevant. The "say I don't know" instruction in the system prompt is doing real work; do not remove it.

**Configuration to tune for your use.**
- The system prompt (especially the "answer from provided context only" instruction)
- The vector store table name and schema
- The top-K retrieval count (5 is a starting point; tune based on KB density)

**Import file:** [06-knowledge-base-qa-bot.json](/workflows/06-knowledge-base-qa-bot.json)

---

### Workflow 7 — At-Risk Customer Detection

**Companion to:** Chapter 23, Pattern 3
**Difficulty:** Intermediate
**Setup time:** ~40 minutes
**Credentials needed:** Postgres (for usage data), HubSpot or similar (for account context), Slack

**What it does.** Runs daily against your usage database, identifies accounts whose product usage has dropped >40% week-over-week, enriches with account context (tier, ARR, CSM owner), and posts a ranked list of at-risk accounts to the CS team's Slack channel.

**Trigger.** Schedule Trigger, daily at 7 AM.

**Node chain.**
- Schedule Trigger
- Postgres Execute Query (parameterised SQL pulling usage drops)
- HubSpot Get Many (enrich with account tier and CSM owner)
- Merge node (combine usage data + account data on `account_id`)
- Filter (drop accounts below ARR threshold — focus the alert)
- Sort by ARR descending, limit to top 10
- Set node (format digest)
- Slack Post to #cs-at-risk

**What to expect on first run.** The first run will surface accounts that have always been low-usage rather than recently-dropped — the >40% week-over-week threshold filters this out, but it relies on the previous week's usage being non-zero. Tune the SQL to require both `current_week > 0` and `previous_week > 0`.

**Configuration to tune for your use.**
- The drop threshold (40% is aggressive; some teams use 25%)
- The ARR floor for inclusion (most teams ignore tiny accounts to focus signal)
- The usage SQL (must match your data warehouse schema)

**Import file:** [07-at-risk-customer-detection.json](/workflows/07-at-risk-customer-detection.json)

---

### Workflow 8 — Onboarding Email Sequence

**Companion to:** Chapter 23, Pattern 4
**Difficulty:** Beginner
**Setup time:** ~25 minutes
**Credentials needed:** Gmail (or transactional email — SendGrid, Postmark), HubSpot

**What it does.** When a new customer is created in your CRM, a 14-day onboarding sequence fires: welcome email on day 0, setup-check on day 3, feature-spotlight on day 7, "how's it going?" on day 14. Each step waits for the time gap, then checks whether the customer has hit a milestone (logged in, completed setup) before sending — milestones short-circuit the sequence.

**Trigger.** HubSpot Trigger on new contact in a specific lifecycle stage (or webhook from your signup flow).

**Node chain.**
- HubSpot Trigger (new customer)
- Gmail Send Email (welcome)
- Wait node (3 days)
- HubSpot Get Contact (check setup status)
- If `setup_complete == true` → exit sequence
- Else Gmail Send Email (setup check)
- Wait node (4 days), check engagement, send or exit
- Wait node (7 days), check engagement, send or exit

**What to expect on first run.** Wait nodes in n8n persist across instance restarts (verified through [Chapter 14](./chapter-14.md)), so a 14-day sequence will genuinely wait 14 days. Test with shorter Wait times (5 minutes) on first run.

**Configuration to tune for your use.**
- The email content (each Gmail node's body)
- The Wait durations (3-4-7 is a starting point)
- The milestone check (which CRM field signals "they're set up")

**Import file:** [08-onboarding-email-sequence.json](/workflows/08-onboarding-email-sequence.json)

---

## Finance & Ops (Chapter 24)

### Workflow 9 — Invoice-to-Ledger Pipeline

**Companion to:** Chapter 24, Pattern 1
**Difficulty:** Advanced
**Setup time:** ~50 minutes
**Credentials needed:** Gmail (invoice intake), OpenAI or Anthropic (extraction), Xero or QuickBooks (ledger), Slack (review channel)

**What it does.** Watches a dedicated Gmail label for incoming PDF invoices. Extracts vendor, invoice number, line items, total, and currency via AI. Posts the extracted data plus a preview image to Slack for human approval before writing to the accounting ledger. Approved invoices land in Xero/QuickBooks as draft bills.

**Trigger.** Gmail Trigger watching for new emails with label `invoices-inbound`.

**Node chain.**
- Gmail Trigger
- Extract from File (PDF → text + image preview)
- AI Agent (Information Extractor: vendor, invoice_number, line_items, total, currency, due_date)
- Send and Wait for Response (Slack: "approve to post to ledger" with preview + extracted data)
- On Approve: Xero Create Bill (or QuickBooks equivalent)
- On Reject: Set node logging the rejection reason

**What to expect on first run.** PDF extraction varies wildly by vendor. Invoices from major SaaS companies (Stripe, AWS, Google) extract cleanly; PDFs from local vendors (Malaysian SME suppliers) often fail. The approval gate is doing real work — do not auto-post.

**Configuration to tune for your use.**
- The AI extraction schema (line items vs. single total, currency handling)
- The Slack approval channel
- The Xero/QuickBooks bill template (account codes, tax mapping)

**Import file:** [09-invoice-to-ledger-pipeline.json](/workflows/09-invoice-to-ledger-pipeline.json)

---

### Workflow 10 — Receipt-to-Spreadsheet

**Companion to:** Chapter 24, Pattern 2 + Chapter 26, Pattern 2
**Difficulty:** Beginner
**Setup time:** ~25 minutes
**Credentials needed:** Gmail (receipt intake), OpenAI or Anthropic, Google Sheets

**What it does.** Phone-snapped receipt photos arrive at a dedicated Gmail address. The workflow extracts vendor, amount, currency, date, and category, then appends a row to a Google Sheets expense log. Replies to the original email with what was logged for at-a-glance verification.

**Trigger.** Gmail Trigger filtering for messages with image attachments from your phone's email address.

**Node chain.**
- Gmail Trigger
- Extract from File (image OCR)
- AI Agent (Information Extractor: vendor, amount, currency, date, category)
- Set node (currency conversion to base via cached FX rate)
- Google Sheets Append Row
- Gmail Reply to original sender ("Logged: {vendor} RM {amount} on {date}")

**What to expect on first run.** Receipts in non-Latin scripts, crumpled receipts, and receipts where the total is at the top instead of the bottom will fail extraction. The reply-confirmation pattern catches these — when you see "Logged: undefined RM null", you fix manually.

**Configuration to tune for your use.**
- The Google Sheets sheet ID and column mapping
- The category list in the AI prompt (your specific expense categories)
- The base currency for conversion

**Import file:** [10-receipt-to-spreadsheet.json](/workflows/10-receipt-to-spreadsheet.json)

---

### Workflow 11 — Cashflow Snapshot Generator

**Companion to:** Chapter 24, Pattern 3
**Difficulty:** Intermediate
**Setup time:** ~40 minutes
**Credentials needed:** Xero or QuickBooks, Stripe, Google Sheets, Gmail

**What it does.** Every Monday morning, pulls the previous week's cash inflows (Stripe payments, Xero invoice receipts) and outflows (Xero bill payments, payroll if exposed), reconciles against opening balance, and emails a one-page cashflow snapshot to the founder/CFO. Writes the same data to a running historical Google Sheet.

**Trigger.** Schedule Trigger, weekly, Monday 7 AM.

**Node chain.**
- Schedule Trigger
- Xero Get Many (transactions for previous week, both inflow and outflow)
- Stripe List Payments (previous week)
- Merge node (combine transaction streams)
- Aggregate node (group by category, sum amounts)
- Google Sheets Append Row (historical log)
- Set node (format email body with summary + week-over-week deltas)
- Gmail Send Email to founder/CFO

**What to expect on first run.** The first run will surface category mismatches between Stripe (uses `stripe_fees`, `disputes`, etc.) and Xero (uses your chart of accounts). Plan to normalise category names via the Set node.

**Configuration to tune for your use.**
- Category normalisation (Stripe vs. Xero conventions)
- The email recipients
- The historical sheet's column structure

**Import file:** [11-cashflow-snapshot-generator.json](/workflows/11-cashflow-snapshot-generator.json)

---

### Workflow 12 — Vendor Payment Approval

**Companion to:** Chapter 24, Pattern 4
**Difficulty:** Intermediate
**Setup time:** ~35 minutes
**Credentials needed:** Xero (or QuickBooks), Slack, Gmail

**What it does.** When a draft bill in Xero is marked ready-to-pay, the workflow sends an approval request to the CFO/founder via Slack with vendor, amount, and bill PDF. On approve, marks the bill as approved-for-payment in Xero and notifies AP. On reject, posts to a "held for review" Slack thread with the rejection reason. Hard timeout at 48 hours routes to escalation.

**Trigger.** Xero webhook (or scheduled poll for bills with status `awaiting_approval`).

**Node chain.**
- Xero Trigger / Schedule Trigger
- Filter node (bills with `awaiting_approval` status)
- Set node (extract bill details for approval message)
- Send and Wait for Response (Slack approval, 48-hour limit)
- On Approve: Xero Update Bill (status → `approved`) + Gmail to AP
- On Reject: Slack thread + Xero Update Bill (status → `held`)
- On Timeout: Slack escalation to CFO directly

**What to expect on first run.** The 48-hour timeout is configured but rarely fires in practice — most approvals come back within an hour. Test the timeout path explicitly with a 1-minute limit before deploying.

**Configuration to tune for your use.**
- The approval threshold (some teams require dual approval above a RM amount)
- The Slack channel / approver ID
- The escalation target

**Import file:** [12-vendor-payment-approval.json](/workflows/12-vendor-payment-approval.json)

---

## Marketing (Chapter 25)

### Workflow 13 — Broadcast Approval Gate

**Companion to:** Chapter 25, Pattern 1
**Difficulty:** Intermediate
**Setup time:** ~30 minutes
**Credentials needed:** Mailchimp or SendGrid (or whichever ESP), Google Drive / S3, Slack

**What it does.** When a campaign is queued for send, the workflow renders the final HTML, uploads it to a temporary hosted URL for preview, and pauses for marketing-lead approval in Slack. On approve, fires the actual send to the recipient list. On reject, logs to a "campaigns-not-sent" Sheet. Includes a 4-hour timeout that routes to "queued for Monday review" rather than auto-sending.

**Trigger.** Schedule Trigger (for newsletters) or Form Trigger (for ad-hoc campaigns).

**Node chain.**
- Trigger
- Edit Fields (Set) consolidating subject, body, segment, recipient count
- Templating step (final HTML render)
- Google Drive / S3 upload (hosted preview URL)
- Send and Wait for Approval (Slack: subject + count + preview link, 4-hour limit)
- On Approve: ESP Send Campaign to full list
- On Reject: Google Sheets Append (campaigns-not-sent log)
- On Timeout: Slack message ("queued for Monday review")

**What to expect on first run.** Run with a small test recipient list (your marketing team's own emails) for the first three campaigns. The Slack preview catches subject-line issues; the test send catches HTML rendering issues that the preview doesn't.

**Configuration to tune for your use.**
- The ESP (Mailchimp, SendGrid, Customer.io)
- The preview-hosting destination
- The approver's Slack ID
- The timeout duration

**Import file:** [13-broadcast-approval-gate.json](/workflows/13-broadcast-approval-gate.json)

---

### Workflow 14 — A/B Subject-Line Variant Generator

**Companion to:** Chapter 25, Pattern 2
**Difficulty:** Beginner
**Setup time:** ~20 minutes
**Credentials needed:** OpenAI or Anthropic, Slack or Telegram

**What it does.** A marketer provides a campaign body and target audience via a Form Trigger; the AI generates 4 brand-voice-matched subject-line variants with rationales. The variants are presented in Slack for the marketer to pick one (or choose to A/B-test two). Selected subject lines pass downstream to the broadcast approval gate (Workflow 13).

**Trigger.** Form Trigger with fields: campaign body, audience, campaign goal.

**Node chain.**
- Form Trigger
- AI Agent (system prompt: brand voice examples + tone guide; Structured Output Parser: `[{subject, rationale}]`)
- Set node (format variants as a numbered list)
- Send and Wait for Response (Slack/Telegram with multiple-choice buttons)
- Set node (record selected subject)
- Optional: pipe to Workflow 13 via Execute Sub-workflow

**What to expect on first run.** The first batch of variants will feel generic — the system prompt needs your team's actual best historical subject lines as examples. After tuning with 5–10 examples, output quality jumps significantly.

**Configuration to tune for your use.**
- The system prompt (especially the brand-voice examples)
- The number of variants generated (3–4 is the sweet spot)
- The Slack / Telegram approver

**Import file:** [14-ab-subject-line-variant-generator.json](/workflows/14-ab-subject-line-variant-generator.json)

---

### Workflow 15 — Content Calendar Assembly

**Companion to:** Chapter 25, Pattern 3
**Difficulty:** Intermediate
**Setup time:** ~35 minutes
**Credentials needed:** Notion, Slack, Google Drive

**What it does.** Every Monday at 7 AM, pulls the week's content drafts from Notion, tagged briefs from a #content-briefs Slack channel, and new assets from a Google Drive folder. Assembles them into a single "This Week" view (written to a Notion page or Google Doc) and posts the link to the marketing channel for the standup.

**Trigger.** Schedule Trigger, weekly, Monday 7 AM.

**Node chain.**
- Schedule Trigger
- Notion Database Query (posts in current week, status In Draft or Scheduled)
- Slack node (search messages in #content-briefs from past week)
- Google Drive node (list files in /content/upcoming added in past week)
- Merge node (combine by campaign tag, or flat append)
- AI Agent (optional — synthesise into structured weekly view)
- Notion Create Page (or Google Doc)
- Slack Post Link to marketing channel

**What to expect on first run.** If your content briefs live in three different places, the first assembly will be longer than expected — you'll discover briefs that hadn't yet made it into Notion. That visibility is the workflow's actual value.

**Configuration to tune for your use.**
- The Notion database ID and the status filter
- The Slack channel ID
- The Google Drive folder ID
- The output destination (Notion page vs Google Doc)

**Import file:** [15-content-calendar-assembly.json](/workflows/15-content-calendar-assembly.json)

---

### Workflow 16 — Post-Event Follow-Up Sequence

**Companion to:** Chapter 25, Pattern 4
**Difficulty:** Advanced
**Setup time:** ~50 minutes
**Credentials needed:** Gmail or ESP, Zoom or webinar platform, optional Slack (for BD handoff)

**What it does.** After a webinar ends, branches based on attendance: showed-up gets recording + content-deepening CTA; didn't-show gets recording + "sorry we missed you" with slides. Runs a 7-day sequence (day 0, day 3, day 7), with high-engagement responses (replies, link clicks) routing to BD as warm leads.

**Trigger.** Manual Trigger (post-event with attendee CSV) or Zoom webhook.

**Node chain.**
- Trigger (Manual / Zoom)
- Switch on attended_status: showed-up branch vs no-show branch
- Each branch: Gmail Send Email #1 (recording + branch-specific CTA)
- Wait node (3 days)
- Gmail Send Email #2 (related content, contextualised)
- Wait node (4 days)
- Gmail Send Email #3 (soft pitch)
- Webhook listener for click-tracking → Slack to BD on high engagement

**What to expect on first run.** Test the branching with a small attendee list (3–5 attendees, mix of showed-up and no-show). Wait nodes will persist across n8n restarts, so the 7-day sequence is genuinely 7 days.

**Configuration to tune for your use.**
- The email content (each Gmail node)
- The Wait durations (3-4-N is a starting point)
- The BD handoff threshold (replies + link clicks both count)

**Import file:** [16-post-event-followup-sequence.json](/workflows/16-post-event-followup-sequence.json)

---

## Personal (Chapter 26)

### Workflow 17 — Personal Daily Briefing Bot

**Companion to:** Chapter 26, Pattern 1
**Difficulty:** Intermediate
**Setup time:** ~25 minutes
**Credentials needed:** Google Calendar, OpenWeather (or local provider), Slack, optional Gmail

**What it does.** At 6:50 AM your time, assembles your day: calendar items, weather forecast, top 2 news headlines from your sources, top 3 priority Slack messages from overnight. An AI agent synthesises into a one-page brief delivered via Gmail or Telegram.

**Trigger.** Schedule Trigger, daily 6:50 AM, workflow timezone set explicitly.

**Node chain.**
- Schedule Trigger
- Google Calendar Get Many (today's events)
- HTTP Request (OpenWeather API for your city)
- RSS Read (1–2 trusted news feeds)
- Slack Search Messages (priority channels + DMs from past 12 hours)
- AI Agent (system prompt: format as concise morning brief, plain text, 3 calendar items, weather one-liner, 2 headlines, top 3 messages)
- Gmail Send / Telegram Send to yourself

**What to expect on first run.** The first brief will likely be too long. Tighten the AI system prompt's "be concise" instruction — explicit word/line limits work better than vague directions.

**Configuration to tune for your use.**
- Your city for weather
- The RSS feeds (your trusted sources)
- The Slack channels considered priority
- The delivery time (match your actual day-start, not aspirational)

**Import file:** [17-personal-daily-briefing-bot.json](/workflows/17-personal-daily-briefing-bot.json)

---

### Workflow 18 — Networking Enrichment

**Companion to:** Chapter 26, Pattern 3
**Difficulty:** Intermediate
**Setup time:** ~35 minutes
**Credentials needed:** HTTP Request (enrichment provider), OpenAI or Anthropic, Airtable or Notion, optional Slack

**What it does.** When a new contact card arrives (vCard email, business-card-scanner email, or webhook from a card app), looks up public information about the person — current role, recent posts, company news — and writes a one-paragraph context summary to your personal CRM. Optional Slack DM to yourself with the brief.

**Trigger.** Email Trigger with vCard attachment, or Webhook from card-scanner app, or Notion entry creation.

**Node chain.**
- Trigger
- Set node (extract name, email, company, role from contact card)
- HTTP Request (LinkedIn-via-third-party / Clearbit / public-info lookup)
- AI Agent (synthesise: meeting context, likely interests, common ground — 3 sentences max)
- Airtable Append / Notion Create Page
- Optional: Slack DM to yourself

**What to expect on first run.** The enrichment varies wildly by source. Public LinkedIn profiles enrich well; people without much public presence return thin context. Filter aggressively at the trigger — only the contacts you actually want enriched.

**Configuration to tune for your use.**
- The enrichment source (and your team's stance on what's "public")
- The summary format (3 sentences is the sweet spot)
- The destination (Airtable vs Notion vs Google Sheets)

**Import file:** [18-networking-enrichment.json](/workflows/18-networking-enrichment.json)

---

### Workflow 19 — Meeting-Notes Action-Item Extractor

**Companion to:** Chapter 26, Pattern 4
**Difficulty:** Intermediate
**Setup time:** ~40 minutes
**Credentials needed:** Otter or Fireflies (or Form Trigger for paste), OpenAI or Anthropic, Todoist or Linear, Gmail

**What it does.** Takes a meeting transcript or notes, extracts action items with owner and due date, routes by owner: items where you're the owner go to your task system (Todoist/Linear/Notion); items where someone else is the owner go to a "needs to be communicated" list; unclear-ownership items go to a follow-up list for review with the meeting host.

**Trigger.** Webhook from Otter/Fireflies, Email with transcript attachment, or Form Trigger for manual paste.

**Node chain.**
- Trigger
- Set node (extract transcript text)
- AI Agent (Structured Output Parser: array of `{task, owner, due_date, source_context, ownership_certainty}`)
- Switch on owner field (you / other / unclear)
- For "you": Todoist or Linear Create Task
- For "other": Google Sheets Append (needs-to-communicate list)
- For "unclear": Google Sheets Append (follow-up-with-host list)
- Gmail Send Summary to yourself with the routing breakdown

**What to expect on first run.** Native Zoom transcripts are unreliable; Otter and Fireflies are substantially better. Hand-typed notes (pasted via Form Trigger) often work best because you've already done the first pass of summarisation. Set ownership_certainty conservatively — when in doubt, route to follow-up rather than auto-creating tasks.

**Configuration to tune for your use.**
- The task system credential (Todoist, Linear, Notion, Things)
- The system prompt's ownership-detection rules
- The "your name" identifier the AI uses to detect when you're the owner

**Import file:** [19-meeting-notes-action-item-extractor.json](/workflows/19-meeting-notes-action-item-extractor.json)

---

### Workflow 20 — Weekend Reading List Curator

**Companion to:** Chapter 26 (personal automations — an extension of the four named patterns)
**Difficulty:** Beginner
**Setup time:** ~20 minutes
**Credentials needed:** RSS feeds, OpenAI or Anthropic, Gmail or Notion

**What it does.** Every Friday at 5 PM, pulls articles from your watched RSS feeds and saved bookmark services (Pocket, Instapaper, Readwise) added during the week. An AI agent ranks them by likely value to you and produces a curated top-5 list with one-line summaries, delivered via email or Notion. The unread becomes the weekend reading instead of an ever-growing backlog.

**Trigger.** Schedule Trigger, weekly, Friday 5 PM.

**Node chain.**
- Schedule Trigger
- RSS Read (multiple feeds, items added in past 7 days)
- HTTP Request (Pocket / Instapaper API for saved articles, optional)
- Set node (consolidate into a single article list with title + URL + summary)
- AI Agent (rank by likely value, output top 5 with one-line summaries)
- Gmail Send Email or Notion Create Page

**What to expect on first run.** The AI ranking depends entirely on the system prompt's description of "what you care about." Spend 10 minutes writing this prompt — the topics, the writers you trust, the formats you skim vs read in depth. Quality scales linearly with prompt specificity.

**Configuration to tune for your use.**
- The RSS feeds + saved-articles source
- The system prompt (your interests — be specific)
- The delivery destination (email vs Notion)
- The cadence (some people prefer this Sunday morning, not Friday evening)

**Import file:** [20-weekend-reading-list-curator.json](/workflows/20-weekend-reading-list-curator.json)

---

## Importing and customising — final notes

**On first import.** The workflow loads inactive by default. Don't activate immediately — walk through every node, confirm the credentials are attached, run a manual execution with test data, *then* activate. The Ch. 7 reversibility heuristic applies: workflows that touch external systems on activation deserve more care than ones that just read.

**On adapting.** Every workflow in this library was built against a generic baseline. Your CRM, your help desk, your ESP, your inbox structure — all different from the reference. Expect 30 minutes of adaptation work per workflow before it fits your estate. That's normal. The reference exists to save you the *structural* design time, not the configuration time.

**On contributing back.** If you build a useful variant — an A/B subject-line generator that targets your specific industry, a ticket triage workflow with categories specific to your product — the project repo accepts pull requests. The book gets better when readers improve the references.

**On error handling at scale.** The reference workflows include baseline error handling (Retry On Fail, Stop and Error). For estates running 5+ of these workflows, build one Error Trigger workflow that catches failures across all of them and posts to a shared Slack channel ([Chapter 15](./chapter-15.md)). One global error handler beats twenty inline ones.

**On versioning.** Workflow JSON exports include n8n's version at export time. The references here were exported against n8n v2.x. Older n8n instances may fail to import some nodes (the Execute Sub-workflow Trigger node, for example, doesn't exist in v1.x; old workflows use the Start node). [Chapter 28](./chapter-28.md) covers the migration path.

The library is meant to be a beginning. Build one. Tune it. Build the next. The estate that's running ten customised workflows from this library a year from now is the one that earned its keep.
