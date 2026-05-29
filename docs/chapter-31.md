---
title: 31. Custom code — advanced patterns | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: The Code node patterns that earn their keep — stateful logic with $getWorkflowStaticData, AI-generated code via the Ask AI tab and AI Transform node, JMESPath for deeply nested JSON, and when to refactor a Code-node monster into a sub-workflow.
meta-twitter:title: Learn Automation Working
---

# 31. Custom code — advanced patterns

You've had a Code node in your workflow for three weeks. It started as four lines that deduplicated some array. Then you added date math. Then you wrapped the dedupe in a try/catch because the upstream sometimes sends bad shapes. Now it's eighty lines, no one else on the team can read it, and you can't remember whether the early-return on line 27 was deliberate or a debugging artefact you forgot to remove.

This is the moment [Chapter 17](./chapter-17.md) didn't prepare you for — when Code nodes graduate from *occasional escape hatch* to *thing that needs the same engineering care as production code*. Most workflows never get here. The ones that do are usually doing one of three things: stateful processing across executions, custom error semantics, or transformations too complex for the Set node and expressions to express cleanly.

This chapter is for those workflows. It assumes you've read Chapter 17 and reach for Code nodes deliberately — not as the first option, not for things expressions can do.

## When you've outgrown the Set node

Chapter 17 made the case: fewer than 5% of workflows genuinely need a Code node, and when you do reach for one, three lines often replace ten nodes. The three triggers that mean *yes, Code is the right tool here*:

**Multi-step transformations that don't fit one expression.** Filter, then map, then reduce, then group-by — chaining those through Set / Filter / Aggregate nodes can work, but past a certain complexity threshold it becomes harder to read than the equivalent JavaScript. The test: if the workflow has four nodes back-to-back all doing data shaping, with no business logic in between, a single Code node is often clearer.

**Stateful logic that needs to persist across executions.** A workflow that needs to remember "what was the last record ID I processed?" or "when did I last successfully refresh this access token?" Static data is what makes that possible — see Pattern A below.

**Custom error semantics.** "If this third-party API returns 429, wait and retry; if 500, give up; if anything else, throw a specific error type the parent workflow can route on." The 5-attempt Retry On Fail cap from [Chapter 15](./chapter-15.md) can't express this. Neither can the manual retry loop from [Chapter 16](./chapter-16.md) if the retry decision depends on response content rather than just success/failure.

The anti-trigger: **don't reach for Code when a node-and-expression combination does the job clearly.** A Set node plus a Filter node plus an If branch is usually more reviewable than a Code node, even when the Code node has fewer characters. The exception is when the Code node would replace ten or more nodes — at that point the canvas readability cost of staying nodes-only exceeds the readability cost of having one Code node to understand.

## The Code node in n8n v2

Two language options, both running through n8n v2's task-runner architecture.

**JavaScript** is the default and the better-supported path. Runs on Node.js inside an isolated task runner process. The task runner is enabled by default in v2 (`N8N_RUNNERS_ENABLED=true`, covered in [Chapter 28](./chapter-28.md)). Two recent CVEs — CVE-2026-1470 and CVE-2026-0863 — are sandbox escapes that the task-runner architecture was strengthened to prevent. If you're on v2, you have the protection; if you're not, you should be.

**Python** was added natively in n8n 1.111.0 and is stable as of v2. Important: the old **Pyodide-based Python is gone in v2.** Anyone running Python Code nodes on v1.x with Pyodide needs to migrate when upgrading. Native Python runs through a separate task-runner image (`n8nio/runners`) — usually deployed as a sidecar container alongside n8n if you want Python support, with allowlisted dependencies configured at the runner level. Native Python supports `_items` and `_item` for n8n data access, but doesn't support n8n's other built-in methods and variables that JavaScript has — fewer ergonomics for n8n integration, more raw Python.

For most readers most of the time: **use JavaScript.** Python is for cases where you specifically need a Python library (a specific data-science package, a vendor SDK that only ships Python) or where your team's strongest code-review muscle is in Python.

Two restrictions to internalise regardless of language:

- **The Code node cannot make HTTP requests directly.** Use the HTTP Request node ([Chapter 18](./chapter-18.md)) for external calls. The Code node also cannot access the filesystem or read host environment variables. If your code needs any of that, the architecture is wrong — refactor the data-fetching out to dedicated nodes.
- **Two execution modes:** *Run Once for All Items* (default — code runs once, sees the whole array via `$input.all()`) and *Run Once for Each Item* (code runs per item, sees `$json` for the current item). The wrong mode is the most common Code-node beginner trap. Use Run Once for All Items when you're doing array operations (filter, sort, group); use Run Once for Each Item when each item needs independent transformation and you want clean item-linking ([Chapter 11](./chapter-11.md)).

