---
title: 14. How do you pause a workflow for a human? | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: Wait nodes and approval gates in n8n — when to pause, how to resume, and which actions deserve a human in the loop before they fire.
meta-twitter:title: Learn Automation Working
---

# 14. How do you pause a workflow for a human?

You built a marketing-broadcast workflow last week. Pull the subscriber list from HubSpot, segment by tag, draft the campaign with an AI Agent, generate the HTML, schedule the Gmail blast. The test run looks great — three test sends to your own accounts arrive perfectly formatted.

It's Monday morning. The workflow is about to fire against the real list. Twelve thousand customers.

You pause. The draft is good, but you'd really like to read the final HTML once more before that send button gets pressed for 12,000 people. Not because you don't trust the workflow. Because of what happens if you're wrong: there's no recall, no undo, no second chance to fix a typo or notice that the AI's subject line accidentally said *Dear {{firstName}}* with the braces still in.

What you want is a workflow that does everything up to the send — and then pauses, sends *you* the draft, waits for you to click *Approve* on your phone, and only then fires the real send. This chapter is about how to build that, and the related family of patterns where a workflow needs to stop and wait for *something* — a human decision, a clock, an external system — before continuing.

## Three reasons a workflow needs to wait

There are exactly three reasons to insert a pause in an otherwise-automatic workflow. Recognising which one you're solving tells you which tool to reach for.

- **Irreversibility** — the next step is big enough that you want a human to sign off before it fires. Mass sends, large transfers, public publication, deletes. The fix is an approval gate.
- **Timing** — the next step needs to happen at a specific moment, not as fast as possible. Wait for business hours, wait for a rate-limit window to reset, wait five minutes for an async upload to finish processing. The fix is a time-based wait.
- **External dependency** — the next step depends on something happening outside n8n that you can't poll for. A third-party API will call you back when ready, a sub-workflow will signal completion, a customer will click a confirmation link. The fix is a webhook-based wait.

Each has a different tool. The first one — irreversibility — is the most common and has the cleanest answer in modern n8n, so it's where we start.

## Send and Wait for Response — the easy approval gate

Several app nodes have a built-in operation that fuses a send with a pause: the node sends a message, the workflow pauses until the recipient responds, and on response the workflow resumes with the answer available downstream.

The operation is called **Send and Wait for Response** on Slack, Telegram, Send Email, Discord, WhatsApp Business Cloud, and the LangChain Chat node. **Gmail** is the odd one out: same primitive, but the operation is called *Send and Wait for Approval* and offers fewer response types. The naming inconsistency is a known docs-side quirk; whichever menu label you see, you're configuring the same underlying mechanism.

You don't write any webhook plumbing. n8n hosts the response URLs, embeds them in the message as buttons (or a form), and handles the resume.

### Three response types

Most of the channels offer three response shapes. Pick the one that fits what you need from the recipient.

- **Approval** — two inline buttons in the message (default labels *Approve* and *Decline*). Use when the question is binary. Returns `{ "data": { "approved": true | false } }`. This is the most common type and the one to default to.
- **Free Text** — sends a message with a *Respond* button that opens an n8n-hosted form for a typed answer. Use when the response is content, not a binary decision: "Approve, edit, or paste replacement copy."
- **Custom Form** — a multi-field form configured in the node itself. Use when you need structured input: a reason code, a priority override, a deadline.

Gmail offers Approval only.

### The 12,000-recipient broadcast pattern

For the cold-open scenario, the configuration is:

1. After the campaign-drafting nodes, insert a **Slack** node (or Gmail — whichever the approver actually checks at 9 AM).
2. **Operation**: *Send and Wait for Response* (or *Send and Wait for Approval* on Gmail).
3. **Response Type**: *Approval*.
4. **Channel/Recipient**: yourself or the marketing lead.
5. **Message**: a preview of the campaign — subject line, recipient count, first 200 characters of body, and a link to the full draft.
6. **Type of Approval**: *Approve and Disapprove* (vs. the default *Approve Only*).
7. **Limit Wait Time**: 4 hours.
8. Connect the approve output to the Gmail-send node. Connect the disapprove output to a Slack notifier or a no-op.

That's the full pattern. The workflow now sits in a *Waiting* state until someone clicks. If approved, the send fires. If disapproved, the send is skipped and a notification goes out. The execution is **offloaded to the n8n database** while it waits — it survives instance restarts, deploys, and overnight idle periods.

The **Limit Wait Time** is not optional in production. If the approver doesn't click within the limit, the workflow auto-resumes down a fallback path — *no decision, sent to manual review queue*. Without it, an approver on holiday silently stalls your weekly campaign.

This pattern replaces the older n8n approach of *Wait node + custom Slack block with buttons + manually-handled callback URL*. Older tutorials still teach that — it works, but it's three nodes of plumbing for what's now one operation toggle.

