---
title: 15. What happens when a node fails? | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: Error handling in n8n — Retry On Fail, Continue (using error output), Error Trigger workflows, and Stop And Error. The four-layer model that turns fragile workflows into reliable ones.
meta-twitter:title: Learn Automation Working
---

# 15. What happens when a node fails?

Your lead qualifier from Chapter 13 has been live for two weeks. Last Tuesday you check the Executions tab and find forty-seven *failed* executions stacked up over the weekend. HubSpot was returning 429s — too many requests — every twelve seconds from Saturday lunchtime until Monday morning. The workflow didn't tell you. It just stopped working, quietly, and would have kept stopping working if you hadn't gone looking.

This is what unhandled errors look like in production. Not screaming red alerts. Silent rows in an executions log that nobody opened.

This chapter is about the four things you put into a workflow to make sure that doesn't happen — or at least, when it does happen, you find out within minutes instead of days. The four layers form a ladder, from cheapest and most local to most elaborate. You add them as the workflow earns them.

## The four layers

| Layer | What it does | When to add it |
|---|---|---|
| 1. **Retry On Fail** | Node automatically retries on transient errors | Any node that calls a third-party API |
| 2. **On Error → Continue (using error output)** | Failures route to a second output port instead of halting | Nodes where partial failure is tolerable |
| 3. **Error Trigger workflow** | A separate workflow fires when *any* main workflow errors | Once per instance, attached to every workflow that runs in production |
| 4. **Stop And Error node** | Deliberately throw an error when data violates an assumption | Where wrong data is worse than no data |

You don't add all four to every workflow. Layer 1 is cheap; turn it on anywhere it makes sense. Layer 3 is set up once and reused. Layers 2 and 4 are surgical — added to specific nodes where the workflow's intended behaviour requires them.

## Layer 1: Retry On Fail

Most "errors" in production are transient. The API was rate-limited for two seconds. The third-party service hiccupped. The OAuth token needed a refresh. Wait a moment, try again, and it works. *Retry On Fail* automates that wait-and-try-again.

In any node's **Settings** tab (the gear icon), toggle **Retry On Fail** on. Two parameters appear:

- **Max Tries** — how many attempts in total, including the first. Cap is 5.
- **Wait Between Tries (ms)** — milliseconds to pause between attempts. Cap is 5000 (five seconds).

These caps are surprisingly low and they trip people up — set Max Tries to 10 or Wait Between Tries to 30000 in the UI and the field silently reverts to 5 / 5000 when you click elsewhere. If you need beefier retries — exponential backoff out to two minutes, ten attempts — you build a loop manually with Loop Over Items, a counter, an If node, and a Wait node. That's Chapter 16 territory. For the common case — recover from a 429 by trying again in 3 seconds, give up after 3 attempts — the built-in toggle is enough.

The canonical use case is rate-limited APIs. From the docs:

> If you're using this to work around rate limits, set Wait Between Tries (ms) to more than the rate limit. For example, if the API you're using allows one request per second, set Wait Between Tries (ms) to 1000.

For HubSpot, Stripe, OpenAI, and Anthropic — all of which have published rate limits — set the wait to slightly above their per-request cap and the workflow becomes resilient to transient throttling without you noticing.

What Retry On Fail does *not* handle: anything where the error is permanent. A 401 (auth failed) won't fix itself by trying again. A 404 (resource doesn't exist) won't either. Retries help with errors that resolve on their own; they make errors that don't, slower.

## Layer 2: On Error — what happens when retries run out

Below the *Retry On Fail* toggle in node settings is **On Error**. This controls what the workflow does when the node ultimately fails — after retries, if any. Three options:

- **Stop Workflow** (default) — execution halts. The Executions log shows a failed run. If you have an Error Trigger workflow set up (Layer 3), it fires.
- **Continue** — proceed to the next node, ignoring the error, using the last valid data the node held. Sounds convenient. It's a trap.
- **Continue (using error output)** — the node grows a second output port: a red error output. Failed items flow there; successful items flow out the main port. You wire each output to different downstream logic.

*Continue* is dangerously silent. If your HubSpot node errors and you have *Continue* set, downstream nodes get whatever stale data was there last time (often nothing), and the workflow proceeds as if everything worked. You only find out about the failure if you happen to check the executions log and notice the warning indicator on the node. In production this is exactly the failure mode you want to avoid.

