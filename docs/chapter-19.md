---
title: 19. How do you put a real AI agent inside a workflow? | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: The AI Agent node in n8n — chat models, memory, tools, output parsers, and the three-layer pattern that turns a model into a workflow-grade agent.
meta-twitter:title: Learn Automation Working
---

# 19. How do you put a real AI agent inside a workflow?

Your lead qualifier from earlier in the book pulls new HubSpot contacts every hour, shapes the record down to the five fields that matter (Chapter 17), and routes by deal value with a Switch node (Chapter 13). It works. What it doesn't do is *score the intent* of the lead — that judgment call about whether someone is genuinely close to buying, or just downloading a whitepaper, or kicking tyres on a Sunday afternoon.

Right now you're doing that scoring by hand. You read each lead's most recent message, their job title, their company size, and you assign a score 1–5 in a Google Sheet. Three minutes per lead, sixty new leads a day, three hours of your week gone to a judgment that an LLM could do.

You've been pasting these into ChatGPT in a browser tab anyway. The question is how to wire that judgment *into the workflow itself*, so each new lead gets scored automatically, the score becomes a field in the data, and the downstream Switch can route accordingly.

That's what the **AI Agent** node does. This chapter is how it works, and how to build your first one.

## What an "agent" actually is

A chat model on its own is a function: text in, text out. Useful, but stateless and unable to *do anything* in the world beyond producing words.

An **agent** is a chat model wrapped in three additional things: **tools** (capabilities it can call), **a decision loop** (the agent reads the input, decides whether to answer directly or call a tool, reads the result, and repeats until it can answer), and **optional memory** (context from previous turns). In n8n, this is all expressed as a **cluster of nodes**: the AI Agent root with smaller sub-nodes attached from below, each providing one capability — detailed next.

> **One thing the docs flag and most secondary tutorials don't.** Prior to n8n v1.82.0, the AI Agent node had a setting for picking between agent *types* — Tools Agent, ReAct Agent, Plan and Execute, Conversational. That setting is gone. The current node is unified, behaving as what used to be called the Tools Agent. If you find a 2024 tutorial telling you to pick an agent type, the screenshots are out of date. There's now exactly one shape to learn.

## The cluster: what attaches to what

Every working agent has at minimum two sub-nodes attached:

- **A Chat Model** — required. The actual LLM doing the work. OpenAI, Anthropic, Google Gemini, plus DeepSeek / Groq / Azure / Ollama (self-hosted).
- **At least one Tool** — required. Even if the agent's only "tool" is a calculator it never uses, the node refuses to execute without one connected.

Two more sub-nodes are common, both optional:

- **Memory** — for multi-turn conversations. Simple Memory for prototypes; Postgres Chat Memory or Redis Chat Memory for production.
- **Output Parser** — for forcing the agent's response into a JSON shape your workflow can branch on. The difference between "the agent returned a paragraph of analysis" and "the agent returned `{ score: 4, reason: "active deal stage" }`."

The visual is consistent: the Agent node sits on the canvas; sub-nodes hang off it from the bottom edge, each clipped into a labelled attachment point (`Chat Model`, `Memory`, `Tool`, `Output Parser`). It looks distinctive once you've seen it. There's no confusion about what's an agent and what isn't.

## Credentials: getting the three big models connected

Three chat models cover ninety percent of n8n agent workflows. Each takes one API key.

- **OpenAI** — key at `platform.openai.com`. Most cost-effective entry-level model at time of writing is `gpt-4o-mini`; the frontier models cost more. The node dynamically lists what your account has access to.
- **Anthropic** — key at `console.anthropic.com`. Claude Haiku for cheap and fast, Claude Sonnet or Opus for capability. Pricing comparable to OpenAI on a per-task basis.
- **Google Gemini** — key at `aistudio.google.com`. Free tier is generous for prototyping. Gemini Flash for speed, Gemini Pro for quality.

Setup is the same for all three: add the corresponding Chat Model sub-node, click into its credential field, paste the API key, save.

A strong opinion: start with whichever provider you already have an account with. Don't sign up for three. Switching providers later is one node swap — system prompt, tools, memory, and downstream workflow logic all stay the same.