### Per-channel quirks

The primitive is the same; the configuration surface and constraints differ slightly per channel. The ones worth knowing before you ship:

- **Gmail** — operation is *Send and Wait for Approval*; only the Approval response type is available. In exchange, Gmail exposes button-styling options the others don't: *Approve Button Label* (defaults to *Approve*), *Disapprove Button Label* (defaults to *Decline*), and *Button Style* (*Primary* or *Secondary*). Buttons render as styled HTML links in the email body — most clients handle them fine; a few corporate Outlook configurations strip link styling, but the underlying URLs still work.
- **Slack** — buttons render natively as interactive Block Kit components. **One first-time setup gotcha**: your Slack app must have *Interactivity & Shortcuts* enabled in its Slack-side configuration, or the buttons will appear but clicks do nothing. The Slack app config UI is where you turn this on; the Request URL it asks for is your n8n instance's webhook URL.
- **Telegram** — operation works the same, but the output payload is leaner than its counterparts. The node returns the decision (`{ "data": { "approved": true } }` for the Approval type, the field values for Free Text and Custom Form) but does not return `message_id` or `chat_id`. If you need to *delete the prompt message after the user clicks Approve* — a common follow-up to keep chats tidy — you'll need to capture those IDs separately before the node fires, or use Slack instead.
- **Send Email (SMTP), Discord, WhatsApp Business Cloud, and the LangChain Chat node** all expose the same operation with the same three response types. Reach for whichever channel your approver actually opens. WhatsApp in particular is worth knowing for Malaysian SMEs — it's where most directors actually read messages.

## The Wait node — four resume modes

For everything Send-and-Wait-for-Response doesn't cover, you reach for the **Wait** node. It has four resume modes; pick the one that matches what you're waiting for.

