---
title: 10. Triggers — how does a workflow know when to run? | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: The three trigger families — Schedule, Webhook, App Event — what each is good at, and the gotchas the n8n docs sometimes assume you already know.
meta-twitter:title: Learn Automation Working
---

# 10. Triggers — how does a workflow know when to run?

Part II got you set up. Part III is where you start building things on purpose.

The first question, the one every workflow has to answer before it can do anything else, is *when do you run?* In Ch. 4 you used a Schedule trigger because it was the easiest one to point at; in Ch. 5 you saw a webhook example in passing; in Ch. 8 the HubSpot conversation hinted at *app event* triggers. This chapter is the proper tour. Three families, distinct shapes, distinct gotchas. By the end you'll know which one each new workflow needs and why.

You can spot trigger nodes on the canvas by the **orange lightning bolt icon** in the top corner of the node — and by the fact that they have an **output connector but no input connector**. They're the only nodes that can be the *first* node in a workflow. The reason matters: a workflow needs an entry point, an event that starts the clock, before any of the other 650+ nodes can do their work.

One rule that catches everyone exactly once: **a workflow has to be *active* for its triggers to fire automatically.** A schedule trigger configured to run every morning at 7am will not run at 7am if the workflow toggle in the top-right of the editor is still set to *Inactive*. You can manually test the workflow as many times as you want from the editor — *Test Workflow* will fire the trigger once for testing — but for the automatic, on-its-own behaviour, the toggle has to be flipped.

## The three families

n8n's trigger catalog is large, but every trigger you'll ever use is one of three shapes:

- **Schedule triggers** — *"run at 7am every weekday."* The workflow checks the clock; when the configured time comes, it fires.
- **Webhook triggers** — *"run when this URL is hit."* The workflow is sitting there waiting; when an external system calls a URL n8n gives you, it fires.
- **App event triggers** — *"run when something happens in Gmail / Slack / HubSpot / Stripe / GitHub."* The workflow watches a specific app for a specific event — a new message, a new ticket, a new payment, a new commit — and fires when it happens.

Plus, the two utility triggers most workflows touch eventually:

- **Manual Trigger** — *"run when I click."* The trigger of choice while you're building, before the workflow has a real entry point.
- **Execute Workflow Trigger** — *"run when another workflow calls me."* The entry point for sub-workflows (Ch. 27).

Picking the right family is almost always obvious from the *shape of the work*. You'll feel the choice immediately. The harder questions are inside each family: *which scheduling mode? what auth on the webhook? webhook or polling for this app?* This chapter spends most of its time there.

## Schedule triggers — the calendar-driven workflow

If you've ever set up a daily email, a weekly report, a monthly invoice reminder — anything that runs at a *time*, not in response to an *event* — Schedule trigger is what you want. It's the simplest and most-used trigger in the n8n catalog, and the one you've already used in Ch. 4.

**Two modes**, configurable in the node:

- **Interval mode** — choose a unit (Seconds, Minutes, Hours, Days, Weeks) and a count. *"Every 4 hours"*, *"every 2 days at 9am"*, *"every Monday at 9am sharp"*. The UI walks you through the variables — for Days, you set both the *Trigger at Hour* and *Trigger at Minute*; for Weeks you also pick the day. This mode is what 90% of workflows need.

- **Cron Expression mode** — paste a standard cron expression for anything Interval can't express. *"0 9 * * 1-5"* runs at 9am Monday through Friday. *"0 0-5/2 * * *"* runs every two hours between midnight and 5am. *"30 3 1 * *"* runs at 3:30am on the first of each month. n8n uses standard cron syntax; if you've configured cron jobs on a Linux server before, the format is identical.

**Timezone is set at the workflow level**, not the trigger level. Open the workflow's *Settings* panel (the gear icon top-right) and check the *Timezone* dropdown. Default is your account timezone; for SMEs running workflows that touch multiple regions, you'll often want to set this explicitly — *Asia/Kuala_Lumpur* for Malaysian business hours, *Etc/UTC* for anything that touches international APIs.

A couple of practical Schedule gotchas worth knowing:

- **Sub-minute intervals are rarely what you want.** "Every 10 seconds" is technically possible; it'll burn through your execution budget on Cloud, and on self-hosted instances it can pile up if any single run takes longer than the interval (n8n queues the next execution rather than skipping it). Use webhooks for anything truly real-time.
- **Drift is normal.** A Schedule trigger configured for 7:00am won't fire at exactly 7:00:00.000 — there's typically a small delay depending on instance load, usually under a few seconds. If a downstream system requires precise timing (a market open, a payroll cutoff), use the workflow itself to wait for the precise time, not the trigger.
- **The first execution after activation is not immediate.** Activate a workflow with a "weekly on Monday" trigger on a Wednesday, and the first run will be the following Monday — not right now. Use the *Test Workflow* button in the editor to verify the workflow works *before* activating.