## Three patterns worth knowing

### Pattern A: stateful logic with `$getWorkflowStaticData()`

n8n provides a function for persisting small amounts of data across executions of the same workflow: `$getWorkflowStaticData(scope)`, where scope is `'global'` (shared across all nodes in the workflow) or `'node'` (scoped to the single Code node that calls it). When the workflow execution succeeds, n8n automatically saves any changes to the static data object.

The canonical use case is incremental sync: remember the last-processed ID or timestamp so the next execution only processes what's new.

```javascript
const staticData = $getWorkflowStaticData('global');
const lastProcessedId = staticData.lastProcessedId || 0;

// only process items newer than the last marker
const newItems = $input.all().filter(
  item => item.json.id > lastProcessedId
);

// update the marker; n8n saves on successful completion
if (newItems.length > 0) {
  staticData.lastProcessedId = Math.max(
    ...newItems.map(i => i.json.id)
  );
}

return newItems;
```

Two honest constraints. First, **static data only persists for production executions** — runs triggered by Schedule, Webhook, or app-event triggers. Manual executions from the editor don't save changes. This catches people out during testing: you write the code, it works manually, you activate the workflow, and then state doesn't behave the way you expected. Always test with the actual production trigger active.

Second, the [official docs caveat](https://docs.n8n.io/code/cookbook/builtin/get-workflow-static-data/) that this "may behave unreliably under high-frequency workflow executions," and recent community reports back this up. For low-frequency state — last-seen timestamps on a 15-minute polling workflow, access tokens that refresh daily — it's fine. For anything mission-critical or high-volume, use the database from [Chapter 29](./chapter-29.md) instead. A real Postgres table with a `last_processed_id` row gives you the same semantics, persists reliably, and can be inspected externally.

### Pattern B: AI-generated code

When you know what transformation you want but don't want to hand-write it, n8n has two AI-assisted code paths.

**The Code node's Ask AI tab** is the working default. Set the Code node's Language to JavaScript, click the Ask AI tab, write a plain-English prompt describing the transformation, click Generate Code. The output drops into the Code tab where you can edit it. This is currently a trial feature with no usage limits stated yet — n8n's [AI coding docs](https://docs.n8n.io/code/ai-code/) note that paid-tier limits may apply later.

**The AI Transform node** is a separate, dedicated node — Cloud-only, where the generated code is read-only inside the node. You can copy it into a Code node to edit it. Useful for one-shot transformations where you want the AI to compose and run the code in one step, with no intent to edit. For most working patterns, the Code node's Ask AI tab is the more flexible default — you get the AI starting point *and* the ability to refine.

Both features have the same caveat that any AI-generated code does: it works on the data the AI saw, and it may not work on edge cases the AI didn't see. The discipline is:

- **Test with deliberately-malformed inputs** before activating. Empty arrays, missing fields, unexpected types, nulls where you'd expected strings. The AI didn't think about these; you have to.
- **Read the generated code before approving it.** It's still your code once you ship it. If you can't follow what it does, ask the AI to explain, or rewrite the prompt and regenerate.
- **Don't let it touch destructive operations unsupervised.** Generating a transformation that filters data: fine. Generating a query that deletes rows in Postgres ([Chapter 29](./chapter-29.md)): not without human review.

### Pattern C: JMESPath for deeply-nested JSON

Sometimes the JavaScript would be ten lines and the equivalent JMESPath query is one. n8n includes the JMESPath library as `$jmespath()`, available both in expressions and in the Code node:

```javascript
// A webhook payload like:
// { orders: [{ id: 1, total: 99 }, { id: 2, total: 149 }] }

const allTotals = $jmespath($json, "orders[*].total");
// returns: [99, 149]

const expensiveOrderIds = $jmespath($json, "orders[?total > `100`].id");
// returns: [2]

const orderSummary = $jmespath($json, "orders[*].{id: id, amount: total}");
// returns: [{ id: 1, amount: 99 }, { id: 2, amount: 149 }]
```

JMESPath earns its keep when you're reaching into deeply-nested webhook payloads, third-party API responses, or LLM outputs with predictable shape. For shallow access, `$json.field` is plainer and clearer.

**One footgun worth knowing.** n8n's `$jmespath()` uses `search(object, searchString)` argument order, which is the *opposite* of the JMESPath specification's `search(searchString, object)`. When you copy examples from [jmespath.org](https://jmespath.org/), swap the argument order. The [official n8n JMESPath docs](https://docs.n8n.io/code/cookbook/jmespath/) flag this explicitly.

## When to refactor a Code node into a sub-workflow

Code nodes scale up to a point and then they don't. Three signals tell you you've crossed it.

**The Code node has grown past 40-50 lines.** It's no longer "a tiny piece of bespoke logic" — it's the workflow's load-bearing transformation, and it deserves its own canvas. Refactor into a sub-workflow ([Chapter 27](./chapter-27.md)) with a defined input contract via the Execute Sub-workflow Trigger.

**The same Code-node logic appears in multiple workflows.** Copy-pasting Code-node JavaScript between three workflows means you have three places to fix the same bug. Extract to a reusable sub-workflow (Pattern B from Chapter 27) with the field list as the published API.

**The Code node mixes responsibilities** — fetches, transforms, *and* routes all in one block. Each responsibility wants its own node. Pull the fetch out to an HTTP Request node. Pull the routing out to a Switch or If node. The Code node should be doing one coherent thing.

The refactor doesn't have to be all-or-nothing. A sixty-line Code node often becomes one fifteen-line Code node (the core transformation) plus two or three Set / Filter / Switch nodes around it — making the workflow more diff-able even before any sub-workflow extraction. The discipline is *visible logic*: anything a teammate has to read code to understand is a candidate for being pulled into a node where the configuration is the documentation.

## Try it yourself: stateful incremental sync

Build a workflow that uses `$getWorkflowStaticData()` to remember which Postgres rows it has already processed, so each scheduled run only emits genuinely new ones.

You'll need a Postgres credential ([Chapter 29](./chapter-29.md)) and the `customers` table from Chapter 29's exercise (or any table with an integer `id` column and at least a few rows).

1. **Schedule Trigger** firing every 15 minutes (set the workflow timezone explicitly per [Chapter 30](./chapter-30.md)).
2. **Postgres node** in Execute Query mode: `SELECT id, email, name FROM customers ORDER BY id ASC LIMIT 100`.
3. **Code node** (JavaScript, Run Once for All Items):
   ```javascript
   const staticData = $getWorkflowStaticData('global');
   const lastId = staticData.lastProcessedId || 0;

   const newItems = $input.all().filter(
     item => item.json.id > lastId
   );

   if (newItems.length > 0) {
     staticData.lastProcessedId = Math.max(
       ...newItems.map(i => i.json.id)
     );
   }

   return newItems;
   ```
4. **A downstream action** of your choice — Slack message ("new customer: {name}"), Set node for inspection, anything observable.
5. **Activate the workflow.** Watch the first scheduled run process whatever rows are currently in the table. Wait for the next run — it should process zero items (nothing new). Add one row to the customers table. Wait for the next run — it should process exactly that one row.

**You'll know it worked when** the first activated run processes existing rows, the second run processes zero items, and inserting a new row leads to exactly that one row being processed on the next scheduled run.

If static data behaves flakily — failing to persist between runs, treating every run as the first — switch to the Chapter 29 pattern: a small dedicated Postgres table (`workflow_state(workflow_id, key, value)`) where you read and write the last-processed marker via the Postgres node. Slower to wire up, more reliable.

## The takeaway

- **Reach for Code when expressions and existing nodes genuinely won't do.** Most workflows don't need a Code node. The ones that do typically have stateful logic, custom error semantics, or transformations too complex for chained nodes.
- **JavaScript is the default; native Python is for specific library needs.** Pyodide is gone in v2; v1 Python Code nodes need migration.
- **Code nodes run in isolated task runners by default in v2.** No filesystem access, no direct HTTP, no env vars — these are features, not bugs. Use HTTP Request, Read/Write Files, and credential storage instead.
- **`$getWorkflowStaticData()` persists state across production executions only.** Manual runs don't save. Good for low-frequency state; use the database for anything mission-critical or high-volume.
- **AI-generated code via the Code node's Ask AI tab or the AI Transform node is a starting point, not a finished product.** Read it before approving; test with deliberately-malformed inputs.
- **JMESPath is the right tool for deeply-nested JSON.** Note that n8n's `$jmespath()` argument order is reversed from the spec — `search(object, searchString)`.
- **Refactor Code nodes into sub-workflows** when they grow past ~40-50 lines, when the same logic appears in multiple workflows, or when responsibilities are mixed. Often a partial refactor (smaller Code node plus surrounding nodes) is enough.

## What's next

Chapter 32 closes the book. The anti-patterns the author has seen and committed — over-staging, under-monitoring, the 200-node monolith, the workflow nobody owns, the AI node that costs RM 900 a month before anyone notices. What's coming in the wider automation landscape: MCP integration, agentic workflows, native AI evaluation. And the honest part: what this book will get wrong as tools change underneath it.
