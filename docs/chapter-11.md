---
title: 11. Why does data flow as items? | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: The single most important concept in n8n — items, JSON, item linking, and run-once-per-item vs run-once-for-all. Everything else clicks once this lands.
meta-twitter:title: Learn Automation Working
---

# 11. Why does data flow as items?

You build your second real workflow. It pulls a list of yesterday's HubSpot deals, runs them through an AI Agent to score follow-up urgency, then writes the score back to HubSpot. You hit *Test Workflow*. The AI Agent fires *once* — gets all 47 deals as one giant blob — and returns a single "score: 8" for the whole batch. You wanted one score per deal.

You try the opposite: split the AI Agent into "Run once for each item". Now the workflow runs 47 times, perfectly — except your *next* node expects a single summary it can email, and instead it's now getting 47 separate executions. You're sending yourself 47 emails.

Or this one: you write a Code node with `return $json.email.toLowerCase()` and it errors out with *"undefined is not an object"*. The exact same expression worked yesterday on a different workflow. You can't see what changed.

Every one of these has the same root cause. The data model in n8n isn't quite what most people assume when they start. Once you internalize it, every one of these problems vanishes — and most of n8n's apparent quirks reveal themselves as direct consequences of how the model works.

This chapter is the most important conceptual chapter in the book. The data model isn't difficult, but it has to land. Read it slowly.

## The model in one sentence

> **Data in n8n flows between nodes as an array of items, where each item is a JSON object.**

That's it. The whole model. Everything below is consequences of that one sentence.

Let's unpack it carefully, because the precise wording matters.

**Array.** Data is always *plural*. Even when a node produces one piece of output — a single email, a single API response — that one piece is wrapped in an array of length one. Even when a node produces nothing useful — say, a status check that just confirms a system is up — n8n still gives you an empty array. **Data is never a single object floating around the workflow; it's always a list.**

**Item.** Each element in the array is called an **item**. Items are the universal currency of n8n. When you read the docs and see *"the previous node had 47 items"* or *"this node ran once per item"*, that's what's being counted. A list of HubSpot deals is 47 items. A single Slack message about today's weather is 1 item. An empty calendar's worth of events is 0 items.

**JSON object.** Each item is a JavaScript-style key-value object. Strings, numbers, booleans, arrays, nested objects — anything valid JSON can hold. The shape varies node-to-node: a HubSpot deal item has fields like `dealname`, `amount`, `dealstage`; a Slack message item has `channel`, `user`, `text`. The data shape is *not enforced* by n8n — what matters is that each item is *some* JSON object.

The actual structure n8n uses internally is this:

```json
[
  {
    "json": {
      "name": "Acme Corp",
      "amount": 5000,
      "stage": "Negotiation"
    }
  },
  {
    "json": {
      "name": "Wayne Industries",
      "amount": 12000,
      "stage": "Closed Won"
    }
  }
]
```

Each item is `{ "json": { ... your data ... } }`. The wrapper `json` key is how n8n separates *structured data* from *binary data* (more on binary in a moment). When you see an item in the editor's data pane, n8n hides this wrapper for readability — but when you write expressions or Code nodes, you'll see it.

That's the canonical structure. From [docs.n8n.io/data/data-structure](https://docs.n8n.io/data/data-structure/), worth verifying directly: this is *the* format every node speaks.

## Why items, not just "data"?

The shape isn't arbitrary. It's the shape that makes most of n8n's power work.

**Branching becomes natural.** When 47 deals flow into a Filter node, the Filter examines each item independently and outputs the items that match. No special "loop" logic needed; the items model means "do something per record" is the default behaviour of most nodes, not a special case.

**Merging becomes natural.** When you want to combine 47 enriched deals with the original 47 source records, the Merge node lines them up by position or by field. The fact that data is an array makes alignment a tractable problem.

**Database-like operations work directly.** Filter, Sort, Limit, Aggregate, Split Out, Remove Duplicates — every one of these nodes treats its input as a list and operates on it the way SQL would. Items map cleanly to database rows; transformations between nodes map cleanly to SELECT operations.

**Parallelism is implicit.** When you connect 47 items into an HTTP Request node and configure *"Run once for each item"*, n8n calls the API 47 times. You didn't write a loop. The shape did the work.

The cost of all this elegance is exactly one concept: you have to keep the *items mental model* in your head when reasoning about a workflow. *"How many items will flow into this node? How many will flow out? Will the next node run once or many times?"* Once that question becomes automatic, n8n stops surprising you.

## Run Once for All Items vs Run Once for Each Item

