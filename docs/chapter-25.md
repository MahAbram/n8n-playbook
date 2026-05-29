---
title: 25. Workflows for marketing | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: Four canonical marketing workflow patterns in n8n — broadcast approval gates, A/B subject-line variant generation, content calendar assembly, and post-event follow-up sequences.
meta-twitter:title: Learn Automation Working
---

# 25. Workflows for marketing

Marketing work is *outbound*, *brand-stakes-sensitive*, and *creative-judgment-heavy* — three constraints that shape the patterns in ways the BD, CS, and finance chapters don't have to deal with. Outbound means each automated step actively reaches a real human, often at scale. Brand-stakes means a wrong subject line on a 12,000-recipient blast isn't a polish issue — it's a brand event you can't recall. Creative-judgment-heavy means the patterns don't replace the marketer's instinct; they make space for it by removing the surrounding mechanics.

A typical SME marketing lead spends their week roughly half-half: half on the actual creative work (writing, briefing, deciding what message goes where), and half on the assembly and coordination around it (pulling drafts from three places, scheduling across channels, reviewing approvals, following up on events). The patterns in this chapter target the second half. The creative work stays human.

## Four marketing patterns worth knowing

| Pattern | What it does | Most useful when |
|---|---|---|
| **Broadcast approval gate** | Pauses mass sends for human review before they fire | Sending to lists above a few hundred where a mistake compounds |
| **A/B subject-line variant generation** | AI drafts 3–4 subject-line variants; human picks one or A/Bs | You're hand-writing every subject line and want to test more often |
| **Content calendar assembly** | Pulls drafts, briefs, and assets from multiple sources into one editorial view | Content lives across Notion + Drive + Slack and weekly assembly is manual |
| **Post-event follow-up sequence** | Sends branched follow-up emails based on whether each attendee showed up | Post-webinar/event follow-up depends on attendance and is currently manual |

Two reactive (broadcast, A/B), two proactive (calendar, follow-up). A working marketing stack uses all four.

## Pattern 1 — Broadcast approval gate

The pattern Chapter 14's cold open promised. A campaign is ready to send to 12,000 recipients. The workflow assembles it, generates the final HTML, hosts a preview link, and pauses for human approval before the actual send fires.

The node chain:

```
Trigger (Schedule for newsletters; Form Trigger for ad-hoc campaigns)
  → Edit Fields (Set) (consolidate subject, body, segment, recipient count)
  → AI Agent or templating step (final HTML render)
  → Google Drive / S3 upload (host the HTML preview at a temporary URL)
  → Send and Wait for Approval (Slack to marketing lead — subject, count, preview URL, Approve/Reject)
  → On Approve: Gmail / Mailchimp / SendGrid send to the full list
  → On Reject: log to "campaigns-not-sent" sheet with the reason
```

What to watch out for: the approval message needs to be readable on a phone in three seconds. Don't try to embed the full HTML in the Slack message — corporate email clients (Outlook in particular) strip styling, and the rendered preview looks wrong in a way that makes the approver hesitate. The cleaner pattern is *plain-text summary in the approval prompt + link to a hosted preview*. The approver sees subject, recipient count, and first 200 characters of body in chat; clicks the link to see the rendered version in a browser when they want the full picture.

The *Limit Wait Time* setting (Chapter 14) is critical here. A 4-hour limit with a fallback path means a Friday-afternoon campaign doesn't sit in approval purgatory all weekend. The fallback should route to "queued for Monday review," not auto-send.