*Continue (using error output)* is the version you actually want — the error becomes an explicit, routable item. Connect the red port to a Slack notifier ("Lead enrichment failed for {{ $json.email }} — added to manual review queue"), a Set node that flags the record for follow-up, or a Google Sheets row that logs the failure. The one trap: if you flip the toggle on and leave the red port unconnected, error items go nowhere and you've reintroduced the silent-failure problem you just avoided. Whenever you enable this option, the very next step is to wire *something* to the error port.

When to use which option, in practice:

- **Stop Workflow**: any step where success is required for the workflow to mean anything. Writing the lead to the CRM. Sending the invoice. Posting the approved campaign.
- **Continue (using error output)**: optional enrichment steps where partial failure is fine. Looking up the company size from Clearbit. Generating an AI-written first-touch message. Adding a "verified" flag from an email validator.
- **Continue**: rarely. The case where you *want* silent failure is rare enough that you should treat reaching for this option as a signal to stop and ask whether you actually want it.

## Layer 3: The Error Trigger workflow

Layers 1 and 2 are per-node. They handle the specific failures you expect. Layer 3 is the safety net for the failures you didn't.

You build a single workflow whose first node is the **Error Trigger** node. By itself, the Error Trigger does nothing — it just receives a structured payload whenever a main workflow errors and exposes that data to downstream nodes. Connect it to a Slack node, a Gmail node, an Airtable/Google Sheets logger, or all of the above.

Then, in *every workflow that runs in production*, open **Workflow Settings → Error Workflow** and point it at this error handler. You set up the error workflow once. You attach it to every production workflow.

### What the payload contains

The Error Trigger receives an item with this shape:

```json
{
  "execution": {
    "id": "1234567",
    "url": "https://yourinstance.n8n.cloud/workflow/abc/executions/1234567",
    "retryOf": null,
    "mode": "trigger"
  },
  "workflow": { "id": "abc", "name": "Lead Qualifier" },
  "node": { "name": "HubSpot", "type": "n8n-nodes-base.hubspot", "parameters": { ... } },
  "error": { "message": "Request failed with status code 429", "stack": "...", "context": {} }
}
```

The fields you'll actually use in a Slack alert message:

```
🔴 Workflow failed
Name: {{ $json.workflow.name }}
Failed at node: {{ $json.node.name }}
Error: {{ $json.error.message }}
View execution: {{ $json.execution.url }}
```

That five-line message in your alerts channel is the difference between finding out about a problem in 30 seconds versus 36 hours. It's also enough information to start debugging — node name plus error message gets you most of the way there before you even click the execution URL.

### The manual-execution trap

This catches almost everyone the first time. **Error workflows don't fire when you click *Test Workflow* manually.** They only fire on automatic executions — scheduled triggers, webhook triggers, app-event triggers. From the docs: *You can't test error workflows when running workflows manually. The Error Trigger only runs when an automatic workflow errors.*

To test the error workflow itself, the canonical move is to add a temporary Stop And Error node (Layer 4) inside an automatic workflow, let it fire, and confirm the error workflow ran. Once you've verified the chain works, remove the test node. Trying to test by clicking *Test Workflow* and expecting the error path to fire will have you convinced your error handling is broken when it isn't.

### One error workflow for the whole instance

You don't build a separate error workflow per main workflow. You build one error workflow and attach it to all of them. The payload tells you which workflow failed (`$json.workflow.name`) and which node (`$json.node.name`), so a single handler can route any failure intelligently — for example, an If node that splits "critical workflows" (page someone) from "low-priority workflows" (log only).

## Layer 4: Stop And Error — when wrong data is worse than no data

Sometimes the data passing through your workflow is *technically* valid — the API returned a response, no node errored — but the response is wrong in a way that matters. The contact has no email address. The invoice amount is zero. The customer name is "TEST". If you let that data continue downstream, you'll write garbage to the CRM, send a $0 invoice, or chase the test account.

The **Stop And Error** node throws an explicit error when you decide the data is bad. Place it after an If node that checks your assumptions; route the "data is bad" branch into it. The node has one parameter — the error message (or a JSON error object) — and that message flows straight into your error workflow's payload, so your Slack alert can say *"Contact ID 4582 had no email — skipped"* with full context.

This is a Layer 4 thing — used sparingly. The use case is data validation where silence is worse than noise. *Most* data anomalies you handle with `??` fallbacks in expressions (Chapter 12) or with If/Filter routing (Chapter 13). Reach for Stop And Error when the workflow finishing on bad data would be actively worse than the workflow halting with a clear error message.