One quirk worth knowing on OpenAI: the node lets you pick between the **Chat Completions API** (the classic endpoint, mature and stable) and the newer **Responses API** (with built-in agentic loop). OpenAI recommends Responses for new projects. For most n8n workflows either is fine; pick Chat Completions if you want the most predictable behaviour.

## Layer 1: Your first agent

Build the minimum viable agent. Three nodes, runnable in five minutes.

1. **Chat Trigger** — n8n's built-in chat UI. Gives you a chat window you can type into and watch the agent respond.
2. **AI Agent** node, connected to the trigger.
3. Attach a **Chat Model** sub-node (whichever provider you set up above).
4. Attach the **Calculator** tool sub-node. (It does exactly what it sounds like: takes a math expression, returns the result.)

In the Agent node's *System Message* field, type something simple: `You are a helpful assistant. Use the calculator tool when math is required.`

Open the chat window and ask: `What's 47 times 1,834, then divide by 3?`

You'll see the agent think, call the Calculator tool with `47 * 1834 / 3`, get back `28,732.66...`, and reply with the answer in a sentence. The Executions log shows you each step — the model's reasoning, the tool call, the tool's response, the final reply. This is the agent loop in action.

That's the entire shape of every n8n agent. Everything else is variation: different models, different tools, different prompts.

## Layer 2: Add memory

Layer 1 has no memory. Every turn in the chat starts from scratch — ask "who's the prime minister of Malaysia" and then "how old are they", and the second question fails because the agent doesn't remember who *they* refers to.

Add a **Simple Memory** sub-node, attach it to the Memory connector on the Agent node, and conversational continuity appears. The agent now sees the previous turns as context.

Simple Memory has one important parameter: **Context Window Length** (default 5). This is the number of previous interactions the agent remembers. Higher numbers cost more tokens; lower numbers lose more context. For prototypes and short workflows, the default is fine.

There's a constraint worth flagging. Simple Memory stores conversation history **in memory on the n8n server**. When n8n restarts — for a deploy, a crash, a cloud-side update — that memory is gone. For prototyping this is invisible. For a production customer-support bot, it's catastrophic: every customer's conversation forgets itself overnight.

For production, swap Simple Memory for **Postgres Chat Memory** or **Redis Chat Memory**. Same connection point on the Agent node, same conversational behaviour, but the history is stored in a database that survives restarts. Each chat is keyed by a **session ID** — usually the user's ID, email, or a unique token — so memory is per-user, not global.

> **A canonical naming gotcha.** In current n8n the node is called **Simple Memory**. In templates from 2023–2024 you'll see it called **Window Buffer Memory** — that was the previous name. Behaviour is the same. If a copied template fails with a version-mismatch error on Window Buffer Memory, delete the node and re-add Simple Memory; you'll get the latest version.

## Layer 3: Structured output

This is the layer that turns an agent from "something you chat with" into "something a workflow can use."

By default, the Agent returns a string of text. For a chat UI that's fine. For a workflow that wants to read the agent's verdict and then branch on it, a string is annoying — you'd have to parse natural language to know whether the answer was "yes" or "no" or "maybe, depending on what you mean by..."

The fix: connect a **Structured Output Parser** sub-node. Two steps:

1. In the Agent node, toggle **Require Specific Output Format** on. A new attachment point (*Output Parser*) appears on the node.
2. Attach a **Structured Output Parser** sub-node. In its config, set Schema Type to *Generate from JSON Example*, and paste an example of the JSON shape you want the agent to return.

For the lead-scoring case, an example like this works:

```json
{
  "score": 4,
  "confidence": "high",
  "reason": "active deal stage, technical decision-maker, recent meaningful engagement"
}
```

n8n infers the schema from the example — `score` is a number, `confidence` is a string, `reason` is a string. Every field is treated as required. The agent is now constrained to return JSON matching that shape, validated before the workflow continues. Downstream nodes can do `{{ $json.output.score }}` and branch on it cleanly.

One operational note from canonical experience: **remove JSON formatting instructions from your system prompt when you enable Structured Output Parser**. The parser enforces the structure mechanically, by passing it to the model as a formatting requirement. Asking the system prompt to *also* return JSON ("Please reply only in JSON, with these fields...") is redundant and occasionally counterproductive — the agent may wrap the JSON in code-fence backticks and break the parser. Let the parser do the structural enforcement; let the prompt focus on the task.

