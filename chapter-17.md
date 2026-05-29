---
title: 17. How do you shape data between nodes? | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: Shaping data between nodes in n8n — Edit Fields (Set), Merge, and Code. The three nodes that make two not-quite-fitting nodes connect cleanly.
meta-twitter:title: Learn Automation Working
---

# 17. How do you shape data between nodes?

Your lead qualifier from Chapter 13 has been pulling new HubSpot contacts and feeding them to an AI Agent that scores intent. Looking at one execution: the HubSpot node's output for a single contact has 47 fields. Customer name. Email. Company. Last activity. Then `hs_analytics_first_referrer`, `hs_email_optout_8523719`, `hubspot_owner_assigneddate`, `recent_conversion_event_name`, six audit-log timestamps, three field-history JSON blobs, and so on.

The AI Agent needs five of those fields. The other 42 are paid input tokens.

This is the most common shape-the-data-between-nodes problem in production workflows. It's also one of three:

- **Shape one stream** (rename, strip, restructure, derive) — what to do with the 47-field HubSpot record.
- **Combine two streams** — how to join two HubSpot lookups, or a lead with its enrichment lookup.
- **Compute when the visual nodes run out** — when a value transformation is gnarlier than an expression can cleanly express.

Three jobs at the boundaries between nodes. Three nodes that solve them: **Edit Fields (Set)**, **Merge**, and **Code**. This chapter is about which to reach for, when.

## Edit Fields (Set) — the workhorse

Internally still named `set` in the node type, displayed as **Edit Fields (Set)** in the modern UI. Everyone still calls it the Set node. It's the second-most-used node in n8n after the trigger, and almost every workflow ends up with at least one.

The node has two modes, picked at the top:

**Manual Mapping** — the GUI mode. You add fields one at a time, give each a name and a value. The value is either Fixed (a literal you type) or an Expression (the `{{ }}` syntax from Chapter 12). Drag a field from the input panel directly into the value box and n8n builds the expression for you.

**JSON Output** — write raw JSON in a text box. The result is added to the input. Useful when you need to construct nested objects or arrays where Manual Mapping would be tedious.

Default to Manual Mapping. Switch to JSON Output only when the structure is gnarly enough to warrant it.

### The four jobs Set actually does

**1. Construct a clean input for the next node.** The most common usage and the answer to the cold open. Before the AI Agent, insert a Set node that builds just the five fields the model needs:

```
Mode: Manual Mapping
Field 1: name        = {{ $json.firstname }} {{ $json.lastname }}
Field 2: company     = {{ $json.company }}
Field 3: role        = {{ $json.jobtitle }}
Field 4: lastActive  = {{ $json.notes_last_updated }}
Field 5: question    = {{ $json.recent_message }}
```

Crucially: in the node's **Options** pane, set **Include in Output** to *No Input Fields*. This strips the other 42 fields entirely. Five fields go into the AI Agent. The bill goes down by 80%.

**2. Rename fields for the next node.** Google Sheets expects column headers `customer_name` and `signup_date`. Your trigger emits `name` and `created_at`. Set node renames them by adding `customer_name = {{ $json.name }}` and `signup_date = {{ $json.created_at }}` and stripping the rest.

**3. Compute derived fields.** Concatenate first and last name into a `full_name`. Format a date into the API's expected shape. Build a Slack message body with template literals. Anything that produces a single new field from existing ones lives here.

**4. Hardcode workflow constants.** Add `source: "n8n-automation"` or `priority: "high"` as a fixed value on every item — n8n inserts the literal, no expression needed.

### The dot-notation gotcha

By default, n8n treats `.` in a field name as nested-object notation. Set the field name as `customer.email` and the value as `ahmad@tan.com`, and the output is:

```json
{ "customer": { "email": "ahmad@tan.com" } }
```

Not `{"customer.email": "ahmad@tan.com"}`. If you actually want the literal dotted name (because the downstream API expects it that way — some legacy systems do), open the Options pane and toggle **Support Dot Notation** off. Now the field name is treated literally.

This bites people once and then they remember it. It also explains why your Google Sheets row sometimes ends up with cells in the wrong columns.

### Run Once for All Items vs Run Once for Each Item

Edit Fields exposes the same mode toggle the Code node has, with the same semantics — covered in detail in the Code section below. The short version: default to *Run Once for Each Item* (one renamed/stripped output per input) and switch to *Run Once for All Items* only when you're building a single aggregated record from many inputs (a summary row, a count, a header). If your Set node produces 1 output for 10 inputs, you've selected the wrong mode.

## Merge — combining two streams

The Merge node takes 2+ inputs and produces 1 output. It has four modes; pick the one that matches your data.

| Mode | What it does | When to use |
|---|---|---|
| **Append** | Stack: Input 1's items, then Input 2's items, sequentially | Consolidating from multiple sources into one stream |
| **Combine by Position** | Pair item 1+1, item 2+2, item 3+3, etc. | Two parallel branches of the same list that need to recombine |
| **Combine by Field** | SQL-like join: match items by a key field | Enriching one source's records with another's |
| **Multiplex** | Cartesian product: every Input 1 item paired with every Input 2 item | Rare — generating combinations (e.g., every product × every region) |