## Which layer handles which failure

| Failure type | Example | Which layer |
|---|---|---|
| Transient — resolves itself in seconds | 429 rate limit, 502/503/504 from upstream, OAuth refresh blip | **1: Retry On Fail** |
| Tolerable failure — workflow can still succeed | Optional enrichment node fails to find the company | **2: Continue (using error output)** |
| Permanent / unexpected — workflow can't complete | Credentials expired, API endpoint deprecated, third-party outage | **3: Error Trigger workflow** |
| Data-shape violation — input was bad in a way that matters | Required field missing, amount is negative, identifier malformed | **4: Stop And Error** |

A production-ready workflow uses layers 1 and 3 freely, layer 2 where it makes sense, and layer 4 sparingly.

## The watch part

Throughline 3 from the start of this book — *ship and watch* — has a specific daily form in error handling: the Executions log is the workflow telling you the world changed. APIs you depend on get deprecated. Credentials rotate. Schemas drift. Edge cases you didn't think of show up.

Once layers 1–3 are in place, the discipline is opening the executions list for your failed runs at a regular cadence — daily for high-traffic workflows, weekly for low-traffic ones. Most days there will be a handful of transient errors that retried successfully (visible in the *retried* indicator). Some days there will be a real failure that the error workflow alerted you to in real time. The point isn't to firefight; it's to notice patterns. Three 429s in a row from the same API means you should raise the *Wait Between Tries* on that node. A weekly 401 from HubSpot means a credential is rotating and you need to investigate.

Reliability isn't a feature you ship once. It's a posture you maintain.

## The takeaway

- **Four layers, in order of cost: Retry On Fail, Continue (using error output), Error Trigger workflow, Stop And Error.** Add them as a workflow earns them — not all four to every workflow.
- **Retry On Fail caps at 5 attempts and 5000ms between tries.** For more aggressive retry policies, build a manual loop (Chapter 16).
- **Prefer *Continue (using error output)* over *Continue*.** The former makes errors routable; the latter makes them silent. Always connect *something* to the error output port — an empty port is a leak.
- **Build one Error Trigger workflow per instance, attach it to every production workflow.** It only fires on automatic executions, not manual *Test Workflow* clicks.
- **Stop And Error is for explicit data validation.** Use sparingly — most data issues are better handled with `??` fallbacks or branching nodes.
- **Open the Executions log on a regular cadence.** Errors are the workflow reporting on changes in the world; pattern-spotting is cheaper than firefighting.

## Try it yourself

Wire up a basic error workflow and attach it to a workflow that can actually fail. You can do this in fifteen minutes.

1. **Create a new workflow.** First node: **Error Trigger** (no configuration needed).
2. Connect a **Slack** (or Gmail) node configured to send a message:
   ```
   🔴 Workflow failed
   Name: {{ $json.workflow.name }}
   Node: {{ $json.node.name }}
   Error: {{ $json.error.message }}
   Execution: {{ $json.execution.url }}
   ```
3. Save the error workflow with a name like *Error Handler*. Don't activate it; error workflows don't need to be active.
4. **Open a workflow you've already built** — the Chapter 4 daily briefing or the Chapter 13 lead router will do. Go to **Workflow Settings → Error workflow** and select *Error Handler*. Save.
5. To test the chain end-to-end: inside the main workflow, temporarily insert a **Stop And Error** node somewhere downstream of the trigger, with an error message like `Test error — please ignore`. Save and let the workflow run on its trigger (or wait for the schedule).
6. The main workflow will fail. The Error Handler workflow should fire. Your Slack/Gmail should receive the message.
7. **Remove the Stop And Error node.** Confirm normal executions go through cleanly.

**You'll know it worked when** the Slack alert arrives with the four fields populated correctly — workflow name, node name, error message, and a clickable execution URL — and the main workflow's failure shows up in the Executions log. You now have a tripwire on every workflow that uses this handler. The next time a credential expires or an API deprecates an endpoint, you'll know within minutes.

## What's next

Chapter 16 is about *throughput*: what to do when your workflow has to process not one item but ten thousand. The **Loop Over Items** node, batch processing, and the patterns for staying under API rate limits when you're working through a large list. You'll also learn how to build the manual retry loop that the 5-try cap on *Retry On Fail* prevents — exponential backoff out to minutes, dead-letter queues, and the cost-control patterns that keep AI nodes from burning your monthly budget on a single bad run.
