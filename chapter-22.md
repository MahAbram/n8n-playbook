---
title: 22. Workflows for business development | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: Four canonical BD/sales workflow patterns in n8n — lead qualification scoring, inbound enrichment, stalled-pipeline follow-up, and meeting-prep briefing. Patterns first, code second.
meta-twitter:title: Learn Automation Working
---

# 22. Workflows for business development

Most BD work is two things at once: high-judgment moments that genuinely require a human (the close call, the contract negotiation, the cold-outreach call), surrounded by *a lot* of low-judgment shuttling work that doesn't. Looking up a lead's company size. Drafting a polite "still thinking about it?" follow-up to a deal that's gone quiet for two weeks. Pulling the right CRM record into a meeting brief at 8:55 AM for a 9 AM call.

The shuttling work is what eats the day. A BD lead at a 40-person SME spends, by most honest accounts, three to five hours a week on tasks that would take them four minutes if their systems were stitched together — and most of those tasks are repeatable enough that they don't need to be done by a human at all. This chapter is about that gap. Four canonical patterns that close it.

The patterns are general — they apply equally to a B2B SaaS sales team in Petaling Jaya, a wholesale-distribution BD lead in Ipoh, and a consulting partner managing inbound enquiries in Kuala Lumpur. The tools vary; the shapes don't.

## Four BD patterns worth knowing

| Pattern | What it does | Most useful when |
|---|---|---|
| **Lead qualification scoring** | Auto-scores incoming leads on intent so the team focuses on the hot ones | High inbound volume; manual scoring is consuming time |
| **Inbound lead enrichment** | Fills in missing context (company size, industry, role) on every new CRM record | Leads arrive with thin data; you need richer context before outreach |
| **Stalled-pipeline follow-up** | Watches the pipeline and nudges the human owner when deals go quiet | Deals slip through cracks because nobody noticed they went silent |
| **Meeting-prep brief** | Builds a one-page brief before each call from CRM + recent activity + previous threads | You walk into calls cold because pre-reading takes 15 minutes you don't have |

None of these replaces the human. Each removes the surrounding shuttling work so the human has time and focus for the actual judgment.

## Pattern 1 — Lead qualification scoring

The most-asked-about BD pattern. A new lead arrives via webhook (form submission, Typeform, custom-built sign-up flow), the workflow enriches and scores them on intent, and routes by score: high to humans for fast follow-up, mid to an SDR queue, low to a nurture sequence.

The node chain:

```
Webhook trigger
  → Edit Fields (strip the form payload to relevant fields)
  → HTTP Request (enrichment lookup — Clearbit, Apollo, your own DB)
  → AI Agent (scoring; output parser for structured 1–5 score + reason)
  → Switch (route by score)
  → Branch outputs: high → Slack + CRM with priority tag, mid → SDR queue, low → nurture list
```

What to watch out for: the AI Agent's scoring quality lives or dies on the system prompt. Generic prompts produce generic scores. The prompt that works is one with explicit scoring criteria, examples of each score level, and explicit instructions about edge cases — written like a brief for a new BD hire. Chapter 19 covered the Structured Output Parser; this is where it earns its keep.

Cost discipline matters here too. At 60 leads a day with a small/cheap model (Claude Haiku, GPT-4o-mini, Gemini Flash), this runs at roughly RM 0.50–2 per day. With a frontier model, it can hit RM 50 per day. For scoring tasks, the small models are usually right — see Chapter 16's cost-control stack.

## Pattern 2 — Inbound lead enrichment

Forms capture three or four fields. Real BD work needs ten. The enrichment workflow pulls the rest from the public web and third-party APIs the moment a new lead lands.

The node chain:

```
Trigger (CRM webhook on new contact OR scheduled poll for new records)
  → HTTP Request (Clearbit / Apollo / People Data Labs by email)
  → Edit Fields (Set) (merge enrichment into the CRM-shaped record)
  → CRM node (update the contact record in place)
  → Slack (optional) ("New lead enriched: [name], [company], [role] at [size] employees")
```

What to watch out for: enrichment APIs are not free, and they're not always accurate. Clearbit charges per lookup; quality varies for SME-sized companies; Malaysian and other South-East Asian SMEs are under-represented in many enrichment datasets. The pragmatic approach is *enrich what you can, accept what you can't, mark missing fields so humans know to fill them*. The Edit Fields *Include in Output* setting from Chapter 17 matters here — you want to merge enrichment into the existing record, not overwrite it.

Caching is the production discipline that saves real money. The same email looked up twice in a month is the same answer; build a small lookup table (Postgres, Supabase, even a Google Sheet) that records previous enrichments and skips the API call if the email was looked up in the last 30 days.

## Pattern 3 — Stalled-pipeline follow-up

Deals go quiet. Sometimes they're dead; sometimes they just got buried. Without a system, the second category gets lost. With a system, the human owner gets a nudge before they have to find the deal by accident.

The node chain:

```
Schedule trigger (daily, 9 AM)
  → CRM node (fetch deals where last_activity > 7 days AND stage NOT IN ('closed-won','closed-lost'))
  → Filter (drop deals not assigned to anyone)
  → AI Agent (optional — draft a follow-up email per deal, gated by approval)
  → Send and Wait for Approval (Slack/Telegram to the deal owner — "Approve / Edit / Skip")
  → CRM node (log activity, schedule next nudge in 7 days)
```