This is the single most confusing setting in n8n, and it's where most workflow bugs live. Nodes that involve code or AI — the Code node, AI Agent, Information Extractor, HTTP Request (sometimes) — let you choose between two execution modes:

**Run Once for All Items (the default).** The node receives the *entire array* of incoming items as one bundle and runs *once*. Use this when you want to do something *to the collection* — aggregate, summarize, sort, run a single AI summary over many records, count things. Inside the node, you access items via `$input.all()` (returns the full array), `$input.first()`, `$input.last()`.

**Run Once for Each Item.** The node runs *once per incoming item*. Use this when you want to do something *to each record individually* — call an API per deal, classify each ticket, draft a personalised email per customer. Inside the node, you access the current item via `$input.item.json` or the shorthand `$json`.

The bug at the top of this chapter — *"the AI Agent fired once and returned one score for 47 deals"* — was Run Once for All Items where the workflow wanted Run Once for Each Item. The fix is one dropdown change in the node settings.

The opposite bug — *"the workflow now runs 47 times and sends 47 emails"* — is what happens when you switch the AI Agent to per-item but forget to add a **Merge** or **Aggregate** node downstream to collapse the 47 outputs back into one summary. Per-item processing fans out; if you want to fan back in, you have to do it explicitly.

A useful mental rule: **per-item is for actions that should happen N times. All-items is for actions that should happen once over a collection.** When you find yourself thinking "I want to run this AI on each lead" — that's per-item. When you find yourself thinking "I want to summarize these 47 leads in one Slack post" — that's all-items.

## Expressions: `$json`, `$('NodeName')`, and the rest

Expressions are how you reference data from one node inside the configuration of another. The syntax uses double-curly-braces — `{{ ... }}` — and inside, you have access to a small but powerful set of variables.

The five you'll use 95% of the time:

- **`$json`** — shorthand for *"the current item's `json` field"*. Only works in **Run Once for Each Item** mode (because "current item" only makes sense when one item is being processed at a time). In a Set node configured to run per-item, `{{ $json.email }}` gives you the email field of the current item.
- **`$input.item.json`** — the long form of `$json`. Same meaning. Use this when you want to be explicit; use `$json` when you want brevity.
- **`$input.all()`** — the full array of incoming items. Use this when you need to operate on all of them at once (count them, sum them, find the max).
- **`$input.first()`, `$input.last()`** — the first or last item in the input array. Useful when you know the array has exactly one item (like after an Aggregate or Limit node).
- **`$('NodeName').item`** — refers to the corresponding item from a *different* node further back in the workflow. Use this when the current node sits downstream of a branching/merging structure and you need to reach back to an earlier node's data.

The third bug from the top of this chapter — *"the same expression worked yesterday on a different workflow"* — is almost always a `$json` problem. The workflow that worked had the node in **per-item mode**; the workflow that didn't has it in **all-items mode**, where `$json` is undefined because there's no single "current item." Switch the node's execution mode or use `$input.first().json.email` instead.

## Item linking — how n8n knows which item is which

There's a subtlety that becomes important the moment you have more than one item flowing through more than one node: **how does n8n know that the third HubSpot deal corresponds to the third AI score corresponds to the third Slack message?**

The answer is **item linking** (sometimes called *pairedItem*). When a node processes 47 items and outputs 47 items, n8n automatically maintains a thread of *"this output item came from that input item"* for each one. When you write an expression like `{{ $('HubSpot').item.dealname }}` in a node that's downstream of an AI Agent that ran per-item — n8n follows the thread back through the AI Agent, finds the matching HubSpot deal for the current item, and gives you the right `dealname`.

Most of the time you don't think about this. n8n's automatic item linking handles it for you. The two scenarios where it matters:

**1. In the Code node, when you create new items.** If your Code node returns brand-new objects (rather than transforming the input items), n8n can't automatically figure out which input each output corresponds to. You have to set `pairedItem` manually when returning data:

```javascript
return $input.all().map((item, index) => ({
  json: { score: someCalculation(item) },
  pairedItem: index   // explicitly link this output to input #index
}));
```

For most Code node uses (just modifying existing items), you don't need this — return the items as-is and the linking comes along for free.

**2. In sub-workflows (Ch. 27).** Item linking can break across the *Execute Workflow* node boundary in some configurations. n8n's docs flag this as a known issue. If you're calling a sub-workflow and `$('UpstreamNode').item` returns the wrong record in the parent workflow, this is the culprit. Workaround: pass identifiers explicitly through the sub-workflow and look them up after the call.

For most beginner workflows, item linking is invisible — it just works. But knowing it exists means that when something *doesn't* work, you'll know where to look.

## Binary data — the other half of items