The Schedule trigger's full docs are at [docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/).

## Webhook triggers — the event-driven workflow

Where Schedule triggers ask the clock, **Webhook triggers ask the network**. Your workflow registers a URL with n8n; when any external system makes an HTTP request to that URL, the workflow fires with the request body as input. This is how you connect to anything that *can* call a URL — and almost every modern SaaS can.

The Webhook node is conceptually simple but has more knobs than any other trigger. Here are the ones that matter:

**Two URLs, not one.** Every Webhook node generates *two* URLs, both visible at the top of the node panel:

- **Test URL** — contains `/webhook-test/` in the path. Active only while you're in the editor and have clicked *Listen for test event*. Stays active for **120 seconds** before timing out. Used during development to receive a payload from an external system and see the data flow into your workflow in real time.
- **Production URL** — contains `/webhook/` (without `-test`) in the path. Active whenever the workflow is published (activated). This is the URL you give to external services for real, sustained use.

This is the single concept that trips up more beginners than anything else with webhooks. **The two URLs are different.** Configure your external service with the Test URL during development; switch it to the Production URL before going live. The path component (the random UUID after `/webhook/` or `/webhook-test/`) is identical between them — so if you customise the path, both URLs update.

**HTTP methods.** GET, POST, PUT, PATCH, DELETE, HEAD — n8n supports all standard methods. Configure which one the webhook accepts in the node. You can also configure a webhook to accept *multiple* methods on the same path, by adding additional method entries.

One important constraint: **n8n only allows one webhook node per (path, method) combination.** If you already have a webhook at `/webhook/leads` listening for POST, you can't add a second POST webhook on the same path. You'll get an error when you try to publish. Either change the path, change the method, or rethink why you have two workflows competing for the same endpoint.

**Authentication.** By default, anyone who knows the webhook URL can trigger it. For production webhooks, you want authentication:

- **Basic Auth** — username/password sent in the HTTP header. Simple, widely supported.
- **Header Auth** — a custom header (typically `X-API-Key` or similar) with a secret value. The most common pattern for SaaS-to-n8n webhooks.
- **JWT Auth** — for systems that already issue JSON Web Tokens. Less common in SME settings; useful when the calling system has its own auth infrastructure.

Pick one. Treat production webhook URLs like API keys: don't commit them to version control, don't paste them into Slack, and add at least Header Auth before activating anything that costs money to run.

**Response modes.** Configurable in *Respond*: **When Last Node Finishes** (wait for the workflow, return its output — use for synchronous APIs), **Immediately** (return acknowledgement, workflow continues in background — use for fire-and-forget), or **Using Respond to Webhook node** (place a Respond to Webhook node mid-flow to return at a specific point — most flexible).

**Path parameters.** The webhook path supports colon-prefixed route parameters: `/webhook/leads/:source` accepts `/webhook/leads/website`, `/webhook/leads/referral`, etc. Access the captured values via `{{ $('Webhook').params.source }}`.

**Payload size limit.** Webhooks accept up to **16MB**. Self-hosters can raise it with `N8N_PAYLOAD_SIZE_MAX`.

Webhook trigger full docs: [docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/).

**In other tools.** Zapier and Make both call this "Webhooks" and have the same Test/Production URL pattern. Power Automate calls it "When a HTTP request is received". The shape is identical; only the UI differs.

## App event triggers — the inside-the-tool workflow

The third family is the most direct: when *something specific* happens in an app you care about — a new email arrives, a Slack message is posted, a HubSpot deal moves stages, a Stripe payment succeeds, a GitHub issue is created — fire a workflow in response.

n8n ships dedicated trigger nodes for most major apps. Open the trigger picker (the *+* at the start of a new workflow) and search for the app name — if a `Trigger` node exists for that app, you'll find it. Common ones for the SME audience: **Gmail Trigger**, **Slack Trigger**, **Google Sheets Trigger**, **HubSpot Trigger**, **Stripe Trigger**, **Shopify Trigger**, **Calendly Trigger**, **Typeform Trigger**.

The technically important distinction inside this family is **polling vs webhook-based**, and which model an app trigger uses determines its real-time behaviour:

- **Webhook-based app triggers** (Slack Trigger, Stripe Trigger, GitHub Trigger, HubSpot Trigger, Shopify Trigger, most modern SaaS) — the app pushes an event to n8n the moment it happens. Real-time, no delay, low resource cost.
- **Polling-based app triggers** (Gmail Trigger, RSS Feed Trigger, some database triggers) — n8n asks the app *"anything new?"* on a schedule. Default polling intervals vary by node (Gmail polls every minute by default, RSS is configurable). Polling adds a delay of up to one poll interval to events.

For most SME workflows, polling delay (under a minute) doesn't matter. For genuinely real-time work — *"customer pays, send them a receipt within 5 seconds"* — pick a webhook-based trigger or use a webhook trigger directly against the app's webhook system.