One operational note: separate the *test send* from the *production send*. Always send a final test to a sample group (the marketing team's own inboxes) before the approve-and-blast step. The test-send catches HTML rendering issues that even the preview link doesn't show — the way Gmail handles dark-mode background colours, the way Outlook treats inline CSS — and gives the approver one last sanity check.

## Pattern 2 — A/B subject-line variant generation

Subject lines drive open rates, and most teams under-test theirs because hand-writing variants is tedious. The workflow generates 3–4 brand-tone-matched variants from a brief, the marketing lead picks one (or sets up an A/B test), and the campaign proceeds.

The node chain:

```
Manual Trigger or Form input (body draft, audience, campaign goal)
  → AI Agent (system prompt: brand voice + tone examples; generate 4 subject lines)
  → Structured Output Parser (return as array of {subject, rationale})
  → Send and Wait for Response (Telegram or Slack — present 4 options; collect choice)
  → On choice: write selected subject to campaign record; pass downstream to Pattern 1
```

What to watch out for: brand voice is everything. A generic AI prompt produces generic subject lines that hit the trash folder. The system prompt should include 5–10 examples of *your team's* best historical subject lines, with brief annotations of why each worked. Treat this prompt as living documentation; update it quarterly as the team's voice evolves.

Avoid one anti-pattern: don't let the AI auto-pick the subject line based on predicted open rate. The model's prediction is unreliable at SME scale (not enough training signal) and the resulting subject lines drift toward clickbait that hurts long-term sender reputation. Keep the human picking, with the AI generating options.

For genuine A/B testing, structure the workflow to send two variants to small samples first, measure 4-hour open rate, then auto-send the winner to the remainder. That's a more elaborate flow but earns its keep on lists over 5,000 recipients.

## Pattern 3 — Content calendar assembly

Marketing content lives in fragments — drafts in Notion, briefs in Slack threads, asset files in Drive, scheduled items in Asana or Trello. The Monday-morning ritual of consolidating "what's shipping this week" is 45 minutes of clicking between tabs. A workflow that assembles the same view automatically delivers it before the standup.

The node chain:

```
Schedule trigger (every Monday, 7 AM)
  → Notion node (fetch posts in current week, status In Draft or Scheduled)
  → Slack node (fetch tagged messages from #content-briefs channel from past week)
  → Google Drive node (list new assets in /content/upcoming folder)
  → Merge (Combine by Field on a campaign tag, or just Append for a flat list)
  → AI Agent (optional — summarise into a structured weekly view)
  → Notion / Google Doc node (write to a "This Week" page or doc)
  → Slack DM (post the link to the marketing channel)
```

What to watch out for: the workflow's job is *assembly*, not *editing*. Don't let the workflow modify the source records (the Notion drafts, the briefs) — read-only access. The output is a derived view that updates fresh each Monday. If the marketing lead wants to edit, they edit the original source, and next Monday's view reflects it.

Source-of-truth discipline matters. If three different systems each claim to know "what we're shipping this week," none of them is right. The assembly workflow doesn't fix that — it makes the problem visible. Decide which system is canonical (most often Notion for editorial calendars) and treat the others as inputs to it.

## Pattern 4 — Post-event follow-up sequence

A webinar ends. Some attendees showed up; some registered but didn't. The right follow-up is different for each group: showed-up gets the recording plus a content-deepening CTA; didn't-show gets the recording plus a "sorry we missed you" with the slides. A workflow that branches on attendance and runs a 7-day sequence beats manually segmenting after every event.

The node chain:

```
Manual Trigger (post-event, attended list imported as CSV) OR Zoom/Webinar API trigger
  → Switch on attended status: showed-up branch vs no-show branch
  → For each branch:
    → Send first email (recording + branch-specific CTA)
    → Wait 3 days
    → Send second email (related content, contextualised by branch)
    → Wait 4 days
    → Send third email (soft pitch: book a call, join the next event)
  → For high-engagement responses (replies, link clicks tracked via webhook): route back to BD as warm leads
```

What to watch out for: the 7-day sequence is the maximum. Beyond that, the event is stale — attendees who haven't engaged by day 7 won't engage on day 14. Keep the sequence tight and accept the cutoff.

Cadence between emails matters more than the email count. Three emails spaced 1 day apart feels desperate. Three emails spaced 3, 4, and N days respects the recipient's inbox. The Wait nodes from Chapter 14 are doing real pacing work here.

The handoff to BD on the engagement signal is what makes this pattern earn its keep. A no-show who clicks the recording link two days later is a warm lead the event was specifically designed to generate. Without the routing, that signal disappears into the campaign's analytics tab.

## Try it yourself: broadcast approval gate

Pick Pattern 1. This is the workflow that's been promised since Chapter 14's cold open, and it's runnable in 15 minutes without a real recipient list.

1. **Manual Trigger.** Pin sample data with one campaign-ready record:
   ```json
   { "subject": "Last 48 hours: workshop early-bird pricing ends Friday", "body_preview": "Reminder that early-bird pricing for the Friday workshop closes at midnight Wednesday...", "recipient_count": 12000, "segment": "engaged-subscribers-MY", "preview_url": "https://your-test-url.example.com/preview/123" }
   ```
2. **Edit Fields (Set)** to format the approval message body:
   ```
   📨 Campaign ready to send
   Subject: {{ $json.subject }}
   Recipients: {{ $json.recipient_count }} ({{ $json.segment }})
   Preview: {{ $json.body_preview }}...
   Full preview: {{ $json.preview_url }}
   Approve to send. Reject to cancel.
   ```
3. **Send and Wait for Response** (Slack or Telegram — whichever you use). Response Type: *Approval*. Approve Button Label: "Send to all". Disapprove Button Label: "Hold for review". Limit Wait Time: 4 hours.
4. **Switch** on the response:
   - On *Approve*: a Set node that logs `{ "status": "sent", "approved_by": "...", "sent_at": "..." }`. In production, this is where you'd wire the actual Gmail/Mailchimp/SendGrid send.
   - On *Reject*: a Set node that logs `{ "status": "held", "reviewed_by": "...", "reviewed_at": "..." }` to your campaigns-not-sent record.
   - On *Timeout* (no response within 4 hours): route to a "queued for Monday review" branch.

**You'll know it worked when** the Slack approval prompt arrives with the right summary, you can approve and the right downstream branch fires, you can reject and the right downstream branch fires, and you can let the 4-hour limit expire (set it to 1 minute for testing) and watch the timeout branch fire. Three paths, three outcomes, no executions stuck waiting.

In production, the two final swaps are: replace the Manual Trigger with whatever creates your campaigns (Schedule for newsletters, Form for ad-hoc), and replace the *log to sheet* Set node on the Approve branch with the actual send node. Everything in between stays.

## The takeaway

- **Marketing patterns target the assembly and coordination work, not the creative work.** The human writes the message; the workflow handles the surrounding mechanics.
- **Four canonical patterns cover most SME marketing automation.** Broadcast approval gate, A/B variant generation, content calendar assembly, post-event follow-up sequence.
- **Brand-tone discipline lives in the system prompt.** A/B subject-line generation needs 5–10 examples of your team's best historical lines, treated as living documentation.
- **Don't embed full HTML in approval prompts.** Plain-text summary in chat plus link to a hosted preview is the cleaner pattern; corporate email clients strip styling and break in-message rendering.
- **Always send a final test to your own team before approving the production send.** The preview link doesn't catch every rendering issue; the test send catches the rest.
- **Wait-node cadence is what makes follow-up sequences feel respectful rather than desperate.** 3–4 days between emails; 7-day cutoff.

## What's next

Chapter 26 closes Part V with personal automations — the workflows you build for yourself, not the team. The Daily Briefing Bot that lands in your inbox at 7 AM with calendar, weather, news, and the day's first three Slack threads. The receipt-to-spreadsheet pipeline that turns your phone's camera into expense capture. The networking enrichment that fills in context on every new contact. None of these moves the team's needle directly. All of them quietly raise the floor of what your day starts from.