**Append** is the easiest to reason about. If Input 1 has 5 items and Input 2 has 3, the output has 8 items. No matching, no joining — just stacking. Use when both inputs are the same shape and you want a single combined list.

**Combine by Position** is where the silent-data-loss trap lives. If Input 1 has 5 items and Input 2 has 3, the output has **3 items** — Input 1's last two are silently dropped. No error. The output looks healthy. The bug only surfaces when someone notices the row count is wrong. If you reach for Combine by Position, make sure both branches genuinely produce the same number of items in the same order, or you're better off with Combine by Field.

**Combine by Field** is the most useful in practice. You specify a key field on each input (`email` in Input 1, `userEmail` in Input 2) and Merge pairs items where those keys match. Like a SQL inner join. The canonical use case: pull leads from HubSpot, enrich them by calling Clearbit on each email, then Combine by Field on `email` to attach the enrichment to the lead. One Merge, two lookups joined.

**Multiplex** is niche. Use it when you genuinely want every-times-every pairings. If you have 3 products and 4 regions and need a row for each `product × region`, multiplex emits 12 items. Real but rare.

### The waits-for-both-inputs behaviour

Merge waits for *all* its connected inputs to complete before emitting. If one branch of your workflow is faster than the other, Merge holds the fast branch until the slow one catches up. If one branch produces no items at all (an If with no matching items, an HTTP call that returned an empty array), Merge will hang until that branch resolves — and depending on how the workflow is structured, the empty branch can starve the Merge entirely.

The reliable pattern: keep both Merge inputs on guaranteed-producing branches. If a branch might be empty, route around the Merge with an If node, or use a Set node to seed an empty placeholder item so the branch always emits something.

### One trap

Merge needs at least 2 connected inputs. A Merge with only 1 input doesn't merge — it silently doesn't run. Always confirm both ports are wired before testing.

## Code — the escape hatch

Strong opinion up front: **most workflows never need a Code node.** Expressions (Chapter 12), branching (Chapter 13), and the Set/Merge nodes above cover almost everything. Reach for Code when:

1. You're doing array-level transformations that visual nodes can't express (group items, deduplicate, split one item into many).
2. You need string or date manipulation gnarlier than expressions handle cleanly.
3. You're aggregating across all items in ways the Aggregate node doesn't cover.

If none of those apply, you don't need Code. When you do, the node accepts JavaScript (default) or Python (added in n8n v1.111.0, stable from v2). JavaScript is faster — Python pays a compilation cost — but pick the language you're more comfortable reading three months from now.

### The two modes

Like Edit Fields, the Code node has *Run Once for All Items* (default) and *Run Once for Each Item*. The two modes require **different return shapes**, and that's the canonical source of Code-node confusion.

**Run Once for All Items**: the code runs once. `$input.all()` returns the full array of input items. You must return an array:

```javascript
return [
  { json: { name: "Ahmad Tan", email: "ahmad@tan.com" } },
  { json: { name: "Lim Wei Ling", email: "lwl@example.com" } }
];
```

**Run Once for Each Item**: the code runs once per input item. `$input.item` is the current item. You return a single object:

```javascript
return { json: { name: "Ahmad Tan", email: "ahmad@tan.com" } };
```