**Setup pattern.** Most app-event triggers follow the same shape: pick the trigger node, pick the credential (the one from Ch. 8), pick the event you care about, configure any filters, save. n8n handles the underlying webhook registration or polling automatically. For webhook-based triggers, n8n registers the webhook with the app behind the scenes — you don't need to log into the app's developer settings and paste URLs manually like you do with the generic Webhook node.

**The one common gotcha**: webhook-based app triggers register their webhook *with the external app* when the workflow is activated. If you import a workflow from another instance or copy it from a template, the webhook registration doesn't carry over — you need to *re-activate* the workflow on your own instance for n8n to register the new webhook with the app. Symptom: the trigger looks configured but never fires.

## Manual and Execute Workflow triggers

Two utility triggers most workflows touch eventually.

**Manual Trigger** is the click-to-run trigger. It's what *Test Workflow* uses behind the scenes — when you're building a workflow that will eventually use a Schedule or Webhook trigger, you can start with a Manual Trigger, get the rest of the workflow working, and then swap the Manual Trigger out at the end. It's also the right trigger for workflows you only ever want to run on-demand — *"backfill last quarter's NPS scores"*, *"send the one-off Friday newsletter to a specific segment"*, *"run my month-end reconciliation right now."* Workflows with only a Manual Trigger **cannot be activated** — there's nothing for n8n to listen for.

**Execute Workflow Trigger** is the entry point for sub-workflows. When one workflow calls another (via the *Execute Workflow* node), the called workflow needs an Execute Workflow Trigger as its first node, instead of a Schedule or Webhook. The trigger receives whatever data the parent workflow passes in. We unpack the sub-workflow pattern fully in Ch. 27 (modularity); for now, just know this trigger exists.

## The Form Trigger — when you need a UI

Worth a brief mention: the **Form Trigger** generates a hosted web form that anyone with the URL can fill in. When they submit, the workflow fires with the form data as input. It's the right trigger for any workflow that needs human input as its starting event — an internal request form, a customer feedback form, a lead-capture form, a vacation-request form for HR. Multi-step forms are supported (chain *n8n Form* nodes after the trigger), and fields can be pre-filled via URL query parameters. It's neither Schedule nor Webhook nor App-event — it's its own thing, a *"trigger with a UI"*, and it solves a category of problem that would otherwise require building a separate web app.

## The takeaway

- Every workflow starts with a **trigger**. Three families: **Schedule** (time-driven), **Webhook** (URL-driven), **App event** (event-in-an-app-driven).
- The **active toggle** is the gate: a workflow's triggers only fire automatically when the workflow is set to Active.
- **Schedule triggers**: Interval mode (90% of cases) or Cron Expression mode (everything else). Timezone is at the workflow level.
- **Webhook triggers**: two URLs (Test vs Production), 120-second test window, six HTTP methods, three auth options, three response modes. One webhook per (path, method).
- **App event triggers**: webhook-based (real-time) or polling-based (small delay), automatic registration with the external app on activation.
- **Form Trigger** for when you need a hosted UI as the entry point; **Manual Trigger** for build-time and on-demand runs; **Execute Workflow Trigger** for sub-workflows.
- Production webhook URLs are secrets. Don't commit them; don't paste them in Slack; add Header Auth before activating anything that costs money to run.

## Try it yourself

Take the Personal Morning Brief from Ch. 4 (the Schedule → Google Calendar → Gmail workflow) and *port it to a different trigger*. Two options:

**Option A — port to a Webhook trigger.** Replace the Schedule trigger with a Webhook trigger. Add Header Auth with a secret value of your choice. Now your morning brief runs only when *you* call the URL — useful as the trigger for a phone shortcut, a Stream Deck button, or a Bash one-liner. Test it with `curl`:

```bash
curl -X POST \
  -H "X-API-Key: your-secret" \
  https://your-n8n-domain/webhook/morning-brief
```

**Option B — port to a Gmail Trigger.** Replace the Schedule trigger with a Gmail Trigger configured to watch for emails with a specific label (e.g. `briefme`). Now any time you label an email *briefme*, the workflow fires and emails you the day's calendar.

Either way, write down:

```
The trigger family I picked:    ____________________
Why I picked it:                ____________________
What changed in the workflow:   ____________________
```

**You'll know it worked when** the same end-output (a morning-brief email) arrives via a completely different entry point — proving that *the trigger and the work are independently swappable.* That decoupling is the conceptual move; the rest is just node configuration.

## What's next

Triggers answer *when*. The next chapter answers *what shape does the data have as it moves between nodes*, and it's the single most important conceptual chapter in the book. Most n8n confusion — *"why does my expression say undefined?"*, *"why is my Code node returning nothing?"*, *"why does the Loop node behave weirdly?"* — traces back to one source: the data model isn't quite what you think it is. Ch. 11 fixes that.