## Tools and `$fromAI()`

Layer 1 used the Calculator. Real workflows use more interesting tools. The Tool sub-nodes most often used:

- **HTTP Request Tool** — lets the agent call any HTTP API. Pair with Chapter 18's work and the agent can hit Clearbit, your own internal API, anything addressable.
- **Workflow Tool** — lets the agent call another n8n workflow as a tool. Useful for encapsulating multi-step actions ("look up a customer record, format it, return") behind a single tool call.
- **App tool nodes** — most app nodes (Google Sheets, Slack, Notion, HubSpot) can be exposed as a tool the agent decides when to use. The exact name in the menu is *<App> Tool* or appears under the agent's *+ Tool* picker.

When you wire up a tool, each of its parameters can be populated in two ways: by you (with an expression like `{{ $json.email }}`, the same syntax from Chapter 12), or **by the agent itself, at runtime**, using the `$fromAI()` function.

`$fromAI()` is the modern way for the LLM to decide what to pass to a tool. Each parameter field on a tool node has a small AI button next to it; click it, and the field fills with an expression like:

```
{{ $fromAI('email', 'The contact email address to look up', 'string') }}
```

That signature is `$fromAI(key, description, type, defaultValue?)`. The agent reads the description, decides what value belongs in that field given the conversation context, and passes it to the tool. If the agent doesn't know, it asks the user (in a chat workflow) or fails gracefully (in a deterministic workflow).

This is a substantial capability. It means the agent isn't just deciding *which* tool to call but also *what to pass*. The HubSpot Tool can be wired with `$fromAI()` on its *contact email* field, and the agent will figure out the email to look up from context — from the chat input, from earlier tool results, from upstream workflow data.

The button-based UX makes this approachable for non-developers. You don't write `$fromAI()` by hand; you click *Let the model define this parameter* and n8n fills the expression in for you, pre-populated with a sensible description.

## Production discipline

Chapter 16's AI cost-control stack applies in full. The two patterns most worth re-stating here:

- **Cap *Max Iterations*** on the Agent node. Default is generous. For deterministic workflows where two or three tool calls is plenty, set this to 5 or 10 explicitly. A runaway agent that loops twenty tool calls per input, across a hundred inputs, is how you discover the cost ceiling — by exceeding it.
- **Choose the model for the task.** Lead-scoring is a small-model job; first-touch outreach drafting is a larger-model job. Two AI Agent nodes with different Chat Model sub-nodes, not one node doing both.

And Chapter 14's human-in-the-loop pattern surfaces here in a new form. The AI Agent supports **human review for tool calls**: when the agent is about to call a sensitive tool — send an email, modify a CRM record, delete data — you can require approval before it executes. This uses the same *Send and Wait for Response* primitive from Chapter 14, exposed in the Agent's tool panel under *Human review*. Reserve it for tools where the cost of a wrong call is high; ungated, low-stakes tools (lookups, calculations) don't need it.

## Three production traps

**Missing Chat Model.** The most common new-user error. The Agent node refuses to execute and you see *Could not get parameter*. Cause: no Chat Model sub-node connected. Click the *+ Chat Model* button at the bottom of the Agent node and pick one. The Agent will not run without it.

**Output parser schema mismatch.** Symptom: workflow fails at the Agent node with *Invalid JSON in model output* or *Model output doesn't fit required format*. Cause: the agent returned something that doesn't match the schema — often wrapped in extra keys (`{ output: { score: 4 } }` instead of `{ score: 4 }`), or with the JSON inside Markdown code fences. Three fixes, in order: simplify the system prompt (drop any JSON-formatting instructions), wrap the parser with an **Auto-Fixing Parser** (which retries on minor format errors), or switch to a model better at structured output (the larger frontier models from each provider are more reliable here).

**Simple Memory disappears on restart.** Symptom: customer support bot has no memory of last week's conversations. Cause: Simple Memory is per-process; n8n restarts wipe it. Fix: replace Simple Memory with Postgres Chat Memory or Redis Chat Memory before going to production.

## The takeaway

