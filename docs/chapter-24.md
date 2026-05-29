---
title: 24. Workflows for finance and ops | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: Four canonical finance and ops workflow patterns in n8n — invoice extraction to ledger, expense-approval routing, payment-failure dunning, and month-end reconciliation.
meta-twitter:title: Learn Automation Working
---

# 24. Workflows for finance and ops

Finance and ops work is structurally different from both BD and CS. It's *data-intensive* (invoices, receipts, ledger entries, bank statements, currency conversions). It's *accuracy-critical* — a wrong number isn't a polish issue, it's a real-money mistake. And it's *audit-trail-sensitive*: regulators and auditors will eventually want to see what ran when, who approved what, and why a particular journal entry exists.

The asymmetry matters too. A wrong row in a sales pipeline is annoying. A wrong row in a ledger compounds into a wrong P&L, a wrong tax filing, a wrong board report. Reversibility is harder to come by. Which means the workflows in this chapter lean heavier on Chapter 14's human-in-the-loop gating, Chapter 15's error workflows, and Chapter 17's Set-node hygiene than any other role chapter in Part V.

Four patterns cover most SME finance/ops automation. Each takes a recurring chore that drains a finance lead's week and turns it into a background process — with a human always retaining the final approval on anything that moves money.

## Four finance patterns worth knowing

| Pattern | What it does | Most useful when |
|---|---|---|
| **Invoice extraction to ledger** | Pulls fields from PDF invoices and writes them to your accounting system | Vendors send PDFs by email and someone retypes them into Xero/QuickBooks |
| **Expense-approval routing** | Routes submitted expenses through policy checks and the right manager | Expense submissions arrive by email or form and bottleneck on manual review |
| **Payment-failure dunning** | Sends graduated reminders to customers with failed or overdue payments | DSO is creeping up because chasing falls between the cracks |
| **Month-end reconciliation** | Diffs accounting data against bank-feed records, flags mismatches | Month-end takes two days because reconciliation is manual |

All four share a common stance: the workflow does the data-shuttling; the human approves anything that touches money.

## Pattern 1 — Invoice extraction to ledger

The pattern that cashes in Chapter 20's Information Extractor in production form. PDF invoice arrives by email, the workflow extracts the structured fields, a human approves, and the entry lands in your accounting system.

The node chain:

```
Email Trigger (filter: has PDF attachment, from known vendor list)
  → Extract from File (PDF → text)
  → Information Extractor (vendor name, invoice number, total, tax, due date, line items)
  → Edit Fields (Set) (compute account code from vendor; format date)
  → Send and Wait for Approval (Slack to finance lead: "Approve, Edit, or Skip")
  → Xero / QuickBooks / accounting system node (create draft bill)
```

What to watch out for: the extraction quality drops on long or complex invoices. Multi-page bills with itemised tables push the model's context, and dates in mixed formats (`15-Jan-2026` vs `01/15/26`) confuse the schema. Two mitigations from Chapter 20 apply: enable Auto-Fixing on the parser, and extract dates as strings — parse them downstream with Luxon, which respects the local format you specify.

The human-approval step is non-negotiable here even though the workflow only creates a *draft* bill (not a posted one). The cost of a wrong vendor or wrong amount slipping into the accounting system is high enough that the 30 seconds of approval saves real reconciliation pain later. Send and Wait for Approval (Chapter 14) is the natural primitive.

Vendor onboarding is the related pattern that often sits alongside this one — when an invoice arrives from an unknown vendor, the workflow flags it for manual review and KYC instead of attempting extraction.

## Pattern 2 — Expense-approval routing

An expense submission lands (form, email, mobile app). The workflow classifies it against company policy, computes which manager should approve based on amount and category, sends them an approval prompt, and writes the result to the finance system.

The node chain:

```
Form Trigger / Email Trigger (expense submission)
  → Edit Fields (Set) (extract amount, category, employee, receipt URL)
  → Switch (policy classification: routine / requires-receipt-review / over-policy-threshold)
  → For each branch: compute approver (amount > RM 5,000 → finance director; else → line manager)
  → Send and Wait for Approval (Slack/Email to the approver)
  → On approve: write to finance system, post confirmation to the employee
  → On reject: send rejection with reason to the employee, log to compliance sheet
```

What to watch out for: don't conflate "policy compliance" with "approval." The Switch should check policy first (is the expense category allowed at all, is the amount within per-trip limits) before routing to a human. Policy violations should *not* reach a human approver — they should reject automatically with a clear reason, saving the human's time for the genuinely-judgmental cases.

The Send and Wait for Approval primitive on Slack works best here because the approver can act from their phone in 30 seconds. The same workflow on email adds latency that frustrates everyone. Match the channel to the approver's workflow, not your preference.

Audit trail matters: every approval, rejection, and policy check should write a timestamped row to a permanent log (Postgres, Airtable, or even Google Sheets at SME scale). Six months from now, "who approved the RM 7,200 conference expense" is a question someone will ask.

## Pattern 3 — Payment-failure dunning

Overdue invoices don't chase themselves. A workflow that watches AR, identifies overdue invoices, and sends graduated reminders recovers more revenue than any other ops automation — and the work it removes from the human's plate is exactly the kind of repetitive task they hate doing.

The node chain:

```
Schedule trigger (daily, 9 AM)
  → Accounting node (fetch invoices where status = Overdue AND days_overdue > 0)
  → Switch on days_overdue:
      → 1–7 days: gentle reminder email (template, no approval needed)
      → 8–30 days: firmer email, copy account owner (Send and Wait if customer is high-value)
      → 31–60 days: AI-drafted personalised email, gated by Send and Wait
      → 60+ days: escalate to manager — no automated send, alert only
  → Accounting node (log the chase activity to the invoice)
```