If you return an array from *Run Once for Each Item*, you'll see `Code doesn't return a single object`. If you return a single object from *Run Once for All Items*, you'll see `An array of items has to be returned`. Both error messages tell you exactly what to fix — switch modes or change your return shape.

### Three copy-pasteable patterns

The point of this section is to deliver on the "no JavaScript background required" promise. Three patterns cover the vast majority of legitimate Code use cases: deduplicating (many-in, fewer-out), splitting (one-in, many-out), and aggregating (many-in, one-out).

**1. Deduplicate items by email.** Run Once for All Items:

```javascript
const seen = new Set();
const unique = $input.all().filter(item => {
  if (seen.has(item.json.email)) return false;
  seen.add(item.json.email);
  return true;
});
return unique;
```

Returns only the first occurrence of each email; duplicates are dropped silently.

**2. Split a delimited field into multiple items (one-to-many).** Run Once for All Items:

```javascript
const out = [];
for (const item of $input.all()) {
  const tags = (item.json.tags || "").split(",").map(t => t.trim()).filter(Boolean);
  for (const tag of tags) {
    out.push({ json: { ...item.json, tag } });
  }
}
return out;
```

One contact with `tags: "vip, lapsed, malaysia"` becomes three items, each with one tag. Useful when downstream nodes process per-tag.

**3. Aggregate across items (many-to-one).** Run Once for All Items:

```javascript
const total = $input.all().reduce(
  (sum, item) => sum + (Number(item.json.amount) || 0),
  0
);
return [{ json: { totalAmount: total, itemCount: $input.all().length } }];
```

Sums an `amount` field across all input items and returns a single summary item. The `Number(...)` cast handles the case where amount arrives as a string (Ch. 13's type-strictness trap, in code form).

### What the Code node cannot do

The Code node runs in a sandbox. **It cannot make HTTP requests, and it cannot access the file system.** If you need to call an API, use the HTTP Request node (Chapter 18). If you need to read or write files, use the Read/Write Files from Disk nodes (or send the file as binary data through the workflow).

This restriction is deliberate. It keeps Code nodes deterministic and prevents workflows from making arbitrary outbound calls from inside what looks like a transformation step. Resist the temptation to work around it; the canonical answer is always "use the dedicated node for that."

## "Do I even need a Code node?" — a quick test

Before opening Code, ask these three questions in order:

1. **Can an expression do it?** `$json.name.toLowerCase().trim()` doesn't need a Code node. If the transformation fits in a single `{{ }}` line, stay in an expression.
2. **Can a chain of Set / If / Filter / Merge nodes do it?** If yes, prefer the visual nodes — your future self (or your teammate) will read the canvas faster than they'll read code.
3. **Does it involve arrays of items? Grouping, deduping, splitting one item into many, aggregating across all items?** Now you have a legitimate Code-node case.

The test exists because every Code node is a small black box in an otherwise visual workflow. Three months from now, the canvas is readable at a glance; the Code node requires opening and reading. Use them where they're genuinely needed; avoid them where they aren't.

## Two production traps

**Edit Fields leaking unwanted fields.** The *Include in Output* option defaults to *All Input Fields*. This is sometimes right (you want to add a field while keeping everything else) and sometimes wrong (you wanted to strip the input down to just what you set). When a downstream API call is mysteriously paying for 40 fields you didn't ask about, this is usually the cause. Check the option pane.

**Code mode mismatch.** *Run Once for All Items* returning a single object, or *Run Once for Each Item* returning an array, both produce errors that say exactly what's wrong but bite first-time users daily. When in doubt, default to *Run Once for All Items* and return an array — it's the more powerful mode and the only one that supports one-to-many or many-to-one transformations.

## The takeaway

- **Three nodes, three jobs at the boundaries.** Edit Fields shapes one stream, Merge combines two, Code computes when the visual nodes run out.
- **Edit Fields (Set) is the workhorse — strip, rename, derive, and hardcode.** Watch the *Include in Output* default (it keeps everything) and the dot-notation gotcha (`.` creates nested objects unless you disable it).
- **Merge has four modes with very different behaviour.** Append for stacking, Combine by Field for SQL-style joining, Combine by Position only when item counts and order are guaranteed to match, Multiplex for Cartesian products. Combine by Position silently truncates when lengths differ.
- **Code is the 5% escape hatch.** Two modes with different return shapes; pick the language you'll read in three months. Cannot make HTTP requests or touch the file system.
- **Run the three-question test before opening Code.** If an expression or a chain of visual nodes can do it, do that instead.

## Try it yourself

Build a small data-cleaning workflow that uses all three nodes, end-to-end.

1. **Manual Trigger** with sample data. Click into the trigger, set the *Pin data* option, and paste this JSON to simulate input:
   ```json
   [
     { "name": "ahmad tan", "email": "AHMAD@TAN.COM", "tags": "vip, malaysia" },
     { "name": "LIM WEI LING", "email": "lwl@example.com", "tags": "lapsed" },
     { "name": "ahmad tan", "email": "AHMAD@TAN.COM", "tags": "duplicate" }
   ]
   ```
2. **Code** node, *Run Once for All Items* — deduplicate by email, using pattern 2 above.
3. **Code** node, *Run Once for Each Item* — title-case the name and lowercase the email:
   ```javascript
   const titleCase = $input.item.json.name
     .toLowerCase().split(' ')
     .map(w => w.charAt(0).toUpperCase() + w.slice(1))
     .join(' ');
   return { json: { ...$input.item.json, name: titleCase, email: $input.item.json.email.toLowerCase() } };
   ```
4. **Edit Fields (Set)** — set *Include in Output* to *No Input Fields*. Add three fields:
   - `customer_name` = `{{ $json.name }}`
   - `customer_email` = `{{ $json.email }}`
   - `imported_at` = `{{ $now.toISO() }}`
5. Run the workflow.

**You'll know it worked when** the output is exactly 2 items (the duplicate dropped), names are properly cased ("Ahmad Tan", "Lim Wei Ling"), emails are lowercase, and only the three renamed fields appear — `tags` is gone because Set stripped it. Three nodes, three transformations, one clean output ready for the next step in any real workflow.

## What's next

You've shaped the data inside the workflow. Now you need to bring in data from outside — from the 350+ services that don't have a built-in n8n node. Chapter 18 covers the **HTTP Request** node, the one node that opens up the entire web API ecosystem. The three authentication patterns (API Key, Bearer Token, OAuth2), how to read API documentation just enough to translate it into n8n config, the Import cURL button that compresses the whole setup into a paste, and the **Respond to Webhook** action node — the synchronous counterpart for when something else is calling your workflow and waiting on a response.
