---
title: 13. How do you route different items down different paths? | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: Branching in n8n — Filter, If, and Switch. When to drop items, when to fork the workflow into two, and when to route into many.
meta-twitter:title: Learn Automation Working
---

# 13. How do you route different items down different paths?

You're building a lead qualifier. A webhook fires every time someone submits the *Contact Sales* form on your site. You want to do three different things depending on how big the deal looks:

- **Small** (under RM 5,000 estimated value) — send an automated welcome email and drop the lead into HubSpot tagged *self-serve*.
- **Mid** (RM 5,000–50,000) — same email, but also post to the SDR Slack channel for a human to follow up within four hours.
- **Large** (over RM 50,000) — the above, *and* ring the founder's mobile via Twilio.

You already know how to do each of these as a standalone workflow. The new thing is the routing. The lead comes in. The workflow has to *look at it*, decide which bucket it falls into, and send it down a different path accordingly.

Chapter 12 covered branching a *value* — `urgent` or `standard` inside a single field, using a ternary. This chapter is about branching a *path* — sending different items down physically different routes on the canvas. Three nodes do this work: **Filter**, **If**, and **Switch**. The skill is knowing which one to pick.

A note on the example. The lead qualifier from this cold open will reappear across the rest of Part III — for errors (Chapter 15), throughput (Chapter 16), data shaping (Chapter 17), API enrichment (Chapter 18), and AI scoring (Chapter 19). That's a deliberate choice: lead qualification happens to exercise more of n8n's surface than most other workflows, which makes it example-rich for teaching mechanics. The patterns transfer to any role's work. Part V demonstrates the same mechanics applied across business development, customer success, finance, marketing, and personal automations.

## Three jobs, three nodes

Branching has exactly three shapes. Once you see them as three distinct jobs, the node choice is automatic.

| You want to... | Use |
|---|---|
| Drop items that fail a check; keep the rest moving | **Filter** |
| Send items one way or another way (two paths) | **If** |
| Route items to three or more paths based on a category | **Switch** |
| Branch a *value* inside one field (not a whole path) | Ternary in an expression — see Ch. 12 |

That's the chapter in one table. The rest is the detail of how each one works and the places they go wrong.

## Filter — when you just want to drop items

The Filter node is subtractive. It evaluates a condition against each item. Items that match pass through. Items that don't are silently dropped. There's no second output, no "false" branch — items that fail the condition simply don't appear downstream.

Use Filter when invalid or irrelevant items shouldn't continue. The canonical examples:

- Drop leads with no email address before writing to HubSpot.
- Drop test orders (where `customer.email` ends in `@example.com`) before triggering fulfillment.
- Drop calendar events older than 24 hours before summarising today's schedule.

The condition UI is the same one used in If and Switch: pick a data type from the dropdown (String, Number, Date & Time, Boolean), pick a comparison operator (*equals*, *contains*, *starts with*, *is after*, *is empty*), supply a value to compare against. Multiple conditions can be combined with **AND** (all must match for the item to pass) or **OR** (any one suffices).

There's one trap, and you will hit it: type strictness. If your API returns `"100"` (a string) and you write a condition *greater than 100* (a number), strict comparison fails and the item gets dropped. The Filter node has a *Less Strict Type Validation* toggle in its options pane — enable it when you're mixing types and trust the auto-conversion, or explicitly coerce in an expression: `{{ Number($json.amount) }}`.

If you want to *see* what got dropped — useful when 90% of items are getting filtered and you suspect the condition is wrong — replace the Filter with an If node temporarily. The false branch shows you exactly what's being excluded.

## If — when you want two paths

The If node has two outputs: a *true* branch and a *false* branch. Items where the condition evaluates to true flow out the top; items where it's false flow out the bottom. Both branches are live — you connect different downstream nodes to each.

Use If when *both* outcomes need work, just different work:

- Paid invoices go to the "done" archive; unpaid go to the chase queue.
- New customers get the welcome sequence; returning customers get the loyalty offer.
- Webhook events with `event_type: "subscription.created"` go one way, `subscription.cancelled` goes another.

The condition UI is identical to Filter. AND / OR combinators work the same way. The only structural difference is that nothing gets silently dropped — every item ends up somewhere.

### The Merge-after-If gotcha

There's a behaviour the docs flag explicitly that catches almost everyone the first time. If you connect a **Merge** node downstream that joins both branches of an If, *both branches will execute* — even the one that the condition shouldn't have triggered. n8n walks back from the Merge node and pulls data through whichever branch the merge needs, regardless of the If's verdict.

In practice this means: if your "true" branch sends a Slack notification and you have a downstream Merge to consolidate paths, the Slack will fire even for items that should have taken the false branch. The fix is either to remove the Merge (use sub-workflows for re-converging logic instead — Ch. 27) or to gate the Slack node itself with a second If or a Filter.

This is the kind of behaviour where the official docs are the only place that warns you clearly — community tutorials often build workflows that quietly suffer this bug. When something downstream of an If is firing for items it shouldn't, look for a Merge.

## Switch — when you want three or more paths

The Switch node is the multi-path router. Where If asks one yes/no question, Switch asks "which of these N buckets does this item belong to?" and sends it down the matching output. Each output is a separate branch on the canvas.

The lead qualifier from the cold open is a Switch node. Three buckets — small, mid, large — three outputs.

Switch has two modes. You pick one when configuring the node:

**Rules mode** is the default and the one you'll use 90% of the time. Each rule is a condition (same UI as Filter and If); each rule gets its own output. You define them in order:

- Output 1: `amount` is less than 5000
- Output 2: `amount` is between 5000 and 50000
- Output 3: `amount` is greater than 50000

By default, an item is sent to the *first* matching output and stops there. If you want an item that matches multiple rules to go to all of them — for example, a Slack alert *and* a CRM update for high-value leads — toggle *Send data to all matching outputs* in the node options. This turns matching from "first wins" into "all that match."

**Expression mode** is for when the routing is data-driven enough that listing rules visually becomes unwieldy. You write a single expression that returns an integer — the output index — and the item is sent to that output:

```
{{ $json.priority === 'urgent' ? 0 : $json.priority === 'high' ? 1 : 2 }}
```

Use Expression mode when the routing depends on a lookup, a calculation, or a field you'd rather not enumerate in a UI. The cost is that your routing logic is now inside an expression rather than visible at a glance — power users prefer this; readers of your workflow will not. Default to Rules mode.

### Fallback output: what happens to items that don't match anything

This is where Switch usually breaks in production. By default, an item that matches none of the rules is **silently dropped** — same behaviour as Filter, but with no visible warning. You won't notice until a customer asks why their submission never got a follow-up.