**After Time Interval.** Wait X seconds, minutes, hours, or days. The simplest mode. Used for rate-limit backoffs (*wait 2 seconds between API calls*), polling delays (*wait 30 seconds before checking if the video uploaded*), and pacing (*don't send the next email in this drip campaign for 2 days*).

**At Specified Time.** Wait until a particular date and time. Used when you want a workflow to *start now but finish later* — collect data Monday morning, send the summary Tuesday at 9 AM. The picker respects the workflow's configured timezone (Ch. 12).

**On Webhook Call.** This is the powerful mode and the one used in production for anything beyond simple time waits. The Wait node generates a unique resume URL — accessible via the expression `{{ $execution.resumeUrl }}` — and waits for an HTTP call to arrive at that URL. When the call arrives, the workflow resumes; the call's payload (query params or body) is available in the Wait node's output.

The standard usage is: send the resume URL to an external system or person, do something else, get called back. For example:

- Send the URL to a customer in an email: "Click here to confirm your subscription." When they click, the workflow resumes.
- Send the URL to a third-party API as a callback: "When the report finishes generating, POST to this URL." When it does, the workflow resumes with the report data.
- Send the URL to a sub-workflow that does long-running work elsewhere and calls back when done.

**On Form Submitted.** Pause until a user submits an n8n-hosted form. Useful when the approver doesn't have credentials to your Slack workspace or you need to collect structured input rather than just an approve/reject. The form is hosted on the n8n instance; the URL is shareable; the submission resumes the workflow with the form's field values available.

## The reversibility heuristic, applied

Chapter 7 set the principle: automate freely when actions are reversible, gate humans when they're not. This chapter is where you actually wire that judgement into the canvas. The decision is consistent:

| Action | Reversible? | Gate? |
|---|---|---|
| Write a row to a Google Sheet | Yes — delete the row | No |
| Update a CRM contact record | Yes — restore previous value | No |
| Send a single transactional email (e.g. order confirmation) | No, but contained | No |
| Post to an internal Slack channel | No, but low-impact | No |
| Send a marketing campaign to 12,000 recipients | No | **Yes** |
| Wire a payment over RM 5,000 | No | **Yes** |
| Delete records from a database | Mostly no | **Yes** |
| Publish a blog post to a public site | Reversible but visible during the gap | **Yes** |
| Submit a tax filing | No | **Yes** |

The pattern: irreversibility plus reach. A mistake that affects one record and can be undone in thirty seconds doesn't warrant a gate. A mistake that reaches thousands of people, can't be retracted, or has regulatory consequences does.

A useful related heuristic: would you be comfortable explaining the worst-case version of this action to your manager? If yes, ship it ungated. If no, gate it.

## Three production traps

**Bots and link previewers clicking the resume URL.** When you put `$execution.resumeUrl` into a Slack message or email, anything that scans links — Slack's link unfurler, corporate email security scanners, Outlook Safe Links, link-preview cards — will hit that URL. The resume URL is one-time-use; a bot click resumes the workflow *before the human sees the message*. The workflow continues with no payload, the approver later clicks the button and nothing happens because they're hitting a dead URL.

Three fixes, in order of preference. Use the *Ignore Bots* option on the Wait node (it filters known crawler user-agents). Require the resume to be a POST rather than a GET (most scanners only follow GETs). Or use *Send and Wait for Response* instead, which n8n has hardened against this exact problem.

**`$execution.resumeUrl` returning `localhost` on self-hosted.** If you self-host n8n behind a reverse proxy (Ch. 6 covers this for Render and Hostinger setups), the resume URL is built from whatever the instance thinks its public hostname is. If the `WEBHOOK_URL` environment variable isn't set, you'll get `http://localhost:5678/webhook-waiting/...` and external callbacks will fail. Set `WEBHOOK_URL` to your actual public URL — this is one of the most common self-hosted production bugs and it's worth verifying *before* you put a Wait node into a real workflow.

**No timeout on a webhook wait.** A Wait node in *On Webhook Call* mode with no *Limit Wait Time* set is a workflow that can wait forever. If your callback system fails silently — the third-party API never fires, the customer never clicks, the sub-workflow errors out before calling back — the parent workflow sits in *Waiting* state indefinitely, holding a database row and showing as in-progress in the executions view. Always set a limit. Always.

## A quick note on sub-workflows

n8n v2.0 fixed a behaviour that bit a lot of users: previously, if a parent workflow ran `Execute Sub-workflow` with *Wait for Sub-workflow Completion* enabled, and the sub-workflow contained a Wait node, the parent would not actually wait — it would resume immediately with the pre-wait input data. As of v2.0, the parent waits for the full sub-workflow including any waits inside it. Worth knowing if you inherit older workflows that built workarounds for the bug.

## The takeaway

- **Three reasons to pause: irreversibility (gate a human), timing (wait until X), external dependency (wait for callback).** Each maps to a different tool.
- **For approval gates, use *Send and Wait for Response* — the operation on Slack, Telegram, Send Email, Discord, WhatsApp, and the LangChain Chat node.** Gmail offers the equivalent under the older name *Send and Wait for Approval* (Approval-only, plus button-styling options). It's the modern one-node HITL primitive. Reserve the Wait node for more complex flows.
- **The Wait node has four modes.** Time interval, specified time, webhook call, form submission. Webhook call uses `{{ $execution.resumeUrl }}` and is the most powerful but has the most production traps.
- **Always set a timeout on webhook-based waits.** A workflow with no limit can wait forever; that's not "patient", that's "stuck."
- **Enable *Ignore Bots* on any Wait node that exposes a resume URL via email or chat.** Link previewers will click your one-time URL before the human does.
- **The reversibility heuristic: gate humans where mistakes are unrecoverable and reach is wide.** Don't gate routine ops just because they touch customer data; do gate any single action that affects more than a hundred people at once.

## Try it yourself

Build the marketing-broadcast-with-approval pattern from the cold open, using whichever messaging tool you actually check (Slack or Gmail):

1. Start from a Schedule trigger and a stub for the campaign content (a Set node with a fake `subject`, `body`, and `recipientCount` is fine for testing).
2. Add a **Slack** node with **Operation**: *Send and Wait for Response*, **Response Type**: *Approval*. (If using Gmail instead, the operation is *Send and Wait for Approval*; otherwise the config is identical.)
3. Message body should reference the data: `Campaign ready to send. Subject: {{ $json.subject }}. Recipients: {{ $json.recipientCount }}. Approve to fire, or disapprove to cancel.`
4. **Type of Approval**: *Approve and Disapprove*.
5. Set a **Limit Wait Time** of 4 hours.
6. Connect the *approve* output to a Slack message: "Sent."
7. Connect the *disapprove* output to a Slack message: "Cancelled."
8. Connect the *timeout* path (the node will produce an output if the limit fires) to: "No response received — left in queue for manual review."

**You'll know it worked when** you can run the workflow, see the approval message arrive in Slack with two buttons, leave it sitting for a minute, click each path, and watch the right downstream message appear each time. Then test the timeout by setting the limit to one minute and waiting it out. Three paths, three outcomes, no execution stuck in *Waiting*.

## What's next

You've learned how to pause for things you expected to need to wait for. Chapter 15 is about pausing for the things you didn't — when a node fails. Third-party APIs go down, credentials expire, rate limits trip, JSON parsing breaks on unexpected data. The **Error Trigger** node and n8n's retry logic are the patterns that turn fragile workflows into reliable ones. You'll learn how to catch errors, retry intelligently, route failures to a review queue, and design workflows that fail loudly when they should and recover silently when they can.