What to watch out for: tone calibration is what makes or breaks this pattern. Gentle reminders work for the first week — a polite "this is overdue, here's the link to pay" lands fine. Past 30 days, the message needs to acknowledge that this is becoming a problem, while not damaging the relationship. AI-drafted personalised messages help, gated by Send and Wait so a human sees the tone before it sends.

The 60-day threshold is the natural escalation point. Beyond that, automated dunning becomes counterproductive — the workflow should *stop sending* and route to a human for direct outreach. The right reminder cadence avoids the worst case where a five-week-overdue customer gets two automated chase emails after they've already had an apology conversation with the account manager.

## Pattern 4 — Month-end reconciliation

Month-end takes finance teams two days. Most of those two days is comparing two sources of truth — what the accounting system says happened versus what the bank statement says happened — and chasing down the differences. Automating the diff doesn't eliminate the human's role, but it does deliver them a ranked list of *only the actual discrepancies* instead of 800 line items to scan manually.

The node chain:

```
Schedule trigger (first business day of each month)
  → Accounting node (fetch all transactions for prior month)
  → HTTP Request OR Bank API node (fetch bank statement transactions for same period)
  → Merge node (Combine by Field on date + amount)
  → Filter (only unmatched items)
  → Edit Fields (categorise: missing-from-bank, missing-from-books, amount-mismatch)
  → Google Sheets node (write report)
  → Slack node (notify finance lead: "Month-end reconciliation: 23 discrepancies to review")
```

What to watch out for: matching logic gets subtle fast. Same-day same-amount is the easy case. But banks settle transactions on different dates than they post, currency conversions introduce sub-cent rounding differences, and batch payments aggregate multiple invoices into one bank line. The Merge node's Combine by Field works for the easy 80%; the rest needs Edit Fields with explicit matching rules.

Two safety nets matter. Don't auto-create journal entries from this workflow — write to a report, let the finance lead decide what to post. And keep a "matched within tolerance" column with the actual difference; sub-RM 1 mismatches are often FX rounding and can be auto-categorised, but they should still be visible in the audit trail.

## Try it yourself: invoice extraction workflow

Pick Pattern 1. The Information Extractor finally cashes in here, on the canonical use case the Ch. 20 chapter described but didn't build.

You'll need: one sample invoice PDF (any vendor invoice you own, or generate one from a template). An accounting credential is optional — skip the last step if you don't have one connected. ~15 minutes.

1. **Manual Trigger.** (Switch to Email Trigger later for production.)
2. **HTTP Request** (or **Read Binary File**) to fetch the PDF. Set Response Format to *File*.
3. **Extract from File** node. Input: the PDF binary from step 2. Operation: Extract Text from PDF.
4. **Information Extractor** node. Schema mode: *From Attribute Descriptions*. Define these attributes:
   - `vendor_name` (string, required) — "The name of the company that issued the invoice"
   - `invoice_number` (string, required) — "The vendor's invoice reference number"
   - `total_amount` (number, required) — "The total amount due, in the invoice's currency, as a decimal"
   - `currency` (string) — "The three-letter currency code, e.g. MYR, USD, SGD"
   - `tax_amount` (number) — "The tax portion of the invoice"
   - `due_date` (string) — "The due date as written on the invoice, formatted as YYYY-MM-DD"
   - `line_items` (array of objects) — "Each line item with description, quantity, unit_price, line_total"
5. Connect a **Chat Model** sub-node (small/cheap model, temperature 0). Enable Auto-Fixing.
6. **Edit Fields (Set)** node to compute derived fields: invoice age, account code (look up from a vendor → code mapping table), entered_by ("automated").
7. **Send and Wait for Approval** (Slack to yourself). Message body includes the extracted fields formatted for quick review.
8. **(Optional) Xero / QuickBooks node** to create a draft bill on approval.

**You'll know it worked when** the Information Extractor returns a clean JSON object with all the fields populated correctly, the Slack approval prompt shows the vendor/amount/due-date at a glance, and approving creates a draft (not posted) bill in your accounting system. Try a second invoice with a different layout — a different vendor, different currency, different date format — and watch whether the same workflow handles it. If a field fails, it tells you whether the schema needs tightening, the prompt needs an example, or the input PDF is the kind that needs human review.

## The takeaway

- **Finance/ops work is data-intensive, accuracy-critical, and audit-trail-sensitive.** Patterns lean heavier on human-approval gating than other role chapters.
- **Four canonical patterns cover most SME finance automation.** Invoice extraction, expense-approval routing, payment-failure dunning, month-end reconciliation. Reactive (1, 2) and proactive (3, 4) balanced.
- **Information Extractor is the workhorse for documents.** PDFs in, structured fields out. Pair with Auto-Fixing and string-typed dates parsed downstream with Luxon.
- **Send and Wait for Approval is non-negotiable on anything that moves money.** Even when the workflow creates *drafts* rather than posted records.
- **Policy checks come before human routing.** Don't waste a manager's approval on a policy violation that should auto-reject.
- **Audit trail everything.** Permanent timestamped logs for approvals, rejections, reconciliation mismatches, and chase activity. Six months from now, someone will ask.

## What's next

Chapter 25 moves to marketing — where the patterns shift toward *outbound* (broadcast sends, lead-magnet delivery, content assembly) and the failure modes are different again. A wrong tax filing is a regulatory problem; a wrong subject line on a 12,000-recipient broadcast is a different kind of problem. You'll see how the Send and Wait for Approval primitive from Chapter 14 finally cashes in on its cold-open scenario, how multi-source content assembly works, and how to A/B-test subject lines without burning your sender reputation.