- **An agent is a chat model plus tools plus a decision loop, optionally with memory and structured output.** In n8n, this is a cluster — one root node with sub-nodes attached.
- **Modern n8n has one unified AI Agent node** (since v1.82.0). The old agent-type distinction is gone; if a tutorial tells you to pick *Tools Agent* vs *ReAct Agent*, the screenshots are stale.
- **Three layers to build any agent.** Layer 1 (model + tools) is the minimum. Layer 2 (add memory) gives conversational continuity. Layer 3 (output parser) makes the agent's response a structured JSON your workflow can branch on.
- **Three chat model providers cover 90% of work**: OpenAI, Anthropic, Google Gemini. One API key each. Start with the one you already have an account for.
- **`$fromAI()` lets the agent populate tool parameters at runtime.** Click the AI button next to a tool parameter; n8n inserts the expression for you. This turns the agent from "picks a tool" to "picks a tool *and* decides what to pass."
- **Production discipline carries over from Chapter 16.** Cap Max Iterations. Pick the right model for the job. For sensitive tools, gate with the Human-in-the-Loop tool review (same primitive as Chapter 14's Send and Wait for Response).

## Try it yourself

Build the lead-scoring agent end-to-end. This is what slots into the lead qualifier from earlier in the book.

1. **Manual Trigger.** Set its pinned data to one example lead:
   ```json
   [{
     "name": "Priya Krishnan",
     "company": "Sigma Logistics (210 employees)",
     "role": "Director of Operations",
     "last_message": "Hi - we're evaluating tools to replace our current dispatch software. Saw your demo last week. Could we set up a call this Thursday or Friday?",
     "last_activity_days_ago": 2
   }]
   ```
2. **AI Agent** node.
3. **Chat Model** sub-node — whichever provider you set up. For a scoring task, a small/cheap model is fine (`gpt-4o-mini`, Claude Haiku, Gemini Flash).
4. **Calculator** tool — the Agent requires at least one tool. The Calculator is the throwaway placeholder; the agent won't actually need it for this task.
5. **System Message** in the Agent node:
   ```
   You are a B2B sales lead scorer for a logistics software company.
   Given a lead's profile, score their intent to buy on a 1-5 scale:
   - 5 = ready to buy, asking for a meeting or quote
   - 4 = serious evaluation, decision-maker, recent activity
   - 3 = qualified but exploratory
   - 2 = downloaded content but no clear intent
   - 1 = no fit or not engaged
   Be honest. A score of 5 is rare.
   ```
6. **Prompt Source**: *Define below*. **Prompt (User Message)**: `Score this lead: {{ JSON.stringify($json) }}`.
7. Toggle **Require Specific Output Format** on. Attach a **Structured Output Parser**. Set Schema Type to *Generate from JSON Example* and paste:
   ```json
   {
     "score": 4,
     "confidence": "high",
     "reason": "active deal stage, technical decision-maker, recent meaningful engagement"
   }
   ```
8. Run the workflow.

**You'll know it worked when** the Agent node's output contains a clean JSON object with `score`, `confidence`, and `reason` fields, and the score reflects the input (Priya should land around 4 or 5 — she's a decision-maker, evaluating tools, and explicitly asking for a meeting). Try varying the input — change `last_activity_days_ago` to 90, drop the meeting request, swap the role to "Intern" — and watch the score move accordingly. That movement is your evidence that the agent is reading the data, not just returning a fixed answer.

You now have a piece of judgment automation wired into a workflow. The downstream Switch from Chapter 13 can route on `{{ $json.output.score }}` to send high-scoring leads down one path and low-scoring leads down another. Three minutes of human scoring per lead, replaced by sub-second LLM scoring at fractions of a cent.

## What's next

Chapter 19 was about the general-purpose AI Agent — flexible, powerful, suitable for almost any task. Chapter 20 is about n8n's **purpose-built AI nodes** — Text Classifier, Sentiment Analysis, Information Extractor — that handle the most common unstructured-text jobs (categorise this ticket, score the sentiment of this email, pull these fields out of this PDF) more directly than a full agent would. When the task is narrow and well-defined, these single-purpose nodes are faster to configure, cheaper per call, and harder to misuse. You'll learn when to reach for each vs. when the full Agent is still the right call.