The *Fallback Output* option (in the node's Options pane) controls this. Three choices:

- **None** — default. Unmatched items are dropped. Almost never what you want in production.
- **Extra Output** — adds a separate, additional output for unmatched items. Connect this to a logging node, an error notifier, or a manual-review Slack channel. This is the production-safe default — always enable it before going live.
- **Output 0** — unmatched items go to the same place as the first rule. Use this only when "default" really means "lump in with bucket 1," which is rare and usually masks a thinking error.

Always pick *Extra Output* and connect it to something — even just a Set node that logs the unmatched item to a Google Sheet. Silent drops are the worst kind of bug because nobody sees them until someone asks.

### Other Switch options worth knowing

- **Ignore Case** (default on) — `Premium` matches `premium`. Turn off when case actually matters (rare).
- **Less Strict Type Validation** — same as Filter's toggle. Turn on when comparing string-y numbers from a webhook against numeric thresholds.
- **Rename Output** — give each output a label that shows on the canvas. *Small / Mid / Large* is clearer than *0 / 1 / 2* once the workflow has six nodes downstream of each.

## The "is this even a branching node problem?" check

Before reaching for any of the three, ask: is this a *path* decision or a *value* decision?

If the only difference between branches is what value goes into a single field — "Hi name" vs "Hi there", `urgent` vs `standard`, RM 5,000 vs RM 50,000 — a ternary inside an expression handles it inline. No extra node, no branch on the canvas, less surface area for things to break.

The branching nodes are for when the downstream *work* differs — different API calls, different messages to different channels, different records to write to different sheets. The moment the work is "compute a value and move on," stay in expression territory.

## The two classic traps

**Type-mismatch silent failures.** Webhook payloads, third-party API responses, and form submissions almost always return numbers as strings. Comparing string `"100"` to number `100` with strict equality fails. All three nodes have a *Less Strict Type Validation* toggle for this; turn it on or explicitly cast with `Number()`, `String()`, or `Boolean()` in an expression. If a Filter is dropping more than expected or a Switch is sending too many items to the fallback, this is the first thing to check.

**Conditions on missing fields.** If `$json.priority` doesn't exist on some items, a condition like *priority equals 'urgent'* will return false (not error) and the item will go to the false branch of an If or the fallback of a Switch. Guard with `??` in the condition's value expression — `{{ $json.priority ?? 'standard' }}` — or pre-fill missing fields with a Set node before the branching node. This is one of those cases where five seconds of defensive coding upstream saves an hour of debugging downstream.

## The takeaway

- **Three branching nodes, three jobs.** Filter drops, If forks two ways, Switch routes to many.
- **Filter is subtractive.** Items that fail the condition disappear silently. Use it for invalid-data cleanup before the real work.
- **If is bifurcating.** Both branches are live. Watch for the Merge-after-If gotcha — a downstream Merge node will pull *both* branches' worth of data through, even items that shouldn't have taken that path.
- **Switch is multi-routing.** Rules mode (visual conditions) for most cases; Expression mode (return an output index) for data-driven routing. **Always set Fallback Output to *Extra Output* before going live** — silent drops are production's worst bug class.
- **Type strictness is the most common reason branches don't behave.** `"100"` ≠ `100`. Enable *Less Strict Type Validation* or cast explicitly with `Number()` or `String()`.
- **Use a ternary in an expression for value branches, not path branches.** If only one field changes, stay inline.

## Try it yourself

Extend the Chapter 4 workflow (Schedule → Calendar → Gmail) into a Switch-routed version that handles three day shapes differently:

1. After the Calendar node, add a **Switch** node in *Rules mode*.
2. Define three rules:
   - Output 1: `{{ $('Google Calendar').all().length }}` *equals* `0` — empty day.
   - Output 2: `{{ $('Google Calendar').all().length }}` *is between* `1` and `4` — light day.
   - Output 3: `{{ $('Google Calendar').all().length }}` *greater than* `4` — heavy day.
3. Use *Rename Output* to label them *Empty*, *Light*, and *Heavy*.
4. Set *Fallback Output* to *Extra Output* and connect it to a no-op Set node labelled "shouldn't happen — investigate."
5. Connect each output to a Gmail node with a different subject line: "Clear day ahead", "Manageable day", "Heavy day — block focus time."

**You'll know it worked when** you can run the workflow against three different test dates — one Saturday with no events, one weekday with two events, one Monday with six — and the right email lands each time, with no items going down the *shouldn't happen* path. If the fallback ever fires, your rules don't cover the full range; fix the gap.

## What's next

You can now route. The next problem is *waiting*. Some workflow steps can't run immediately — they need to wait for a webhook response, pause until business hours, hold for human approval before sending a mass email to 12,000 customers, or rate-limit themselves so a third-party API doesn't 429 them. Chapter 14 covers the **Wait** node and the patterns for approval gates: how to pause a workflow safely, how to resume it from a Slack button or an email click, and which actions are big enough that a human should sign off before they execute.