So far we've only talked about JSON. Items can also carry **binary data** — file attachments, images, PDFs, audio, anything that isn't a JSON-serializable structure.

When binary is present, an item looks like this:

```json
{
  "json": {
    "filename": "invoice-2026-03.pdf",
    "from": "vendor@example.com"
  },
  "binary": {
    "attachment": {
      "data": "JVBERi0xLjQKJ...",
      "mimeType": "application/pdf",
      "fileName": "invoice-2026-03.pdf",
      "fileExtension": "pdf"
    }
  }
}
```

The `binary` key sits alongside `json` at the top level of the item. Inside, each attachment has a key name (`attachment` above — you choose this when configuring nodes), and the value contains the base64-encoded data, the MIME type, the file extension, and the original filename.

You don't have to understand this structure deeply — most binary data flows through workflows automatically. Gmail trigger receives an email with a PDF attached → the item has `json` metadata and `binary.attachment` containing the PDF → an Extract From File node reads `binary.attachment` → its output extracts text into `json.text` → a downstream node uses it. The plumbing is invisible.

You'll need to know this structure when you write Code nodes that touch binary, or when you're debugging *"why isn't my file showing up in the next node?"* (Answer: usually the binary key name doesn't match what the downstream node expects.)

## The shape on the canvas: schema, JSON, and table views

When you run a node in the editor and look at the output, n8n shows you the data in one of three views, toggleable at the top of the data pane:

- **Schema view** — the recommended default. Shows the *shape* of the items: field names, their types, with a small preview of values. This is the view you drag-and-drop from when building expressions in downstream nodes.
- **JSON view** — the raw item array, exactly as you'd see it in a Code node. Useful when you want to copy a sample for testing, or to verify the wrapper `json` key structure.
- **Table view** — rows and columns, like a spreadsheet. Useful when items are uniform in shape (all the same fields). Less useful when items vary.

A useful workflow: build with **Schema view** open in the previous node's pane (so you can see what's available to reference), then switch to **Table view** when you want a quick eyeball of the data quality.

There's also a powerful debugging move that beginners miss: **pin data**. Right-click any node and select *Pin data*. Whatever was there last time becomes "frozen" — subsequent workflow runs use the pinned data instead of re-fetching from the source. Use it when the upstream node is slow (an API call), expensive (an AI call), or rate-limited. Unpin when you want fresh data.

## The takeaway

- **Data in n8n flows between nodes as an array of items, where each item is a JSON object.** That's the whole model.
- **Run Once for All Items** (default) processes the entire array as one bundle. **Run Once for Each Item** processes one item at a time. Pick based on whether the work is *over the collection* or *per record*.
- **`$json`** = current item's data, only valid in per-item mode. **`$input.all()`** = full array. **`$('NodeName').item`** = matching item from another node, following item-linking threads.
- **Item linking (pairedItem)** is automatic for most node operations; you only think about it in Code nodes that create new items or in sub-workflows.
- **Binary data** rides alongside JSON in the `binary` key of each item. Most binary plumbing is automatic.
- **Pin data** on slow or expensive nodes during development to skip re-fetching.

## Try it yourself

Build a workflow that demonstrates the model end-to-end:

1. **Schedule trigger** (manual is fine for testing).
2. **HTTP Request** → call `https://jsonplaceholder.typicode.com/users` — a free API that returns an array of 10 fake user records.
3. **Set node** → in *Run Once for Each Item* mode, add a field `greeting` set to `{{ "Hello " + $json.name + " from " + $json.address.city }}`.
4. **Code node** → in *Run Once for All Items* mode, paste:
   ```javascript
   return [{ json: { total_users: $input.all().length, names: $input.all().map(i => i.json.name) } }];
   ```
5. Run the workflow. Observe each node's output in Schema view, then JSON view, then Table view.

Write down:

```
Items into the Set node:    ____
Items out of the Set node:  ____
Items into the Code node:   ____
Items out of the Code node: ____
```

**You'll know it worked when** you can predict each number *before* clicking *Test step*. If you can, you've internalized the items model. The Set node was per-item, so 10 in / 10 out. The Code node was all-items, so 10 in / 1 out. The whole rest of n8n is just variations on that bookkeeping.

## What's next

You now have the data model. The next chapter is the syntactic counterpart — **expressions**. How to actually *write* `{{ $json.email.toLowerCase() }}` and the dozens of small operations that go into shaping data from one node into what the next one needs. Ch. 12 is a hands-on tour of the expression editor, the dollar-syntax variables, and the small library of helpers (Luxon for dates, common string operations, type conversions) that turn the data model into actual working workflows.
