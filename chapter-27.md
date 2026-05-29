---
title: 27. Sub-workflows — keeping the canvas readable | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: When to split an n8n workflow into sub-workflows, how the Execute Sub-workflow and Execute Sub-workflow Trigger nodes work, the two canonical patterns (extract for readability, build for reuse), and the v2.0 wait-for-completion fix that unlocks reusable human-in-the-loop approval gates.
meta-twitter:title: Learn Automation Working
---

# 27. Sub-workflows — keeping the canvas readable

You'll know you want a sub-workflow the day your main canvas has 60 nodes and you're hunting for the one that's failing. The workflow does five things at once. Three teammates have edited it in the last fortnight. The Executions log is red, the failing node is somewhere inside that mess, and zooming in doesn't help because the failing node is now adjacent to seven other nodes that all look slightly relevant.

That's the moment. Up to that moment, a single canvas is fine. Past that moment, you start losing time to navigation rather than to the work the workflow actually does.

This chapter is about splitting one workflow into several, calling them from one another, and treating each piece as something a single owner can hold in their head. Part VI opens here because it's the most common Part VI need — most teams running n8n hit canvas overload before they hit any of the harder problems (self-hosting, scale, advanced code, direct database operations) that the rest of Part VI covers. You do not need this on day one. You need it on the day you can't find the failing node.

## When you actually want a sub-workflow

Three triggers, one anti-trigger.

**Canvas readability has collapsed.** The rough threshold is around 30 nodes — past that, you spend more time scrolling than building. It's a soft number; a 40-node linear pipeline can still be readable, while a 25-node workflow with three branches and a Loop Over Items can already feel claustrophobic. The test is whether you can mentally walk through the whole workflow without dragging the canvas. If you can't, splitting helps.

**The same logic appears in multiple workflows.** When you find yourself building "post to Slack with our team's standard formatting" or "look up a customer's tier in HubSpot and return their SLA" for the fourth time, that logic wants to be a sub-workflow. Build it once, call it from everywhere, update it in one place forever.

**Different team members own different slices.** A workflow that pulls leads from one system, scores them with AI, writes them to CRM, and notifies sales touches four roles. If the marketing lead, the AI specialist, the salesops admin, and the BD lead all need to edit the same canvas, edits step on each other. Splitting the workflow into role-shaped sub-workflows gives each owner their own canvas to maintain. The [at-least-two-owners rule from Chapter 9](./chapter-09.md) applies to each sub-workflow independently.

The anti-trigger: **don't pre-emptively split for tidiness.** A 15-node workflow doesn't benefit from being three 5-node sub-workflows; it benefits from a clear left-to-right layout and good node names. Splitting adds a navigation step (open the sub-workflow to see what it does) that's worth paying for *readability you actually need*, not worth paying for *tidiness you imagine you want*. The Switch node from Chapter 13 often does the routing job people reach for sub-workflows to do.

## How sub-workflows actually work

Two nodes do the work, one on each side.

**On the parent side: the Execute Sub-workflow node.** You point it at the sub-workflow (either select from a list of your existing workflows, or pass a workflow ID), and it sends the current items as input data. The most important setting is **Wait for Sub-Workflow Completion** — when on (the default), the parent pauses until the sub-workflow finishes and receives whatever the sub-workflow's last node emits. When off, the parent fires-and-forgets and moves on immediately. *Fire-and-forget is the wrong default for most use cases* — you almost always want the result, and you almost always want errors in the child to surface to the parent. Turn it off only when you're using a sub-workflow as a background notification job and don't care about its output.

The Execute Sub-workflow node also gives you a **View sub-execution** link in the Executions log. Click through and you're inside the child's execution, with a link back to the parent. This is how debugging works across sub-workflow boundaries: a failure in the child shows up in the parent's execution, you click through to the child's execution, you see the actual failed node. The link works in both directions.

