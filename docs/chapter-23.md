---
title: 23. Workflows for customer success | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: Four canonical customer-success workflow patterns in n8n — ticket triage with classifier + sentiment, knowledge-base FAQ replies, post-resolution survey with low-CSAT recovery, and SLA tracking with proactive alerts.
meta-twitter:title: Learn Automation Working
---

# 23. Workflows for customer success

A CS team's day is structurally different from BD's. BD reaches out; CS gets reached out to. The work is *reactive* — tickets arrive, the team responds. Volume varies hour to hour. The hard tickets need humans; the FAQ-shaped ones don't. The angry tickets need humans *fast*; the routine ones can wait.

Most SME CS leads spend their mornings doing four things badly: triaging (sorting tickets to the right queue), repeating themselves (answering the same five questions for the seventh time this week), surveying (chasing resolved customers for feedback), and watching the clock (noticing which tickets are about to breach SLA). None of those is what they're paid for. They're paid for the hard tickets — the genuinely-frustrated customer, the unclear bug report, the renewal conversation that's wobbling.

This chapter is about closing the gap. Four patterns that take the four mornings-eaten tasks above and turn them into background workflows, so the human's time is spent on the work only a human can do.

## Four CS patterns worth knowing

| Pattern | What it does | Most useful when |
|---|---|---|
| **Ticket triage with classifier + sentiment** | Auto-routes incoming tickets by topic and tone | Inbound volume is high enough that humans triage instead of solve |
| **Knowledge-base FAQ replies** | Drafts grounded answers from your own docs for common questions | Same questions keep coming back; team is repeating themselves |
| **Post-resolution survey + low-CSAT recovery** | Sends CSAT after every ticket; routes unhappy responses back to a human | You want feedback signal without manual outreach |
| **SLA tracking with proactive alerts** | Watches the queue and warns the human before a ticket breaches | Tickets slip past SLA because nobody noticed they were getting close |

Two reactive (triage, FAQ replies), two proactive (survey, SLA). A working CS automation stack uses all four.

## Pattern 1 — Ticket triage with classifier + sentiment

The most-used CS workflow in the playbook. Every inbound ticket gets classified by category and scored for sentiment. Routine + calm tickets go to the standard queue; angry tickets go to a manager's queue with a Slack alert.

The node chain:

```
Email Trigger / Zendesk / Intercom / Freshdesk trigger
  → Text Classifier (Billing / Technical / Feature Request / Account / Other)
  → [each category output: Sentiment Analysis]
  → Switch on sentiment (Negative → manager queue; Positive/Neutral → standard queue)
  → Helpdesk node (assign to queue, tag with category + sentiment)
  → Slack alert (only for Negative sentiment + high-tier customers)
```

What to watch out for: category descriptions are everything (Chapter 20 covered this in depth). Treat each as a brief for a new hire — what kind of ticket belongs here, what *doesn't* despite looking similar. Vague descriptions produce vague routing.

Temperature must be 0 on the Chat Model sub-node for both nodes. Default sampling produces inconsistent classifications — the same ticket gets routed to Billing on Monday and Account on Wednesday. Determinism matters more here than creativity.

Two other watch-outs. Don't escalate every Negative sentiment to the manager — for customers on free tiers or low-value plans, route to a senior CS rep instead. And don't classify on subject line alone; the body usually contains the real signal. The Text Classifier's Input Prompt should be `{{ $json.subject }}\n\n{{ $json.body }}`.

## Pattern 2 — Knowledge-base FAQ replies

The pattern that pays off Chapter 21's RAG groundwork in production form. Ticket arrives, the workflow searches your knowledge base for relevant passages, an AI Agent drafts a reply grounded in those passages, a human approves or edits before it sends.

The node chain:

```
Trigger (new ticket of category Billing OR Technical, per Pattern 1's routing)
  → AI Agent
      ├── Chat Model
      ├── Vector Store Question Answer Tool → Vector Store (your knowledge base)
      └── (optional) Account-lookup Tool → CRM
  → Send and Wait for Approval (Slack/Telegram to the CS lead — "Approve / Edit / Skip")
  → Helpdesk node (post the reply, transition ticket to Awaiting Customer)
```

What to watch out for: the gating step is non-negotiable. Letting AI replies send automatically to customers is the kind of failure mode that ends up in a screenshot on social media. The Send and Wait for Approval primitive from Chapter 14 is what separates "AI-assisted reply drafting" from "AI customer-service-bot we read about in the post-mortem."

System-prompt discipline matters more here than in BD. Tell the model explicitly to refuse when the retrieved knowledge doesn't contain the answer — *"If the documents don't answer the question, write only 'I don't have that information' and stop."* Then teach the CS lead to recognise that response as the signal to take over manually. The alternative is confidently-worded fabrication, which is worse than no answer at all.

One operational note: the knowledge base doesn't have to be exhaustive on day one. Start with the top 20 most-asked questions, RAG-ify only those, and expand as you see patterns in the un-answered tickets.

## Pattern 3 — Post-resolution survey + low-CSAT recovery

Every closed ticket triggers a survey 24 hours after resolution. High CSAT scores get archived. Low CSAT scores get routed back to a human, with the original ticket context, for recovery outreach.

The node chain:

