---
title: 16. How do you process 10,000 items without breaking everything? | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: Batching, looping, rate limits, and AI cost control in n8n — Loop Over Items, the Wait pairing, built-in batching, and the five patterns that keep AI nodes from burning your budget.
meta-twitter:title: Learn Automation Working
---

# 16. How do you process 10,000 items without breaking everything?

The lead qualifier you've been extending across this part of the book has been running on yesterday's batch — 1,200 records from HubSpot. It dies at item 47.

You check the Executions log. The error is `Request failed with status code 429 — Too Many Requests`. HubSpot's API throttled you. Your retry settings (Chapter 15) caught the first few and recovered, but the cap kicked in and the workflow stopped.

You'd also been watching the OpenAI bill. The AI Agent node was averaging $0.38 per lead. At 1,200 leads, that's RM 1,900 for one nightly batch. The 429 saved you from finishing.

This chapter is about the three problems that show up together at scale: **throughput** (can the workflow get through the list at all), **rate limits** (does it respect what the APIs allow), and **cost** (does it burn money you didn't budget for). The patterns for handling each are different. The decision to use them rarely is.

## The three problems

| Problem | What it feels like | What fixes it |
|---|---|---|
| Throughput | Workflow times out, hangs, or runs out of memory partway through a large list | **Batch the work** — process in chunks instead of all at once |
| Rate limits | Third-party API returns 429 or 503 errors a few minutes into the run | **Pace the work** — add a Wait between batches |
| Cost | OpenAI / Anthropic bill creeps up faster than expected | **Filter and route work** — only spend AI tokens where they earn their cost |

The mistake to avoid is reaching for the same tool every time. Batching, pacing, and cost control are three different concerns; the patterns overlap but the tradeoffs differ.

## Loop Over Items — the misunderstood node

The most misunderstood node in n8n is **Loop Over Items**, also labelled *(Split in Batches)*. Programmers see the name and assume it's a for-loop primitive, the way Python or JavaScript loops. They reach for it whenever they need to "iterate." That's wrong, and reaching for it unnecessarily is the most common source of overcomplicated workflows.

n8n already loops by default. From Chapter 11: when a node receives 200 items, it processes them one after another without you doing anything. The HTTP Request node will fire 200 times. The Set node will set fields on each of 200 items. The Gmail node will send 200 emails. You don't need a loop construct to make this happen.

**Loop Over Items exists for one job**: giving you explicit control over *how many items pass through to the next node at a time, and how often*. That's a different concern from "iterate." Specifically:

- When the downstream node can't handle the full batch — some nodes (RSS Read, the legacy mail nodes) only process the first item they receive. Loop Over Items with Batch Size 1 forces one-at-a-time processing.
- When you need to introduce a delay between groups of items for rate-limiting purposes.
- When you want to chunk work for parallelism or recovery — process 50, write to the CRM, process another 50.

If none of those apply, you don't need Loop Over Items. Trust the default per-item processing.

### Configuration

The node has one important parameter: **Batch Size** — how many items to send through the loop output per iteration. Defaults to 1. Set it to your chunk size: 1 for strict one-at-a-time, 50 for "fifty at a time," and so on.

The node has two outputs:

- **Loop** — the current batch, sent to the downstream processing nodes.
- **Done** — fires once when all batches have been processed, with the original items aggregated.

The standard wiring pattern: connect Loop to a chain of nodes that does the work, then connect the *last* node in that chain back to Loop Over Items. The node automatically tracks where it is in the list and advances on each pass.

### The Wait pairing — the most important rule

By itself, Loop Over Items does not introduce delay. It just controls batch size. If you set Batch Size 50 and connect the loop output straight to the next node, n8n will fire the batches back-to-back as fast as the system can run them. You will still hit rate limits.

For rate-limit pacing, you must pair the loop with a Wait node:

```
Loop Over Items (Batch Size: 50)
    → HTTP Request (process batch)
    → Wait (After Time Interval: 2 seconds)
    → [back to Loop Over Items]
```

The Wait node here is doing the actual rate limiting. The loop is just sizing the chunks. Forget the Wait and the loop becomes ornamental — you've added complexity without changing the rate of API calls.

The pause duration depends on the API. HubSpot's standard quota allows about 100 requests per 10 seconds; spacing batches of 50 by 2 seconds keeps you well under. OpenAI's free tier permits 3 requests per minute on some models; you'd batch 1 with a 25-second wait. Always check the specific service's documented rate limits and set the Wait accordingly — guessing is how you discover the limit by exceeding it.

## Built-in batching on specific nodes

Some nodes have batching options baked in. When they do, prefer the built-in version — it's one node instead of a Loop+Wait sub-flow, with the same effect.

**HTTP Request node** — in the Options pane, *Add Option → Batching*. Sets *Items per Batch* and *Batch Interval (ms)*. Internally this is the same Loop Over Items + Wait pattern, but as a single-node configuration.

**AI Agent and AI Tool nodes** — these have a *Batch Processing* option exposed in the node's Options pane, with *Batch Size* (parallel items) and *Delay Between Batches* (ms). For AI calls that hit OpenAI, Anthropic, or Gemini rate limits, this is the canonical control. You set it once on the agent node; no extra loop scaffolding required.

When the node you're using supports built-in batching, use it. Falling back to Loop Over Items + Wait is for the cases where the node doesn't — most Sheets / Drive / Slack / Notion nodes, and any custom HTTP Request work where you need the loop's *Done* output to do something explicit.

## Cost control for AI nodes

Rate limits are about *how fast* you call. Cost is about *whether you call at all*. Five patterns, in order of impact for a typical SME workflow.

**1. Filter before you spend.** The cheapest AI call is the one you don't make. If your lead qualifier processes 1,200 leads but 800 of them are obviously self-serve (free trial signups, missing company field, personal Gmail address), pre-filter with a Filter node (Chapter 13) so AI only sees the 400 that might be worth a sales call. You just cut the bill by 67% without changing any prompts.

**2. Strip the input before sending.** A common production mistake: pull a full HubSpot record (40 fields, half of them HTML-formatted timestamps, audit metadata, the conversation history from six months ago), shove the whole thing into the prompt. The AI is now paying input tokens to read fields it can't use. Insert a Set node before the AI call that builds a clean input object — name, company, role, last activity, and the actual question. Five fields instead of forty.

**3. Use the cheap model for the cheap task.** A lead-scoring pipeline often has two AI steps: a classification ("is this a real business or a spam signup?") and a write-up ("draft a first-touch outreach"). Classification is a small-model job — GPT-4o-mini, Claude Haiku, or Gemini Flash do it for a fraction of the cost. Write-ups can stay on the larger model where quality matters. Two separate AI Agent nodes with different model selections, not one node doing both.

**4. Cap Max Iterations on the AI Agent.** The AI Agent node can call its tools in a loop — investigate, call a tool, get a result, decide whether to call another tool, repeat. The default cap is generous. For deterministic workflows where two or three tool calls is plenty, set *Max Iterations* explicitly on the agent. A runaway agent that loops through 20 tool calls per item, across 1,200 items, is how you discover the cost ceiling.

**5. Log token usage.** The AI nodes return token counts in their output (under the metadata). Append each execution's input tokens, output tokens, and computed cost to a Google Sheet or Airtable. After a week of running, you'll know exactly where the spend is going — usually it's one or two prompts that have ballooned without anyone noticing. Without this log, cost is a vague monthly surprise. With it, cost is a column you can sort.

## The manual retry loop

Chapter 15 named a real limit: *Retry On Fail* caps at 5 attempts and 5000ms between tries. For most transient errors that's plenty. For rate-limit recovery with exponential backoff — wait 1 second on the first retry, 2 on the second, 4 on the third, 8 on the fourth, out to a minute or two — you need a manual loop.

The shape:

```
[Set retryCount = 0]
    → [Try the operation: HTTP Request / AI call / whatever]
    → If success: continue downstream
    → If error: 
        → Set retryCount = retryCount + 1
        → If retryCount > 5: Stop And Error (give up, alert via error workflow)
        → Wait (delay = 2 ^ retryCount * 1000 ms)
        → Loop back to "Try the operation"
```

In practice this is Loop Over Items + a counter in a Set node + If (check the counter) + Wait (with an expression like `{{ Math.pow(2, $json.retryCount) * 1000 }}` ms) + your operation node. It's seven or eight nodes for what built-in retry handles in two clicks — but it gets you exponential backoff out to two minutes, with a hard ceiling, with logging at each step.

Reserve this pattern for nodes that legitimately need it: AI Agent calls that hit token-per-minute rate limits, scraping workflows against APIs that throttle aggressively, anything where 5 fast retries don't help and you need to actually wait it out.

## Two traps worth memorising

**Loop Over Items without a Wait.** You set Batch Size 50, connect it through your processing chain, run it, and it still gets 429s halfway through. The loop is firing batches back-to-back at full speed. Loop Over Items is *not* a rate limiter — it's a chunker. The Wait node is the rate limiter. Always pair them when rate limits matter.

**Dumping whole records into AI prompts.** The single biggest source of unnecessary AI cost in production workflows. The symptom: your nightly bill is 3× what your prompts should warrant. The cause: somewhere upstream of the AI Agent, the entire output of a CRM/helpdesk/database node is being passed in, full of audit fields and HTML. The fix is a Set node that constructs a clean input. Five minutes of plumbing, often half the monthly bill.

## The takeaway

- **Throughput, rate limits, and cost are three different problems with overlapping patterns.** Diagnose which you have before choosing a tool.
- **n8n loops by default.** Reach for Loop Over Items only when you need explicit control over batch size or batch timing — not just because you want to "iterate."
- **Loop Over Items is a chunker, not a rate limiter.** Pair with a Wait node for actual rate limiting; without the Wait, batches fire back-to-back and you still hit limits.
- **Prefer built-in batching when the node supports it.** HTTP Request has *Add Option → Batching*. AI Agent / AI Tool have *Batch Processing*. One node beats a Loop+Wait sub-flow.
- **AI cost control is a stack of five patterns, in order of impact: filter before spending, strip the input, use cheap models for cheap tasks, cap Max Iterations, log token usage.** Apply in that order.
- **The manual retry loop is the escape hatch from Ch. 15's 5-try cap.** Loop + counter + If + Wait + your operation. Reserve for cases where exponential backoff out to minutes is actually needed.

## Try it yourself

Build a rate-limited batch processor against a free public API, so you can see batching and pacing working together without burning credits.

1. **Schedule Trigger** (manual is fine for testing).
2. **HTTP Request** → `https://jsonplaceholder.typicode.com/users` — returns 10 fake users.
3. **Loop Over Items** with **Batch Size: 3**.
4. Connect the Loop output to a second **HTTP Request** → `https://jsonplaceholder.typicode.com/posts?userId={{ $json.id }}` — gets that user's posts.
5. **Wait** node → After Time Interval: 1 second.
6. Wire the Wait node back to **Loop Over Items**.
7. Connect Loop Over Items' **Done** output to a **Set** node that just passes through `{{ $input.all().length }}` items.

Run it. Watch the executions tab. The batches should fire one at a time — 3 items, wait, 3 items, wait, 3 items, wait, last 1 item — taking roughly 4 seconds total, not the half-second it would have taken without the Wait.

**You'll know it worked when** you can change the Wait to 5 seconds and the total runtime jumps to roughly 16 seconds, and change Batch Size to 10 and the total runtime drops to roughly 1 second (no Wait fires because it's all one batch). Two parameters, predictable effects. That's the model — chunks plus delay equals controlled throughput.

## What's next

Part III has built the working machinery: triggers, items, expressions, branching, waits, errors, and now batching. One piece remains before we add AI — the data-shaping toolkit that sits between almost every pair of nodes. Chapter 17 covers the **Edit Fields (Set)** node (n8n's workhorse), the **Merge** node's four modes and the silent-data-loss trap in one of them, and the **Code** node as the escape hatch for the small set of transformations the visual nodes can't express. After that, Part IV turns to AI.