**On the child side: the Execute Sub-workflow Trigger node** (the search bar labels it *When Executed by Another Workflow*). This replaces the regular trigger — a sub-workflow doesn't have a Schedule or Webhook trigger, it has the *being-called-by-another-workflow* trigger. If you're migrating to n8n v2.0 from an older version, note that the old **Start** node is gone; any sub-workflow that still has one needs the Execute Sub-workflow Trigger added in its place. The [v2.0 migration tool](https://docs.n8n.io/migration-tool-v2/) flags these.

The Execute Sub-workflow Trigger has three input-data modes, and the choice matters more than it looks:

| Mode | What it does | When to pick it |
|---|---|---|
| **Define using fields below** | You declare the inputs the sub-workflow expects, with names and types. The parent's Execute Sub-workflow node automatically pulls these fields in as a mappable form. | The default for any sub-workflow you intend to call from more than one place. Treat the field list as the sub-workflow's API contract. |
| **Define using JSON example** | You paste an example input JSON; n8n infers the shape. | Useful when the input shape is fixed but complex enough that listing fields one by one is tedious. |
| **Accept all data** | The sub-workflow accepts whatever the parent sends, no validation. | Quick-and-dirty for one-off extractions. Avoid for reused sub-workflows — without a defined contract, parents and child drift apart and one day the child receives `null` where it expected an array. |

Data flow itself is straightforward: the parent's Execute Sub-workflow node sends items to the child's Execute Sub-workflow Trigger; the last node of the child sends data back to the parent's Execute Sub-workflow node, which then passes it downstream. It's the same Trigger → Workflow → Connected Apps architecture from Chapter 2, [nested one level deep](./chapter-02.md).

One operational gotcha: the child workflow must not contain errors at the moment the parent calls it. If the child has a node in an error state (a missing credential, an invalid expression), the parent's call fails immediately. Activate the child, run it manually once to confirm it executes clean, *then* wire the parent.

## The two patterns worth knowing

Almost every working sub-workflow falls into one of two shapes.

**Pattern A — Extract for readability.** You take a long workflow that has grown beyond what one canvas can hold, identify a coherent chunk inside it, and move that chunk into its own canvas. The original workflow shrinks to a single Execute Sub-workflow node where the chunk used to be. The chunk's internals stay the same; what changes is that you no longer scroll past them when you're working on a different part of the parent.

n8n's built-in sub-workflow conversion (available from v1.97.0 on every plan) automates this. Select a continuous group of nodes — one input from the rest of the workflow, one output back to it — open the context menu, choose **Sub-workflow conversion**, and n8n moves the selected nodes into a new workflow and replaces them in the parent with an Execute Sub-workflow node already wired to call it. Expressions that referenced upstream nodes are rewritten to reference the new sub-workflow's input parameters; the conversion handles most of the mechanical work for you. The [conversion docs](https://docs.n8n.io/workflows/subworkflow-conversion/) note a few caveats worth knowing — expression accessors like `first()` and `last()` don't always translate cleanly, and AI cluster nodes need special handling — but for the common case of "extract this routing block" or "extract this data-shaping section," it works.

**Pattern B — Build for reuse.** You build a sub-workflow specifically because you want to call it from many places. The canonical examples: a `post-formatted-message-to-slack` sub-workflow that every parent calls when it needs to notify the team (consistent formatting, single place to update); a `lookup-customer-tier` sub-workflow that every CS-side workflow calls (one source of truth for tier logic); a `request-approval-via-slack` sub-workflow that BD, marketing, and finance workflows all use for human-in-the-loop gates. The input contract is critical here — use the Execute Sub-workflow Trigger's *Define using fields* mode and treat the field list as the sub-workflow's published API. When the contract changes, every caller knows what to update.

The two patterns aren't exclusive. A reuse-built sub-workflow can also clean up a parent's canvas; a readability-extracted sub-workflow can later become reusable if another workflow needs the same logic.

## The v2.0 wait-for-completion fix (Chapter 14's forward-reference cashed in)

[Chapter 14](./chapter-14.md) closed by promising that the historically-broken interaction between sub-workflows and the Wait node was fixed in n8n v2.0. Here's the substance.

The bug: if a parent workflow used Execute Sub-workflow with *Wait for Sub-Workflow Completion* turned on, and the child workflow entered a *waiting* state (a Wait node with timeout above 65 seconds, a webhook resume, a form-submit resume, or a Send-and-Wait-for-Response node from Chapter 14), the parent didn't actually wait. It received the *input data that went into the child*, not the eventual *result after the child resumed and finished*. If you had wired a parent workflow to call an approval sub-workflow and only proceed on Approve, the parent would proceed anyway — with stale data — because as far as it knew, the child had already returned.

This was an outright correctness bug, and it's why the canonical position before v2.0 was: don't put Wait nodes or human-in-the-loop steps inside sub-workflows. Keep them in the parent.

**[n8n v2.0 fixes this](https://docs.n8n.io/2-0-breaking-changes/).** The parent now correctly waits through the child's waiting state and receives the output from the end of the child workflow. What this unlocks is the *reusable approval gate*: a single `request-approval` sub-workflow, with the Slack Send-and-Wait-for-Response node inside it, called from every workflow that needs a human gate. One canonical approval pattern, maintained in one place, used everywhere — exactly the Pattern B shape from the previous section.

If you're on v1.x, this still bites you. The migration path is to upgrade to v2.0 and then review any sub-workflow that contained Wait-style behaviour — the fix changes what data the parent receives, which is the right behaviour, but if you had built workarounds against the broken behaviour, those break. The official [v2.0 migration tool](https://docs.n8n.io/migration-tool-v2/) flags affected workflows.

Honest note: the fix covers the headline cases (Wait, webhooks, forms, Send-and-Wait), but [community reports](https://community.n8n.io/t/wait-for-sub-workflow-completion-option-is-super-confusing-and-not-working-as-expected/285652) suggest a few edge cases — Code nodes immediately after a Wait inside the child, certain async patterns — where behaviour is still surprising. Test the specific sub-workflow you build, especially before wiring it into a payments or customer-email parent.

## Operational notes worth knowing

Three things that don't fit anywhere else, all worth a sentence.

**Sub-workflow executions don't count toward n8n Cloud's monthly execution or active-workflow limits.** A parent that calls three sub-workflows is one billable execution, not four. This is a real cost lever — workflows that fan out heavily are cheaper as sub-workflow architectures than as one monolith repeated across many top-level workflows.

**The "This workflow can be called by" setting governs who can invoke a sub-workflow.** Find it in the sub-workflow's Settings panel. You can restrict to *any workflow*, *workflows in the same project*, or a specific named list. For sensitive sub-workflows (anything that writes to finance systems or sends customer-facing email), restrict to the workflows that should genuinely call it. Without the restriction, anyone with edit access to any workflow in your instance can invoke it.

**Treat shared sub-workflows like shared libraries.** Two owners per sub-workflow (the Chapter 9 rule), a clear input contract, a changelog comment at the top of the canvas when behaviour changes, and a deprecation path if you ever need to retire one. The whole point of building for reuse is *one source of truth*; the failure mode is *one source of truth that nobody noticed had been edited*.

## Try it yourself: a reusable post-to-team-channel sub-workflow

Build Pattern B. Create one sub-workflow that takes channel name, message body, and severity (info / warning / error); formats the message with severity-based styling; and posts to Slack. Then call it from two different parent workflows and watch them both produce identically-formatted messages with no Slack-related nodes in either parent.

1. **Create a new workflow** called `sub_post_to_team_channel`. Add an **Execute Sub-workflow Trigger**. Set Input data mode to *Define using fields below*. Add three fields: `channel` (string), `message` (string), `severity` (string).
2. **Add a Set node** to compute the styled message. Use an expression that prefixes the message based on severity — `:large_green_circle: INFO — ` for info, `:warning: WARNING — ` for warning, `:rotating_light: ERROR — ` for error. (Set node from [Chapter 17](./chapter-17.md).)
3. **Add a Slack node** in Post Message mode. Channel: `{{ $json.channel }}`. Text: the styled message from the Set node. Use your existing Slack credential.
4. **Activate** the sub-workflow.
5. **Create parent workflow 1**: a Manual Trigger, then an Execute Sub-workflow node pointing at `sub_post_to_team_channel`. The Inputs section automatically shows the three fields you defined. Fill them with test values (`#test-channel`, `"Deployment complete"`, `info`). Execute manually.
6. **Create parent workflow 2**: a Schedule Trigger (set to run hourly during testing), then an Execute Sub-workflow node pointing at the same sub-workflow, with different values (`#alerts`, `"Hourly health check passed"`, `info`).

**You'll know it worked when** both parent workflows produce identically-formatted Slack messages, neither parent contains a Slack node, and editing the sub-workflow's styling (say, changing the warning emoji) changes the output of both parents on their next run — without you editing either parent.

The pattern generalises: replace Slack with email and you have a reusable email-template sub-workflow; replace post-message with the Send-and-Wait-for-Response approval node from Chapter 14 and you have the reusable approval gate the v2.0 fix unlocks.

## The takeaway

- **The trigger to split is canvas-readability collapse, repeated logic, or split ownership** — not "the workflow feels long." Around 30 nodes is a soft threshold; readability is the real signal.
- **Two nodes do the work:** Execute Sub-workflow on the parent side, Execute Sub-workflow Trigger ("When Executed by Another Workflow") on the child side. The Start node is gone in v2.0.
- **Two patterns cover most cases:** extract for readability (use the built-in sub-workflow conversion from v1.97+) and build for reuse (treat the trigger's field list as the published API).
- **"Wait for Sub-Workflow Completion" should stay on** unless you specifically want a fire-and-forget background job. Fire-and-forget hides errors from the parent.
- **n8n v2.0 fixed the broken Wait-inside-sub-workflow behaviour.** Reusable human-in-the-loop approval gates are now a viable pattern. v1.x users should upgrade and re-test.
- **Sub-workflow executions are free on n8n Cloud's execution-count limit.** Heavy fan-out architectures get cheaper as sub-workflows.
- **Restrict "This workflow can be called by" for sensitive sub-workflows.** Without the restriction, anyone with edit access in your instance can invoke them.

## What's next

Chapter 28 is the chapter for when n8n Cloud's limits start mattering, when PDPA or GDPR requires your data to stay in your jurisdiction, or when you simply want to own the box. Production Docker beyond what Chapter 6 covered — queue mode with workers and Redis, Postgres as the production database, the env vars you actually need, the operational cost. The honest version: most readers don't need to self-host. Some do. Chapter 28 is for the ones who do.