```
Helpdesk trigger (ticket status changed to Resolved/Closed)
  → Wait (24 hours)
  → Gmail / Send Email (CSAT survey link — Typeform, native helpdesk survey, or n8n-hosted Form)
  → Wait → Webhook (resume on survey submission, or timeout after 7 days)
  → Switch on CSAT score (≤ 3 → recovery branch; ≥ 4 → archive + thank-you)
  → Recovery branch: assign back to the original agent (or escalate to a manager); Slack alert with the original ticket + survey response
```

What to watch out for: survey fatigue is real. Don't survey *every* ticket if your volume is high — sample 30-50% randomly, or survey only tickets that took more than two replies. The other anti-pattern is surveying customers immediately after resolution; 24 hours later, when the emotional response has settled, produces more honest signal.

The recovery branch is where this pattern earns its keep. The point of automating the survey isn't the survey — it's *catching the unhappy customer before they churn silently*. The recovery branch should land in a human's queue within minutes of a low CSAT, with full context: the original ticket, every reply, the rating and the verbatim comment.

## Pattern 4 — SLA tracking with proactive alerts

A scheduled workflow watches the open ticket queue and alerts the human owner when a ticket is approaching its SLA deadline. Hard-breached tickets get escalated to a manager. The point is to make the deadline visible *before* the breach, not document it after.

The node chain:

```
Schedule trigger (every 15 minutes)
  → Helpdesk node (fetch open tickets where status NOT IN ('Resolved','Closed'))
  → Edit Fields (compute time-to-SLA = sla_deadline - now)
  → Switch on time-to-SLA:
      → < 0 (breached): escalate to manager, log to breach-tracking sheet
      → < 30 min: Slack DM to the owner — "URGENT: ticket #X approaching SLA"
      → < 2 hours: standard Slack DM to the owner
      → > 2 hours: no action
```

What to watch out for: the SLA deadline calculation depends on business hours, holidays, and customer tier. A ticket opened at 4 PM Friday with a 24-hour SLA shouldn't fire breached at 4 PM Saturday — the SLA pauses out of hours. Get the business-hours math right in the Edit Fields step, using Luxon's date arithmetic from Chapter 12.

Don't alert too aggressively. Three escalating alerts per ticket (4 hours out, 30 minutes out, breached) is the limit before alert fatigue kicks in. After the breached alert, the system should go quiet — the manager has been told; further alerts add nothing.

## Try it yourself: ticket triage workflow

Pick Pattern 1. This is the most universally applicable CS workflow and the one that requires no existing knowledge base — runnable on any test instance in 15 minutes.

1. **Manual Trigger.** Pin sample data with three example tickets (mix categories and tones — billing-angry, technical-neutral, feature-request-positive).
2. **Text Classifier**. Connect a Chat Model sub-node (small/cheap model, temperature 0). Define four categories with full descriptions (treat each as a brief; see Chapter 20). Set *Fallback Output* to *Extra Output* and wire it to a manual-review log.
3. **For each category branch (except fallback): a Sentiment Analysis node.** Same Chat Model, temperature 0. Default categories (Positive / Neutral / Negative). Include Detailed Results enabled.
4. **For each sentiment branch: an Edit Fields (Set) node** that labels the item with `{ "category": "<category>", "sentiment": "<sentiment>", "priority": "<computed>" }`. Priority is `urgent` when sentiment is Negative, else `standard`.
5. **Merge all branches back together with a Merge node** (Append mode).
6. **(Optional) Helpdesk node** to update the ticket — assign to queue based on category, tag with sentiment, set priority.
7. **(Optional) Slack node** that fires only when priority is `urgent`, posting to the CS-managers channel with the ticket summary.

**You'll know it worked when** each of your three test tickets lands with a sensible category + sentiment + priority combination, the urgent one (billing-angry) generates a Slack alert, and the routine ones don't. Re-run with identical inputs — the classifications should be identical thanks to temperature 0. If they vary between runs, your temperature isn't actually 0 on one of the Chat Model nodes.

This pattern, fully built, takes a real CS team's first hour of every morning and turns it into a background process.

## The takeaway

- **CS work is reactive — tickets arrive, the team responds.** Patterns that automate the surrounding work (triage, repetitive replies, surveys, deadline tracking) free the humans for the actual hard tickets.
- **Four canonical patterns cover most CS automation.** Triage (Pattern 1), KB-grounded replies (Pattern 2), survey-and-recovery (Pattern 3), SLA tracking (Pattern 4). Use all four together for a working stack.
- **AI-generated replies must be human-approved before they send to customers.** The Send and Wait for Approval primitive (Chapter 14) is non-negotiable in this context.
- **Set Chat Model temperature to 0 for all classification work.** Determinism matters more than creativity for routing decisions.
- **Don't survey every ticket; do route low-CSAT responses straight to humans.** The point of survey automation is catching unhappy customers, not generating data.
- **SLA tracking needs business-hours math.** A 24-hour SLA doesn't include the weekend; build the calculation with Luxon's date arithmetic from Chapter 12.

## What's next

Chapter 24 moves to finance and ops — where the patterns shift again. The work is data-intensive (invoices, receipts, ledger entries, bank reconciliation), accuracy-critical (a wrong number costs real money), and audit-trail-sensitive (regulators may want to see what ran when). You'll see how the Information Extractor (Chapter 20) handles invoices, how the Loop Over Items (Chapter 16) handles month-end reconciliation, and how the Error Trigger workflow (Chapter 15) handles the failure modes that genuinely matter in money workflows.