What to watch out for: the cadence has to be right. Daily nudges become noise; once a week is usually too infrequent. Once every 2–3 days for the first nudge, then back off if the human keeps skipping, is a defensible rhythm. The Send and Wait for Approval pattern from Chapter 14 is what gives the human veto power without breaking the workflow's autonomy.

Two anti-patterns worth naming. Don't auto-send the follow-up email without human approval — the cost of a wrong-tone message to a slow-moving deal is high. And don't let the workflow nudge on closed-lost deals; the "closed-lost stage NOT IN" filter is doing real work.

## Pattern 4 — Meeting-prep brief

Five minutes before a call, the workflow pulls everything relevant about the attendee and assembles a one-page brief: CRM record, last three email exchanges, recent CRM notes, company news from a Google search, and the deal's current stage. Brief lands in Slack at T-5.

The node chain:

```
Schedule trigger (every 5 minutes) OR Calendar trigger (event starting soon)
  → Filter (only events with external attendees)
  → For each attendee:
    → CRM lookup (get the contact record)
    → Gmail search (last 3 threads with this person)
    → HTTP Request (Google News / company-news API)
  → AI Agent (summarise into a brief, bulleted)
  → Slack DM to the meeting host (formatted brief, 5 minutes before)
```

What to watch out for: the trigger logic matters more than the content. The wrong trigger fires for every internal stand-up and team meeting, drowning the host in irrelevant briefs. Filter aggressively — external attendees only, calls over 20 minutes only, perhaps only meetings tagged with specific labels.

Privacy is the second consideration. Pulling the last three emails is genuinely useful and genuinely sensitive — if the host has multiple roles or the meeting is confidential, automated email-search may not be appropriate. Make the email-search component opt-in per meeting, not a blanket default.

## Try it yourself: build the lead-scoring workflow

Pick Pattern 1. This is the most-used BD workflow in the playbook and the one that touches the most of Parts III and IV — webhook trigger, enrichment via HTTP, AI scoring with structured output, Switch routing, and notification.

1. **Webhook trigger.** Generate a test URL. Send a sample lead via cURL or Postman:
   ```json
   { "name": "Priya Krishnan", "email": "priya@sigmalogistics.my", "company": "Sigma Logistics", "role": "Director of Operations", "message": "Evaluating tools to replace our dispatch software. Saw your demo. Can we set up a call Thursday?" }
   ```
2. **Edit Fields (Set).** Strip to the five fields the agent needs: `name`, `email`, `company`, `role`, `message`. Set *Include in Output* to *No Input Fields*.
3. **(Optional) HTTP Request** to your enrichment provider. Skip this on the first build — wire it in after the scoring works end-to-end.
4. **AI Agent**, with Chat Model (small/cheap model, temperature 0). System prompt: the lead-scoring brief from Chapter 19's Try-It-Yourself. Attach a Structured Output Parser, schema generated from this example:
   ```json
   { "score": 4, "confidence": "high", "reason": "active deal stage, decision-maker, explicit meeting request" }
   ```
5. **Switch** node, Rules mode, three rules: `score >= 4` (high), `score == 3` (mid), `score <= 2` (low). Fallback Output: *Extra Output* connected to a manual-review log.
6. **High branch**: Slack DM to the deal owner with the lead + score + reason. CRM node to create the contact with a `priority: hot` tag.
7. **Mid branch**: CRM node to add to SDR queue.
8. **Low branch**: CRM node to add to nurture list.

**You'll know it worked when** Priya lands on the *high* branch with a score of 4 or 5, a Slack DM arrives in the deal owner's inbox within seconds, and the CRM contact is created with the `priority: hot` tag. Re-run with a thinner lead — `{ "name": "Anon", "email": "test@example.com", "company": null, "message": "i want info" }` — and confirm it lands on *low*. Both paths exist, both fire, no items go to the manual-review fallback. That's the qualification engine working.

## The takeaway

- **BD work is high-judgment moments surrounded by low-judgment shuttling.** Workflow patterns target the shuttling, not the judgment.
- **Four canonical patterns cover most BD automation.** Lead qualification scoring (route hot leads fast), inbound enrichment (richer context per record), stalled-pipeline follow-up (don't let deals slip), meeting-prep brief (walk into calls warm).
- **None of these replaces the human BD lead.** Each gives them more time and focus for the actual relationship work.
- **AI scoring quality lives in the system prompt.** Treat it like a brief for a new hire — explicit criteria, examples, edge cases.
- **Enrichment APIs cost money; cache results.** A 30-day lookup table saves real budget.
- **Stalled-deal nudges need cadence and veto power.** Send and Wait for Approval gives both.

## What's next

Chapter 23 moves to customer success — where the work is reactive rather than proactive, and the patterns shift accordingly. Ticket triage that routes by urgency and topic. Automated FAQ-style replies grounded in your knowledge base (cashing in Chapter 21's RAG). Sentiment-driven escalation that gets angry customers to humans fast. SLA tracking that knows when a ticket is about to breach. The same kind of pattern survey, this time for the support side of the house.
