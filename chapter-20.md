---
title: 20. When should you reach for a purpose-built AI node instead of the Agent? | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: The three purpose-built AI nodes in n8n — Text Classifier, Sentiment Analysis, Information Extractor — when they outperform the general AI Agent, and how to configure them.
meta-twitter:title: Learn Automation Working
---

# 20. When should you reach for a purpose-built AI node instead of the Agent?

The lead qualifier you built in Chapter 19 is one half of a pair. The other half handles inbound support: every email that lands at `support@yourcompany.my` needs to be sorted (is this a billing question, a technical issue, or a feature request?) and gauged for tone (is the customer calm, frustrated, or angry?) so the right team can respond fast — and so the angry ones get a manager's eyes first.

You *could* build this with the AI Agent node from Chapter 19. Add a Structured Output Parser, write a system prompt that asks for both a category and a sentiment, parse the JSON, branch downstream. It would work.

It would also be substantially more configuration than the job needs. Sorting items into predefined categories and scoring sentiment are two of the most common "small-AI" tasks in operational workflows, common enough that n8n ships **three purpose-built nodes** for them. They're cheaper to run per call, faster to configure (90 seconds, not 15 minutes), more predictable, and produce output your workflow can branch on directly — no parser required.

This chapter is about those three nodes — **Text Classifier**, **Sentiment Analysis**, and **Information Extractor** — and the line between "use one of these" and "climb back up to the full AI Agent."

## When narrow beats general

The AI Agent is general-purpose: it can call tools, hold memory, decide between approaches, run multi-step. That power costs something — every Agent invocation runs a tool-calling decision loop even if there are no tools to call, paying tokens for capability you're not using.

The three purpose-built nodes solve narrow problems. Each is a root node with one Chat Model sub-node attached. No tools, no memory, no decision loop. Input goes in, structured output comes out. One LLM call per item.

| You want to... | Use | Replaces |
|---|---|---|
| Route input to one of N predefined categories | **Text Classifier** | A Switch node where the routing decision is an LLM |
| Score input on a sentiment scale | **Sentiment Analysis** | A Text Classifier with sentiment-shaped categories, but with built-in confidence scoring |
| Pull structured fields out of unstructured text/PDF/HTML | **Information Extractor** | An AI Agent + Structured Output Parser combo |
| Anything requiring tools, multi-turn reasoning, or memory | **AI Agent** | (Use the Agent — it's what it's for.) |

The rule of thumb: **if the task is "convert messy input into a known shape," use a purpose-built node.** If the task is "decide what to do and then do it," use the Agent.

All three of these nodes share the same architectural pattern from Chapter 19: a root node with a Chat Model sub-node attached. Same model providers (OpenAI, Anthropic, Gemini, others). Same credentials. The cluster shape is identical; just simpler.

## Text Classifier — routing as an AI call

Use Text Classifier when you have a clear taxonomy and need to bucket each item into one (or more) of those buckets.

The setup, in n8n, has two main parameters:

- **Input Prompt** — an expression that references the text to classify. Often `{{ $json.text }}` or `{{ $json.body }}` for an email subject.
- **Categories** — a list of categories, each with a *name* and a *description*. The description is what the model uses to know what the category means.

Each category becomes its own output branch on the node — visually identical to a Switch (Chapter 13), but with an LLM picking the route. A "Billing" category routes its items down a "Billing" branch; a "Technical" category to a "Technical" branch; and so on. Connect each branch to its own downstream workflow.

Three settings matter:

- **Allow Multiple Classes To Be True.** Off by default — each item goes to exactly one category. Turn on if an item can legitimately belong to several (a customer email that's both *billing* and *angry* — though for tone you'd probably use Sentiment Analysis as a separate node).
- **When No Clear Match** — what to do if none of the categories fit. Two options: *Discard Item* (silently drop, dangerous in production), or *Use a Fallback Output* (routes the item to an extra "Other" branch you can wire to a manual-review queue). Direct parallel to the Switch node's Fallback Output from Chapter 13. **Always pick the fallback option in production**, never silently discard.
- **Enable Auto-Fixing** — when the model's output doesn't quite match the expected schema, retry with the error fed back to the model. Worth turning on for production runs against slightly noisy inputs.

The thing that breaks Text Classifier most often: **vague category names with thin descriptions.** A category called "Issue" with description "An issue" tells the model nothing. A category called "Issue" with description "The customer has reported something not working as expected — login problems, missing data, broken features" tells the model exactly what to look for. Treat the description as the spec, not the explanation. If a human couldn't reliably classify an item from your category descriptions alone, neither can the LLM.

## Sentiment Analysis — categorised judgment with confidence

Sentiment Analysis is, mechanically, a Text Classifier with a sentiment-shaped purpose: the model assigns the input to one of N sentiment categories you define.

Defaults are *Positive, Neutral, Negative* — appropriate for most uses. You can customise to anything: *Very Positive / Positive / Neutral / Negative / Very Angry* for granular feedback analysis, *Excited / Curious / Hesitant / Frustrated* for sales-pipeline tone tracking, *Calm / Tense / Critical* for support-ticket triage.

Each category produces its own output branch, exactly like Text Classifier. A *Positive* customer review flows out the *Positive* branch; *Negative* flows out *Negative*. The branches let you do different things downstream — *Negative* triggers an immediate Slack alert to a manager, *Positive* gets quoted in next month's marketing material, *Neutral* gets archived.

One option worth knowing:

- **Include Detailed Results.** When turned on, the output includes a strength score (how strongly the sentiment leans toward the chosen category) and a confidence score (how sure the model is). These are model-generated estimates, not measurements — useful as rough signals, not as precise numbers. Worth enabling when you want to triage edge cases (low confidence → human review).

### Why temperature matters here

Production sentiment classification fails most often not because the model is wrong but because it's *inconsistent* — the same review yields *Neutral* on Monday and *Positive* on Wednesday. The cause is the model's sampling temperature: with default settings, the model picks slightly different tokens each call, sometimes flipping categories on borderline inputs.

The fix is in the Chat Model sub-node: **set temperature to 0** (or near-zero). At zero temperature the model becomes deterministic — same input, same output, every time. For sentiment classification this is essential. For creative writing tasks it would be wrong. Match the temperature to the job: zero for classification and extraction, higher for generation.

## Information Extractor — unstructured to structured

This is the chapter's most powerful node and the one that absorbs most of the work the AI Agent would have done in Chapter 19.

The job: take messy input (a PDF invoice, a customer email, a scraped web page, a hand-typed form submission) and pull out specific fields in a known shape. Invoice number, total, due date, vendor name. Customer name, order ID, ticket category. Job title, company, years of experience, location.

The node takes two parameters:

- **Text** — an expression for the input to extract from. For a PDF, this is usually `{{ $json.text }}` from an upstream *Extract from PDF* node.
- **Schema** — what you want pulled out.

The schema can be defined three ways:

- **From Attribute Descriptions** — the non-developer's path. You list each attribute (name, description, optional *required* flag), and n8n builds the schema for you. Use this unless you have a strong reason not to. The descriptions matter — same rule as Text Classifier: write them as if for a human assistant.
- **Generate From JSON Example** — paste an example of the JSON shape you want. n8n infers the schema from the keys and value types. Every field is treated as required. Useful when you already know exactly what shape you want.
- **Define using JSON Schema** — write JSON Schema directly. Most powerful, least friendly. Reach for it only when you need validation features the simpler modes don't expose (enums, length constraints, nested structures).

The output is a single JSON object matching your schema. Downstream nodes can do `{{ $json.output.invoiceNumber }}` and `{{ $json.output.amount }}` directly — no parsing, no Code node, no guesswork.

This compresses what Chapter 19 did in three nodes (AI Agent + Chat Model + Structured Output Parser) into one node with the same Chat Model sub-node attached. If your task is purely "extract these fields from this input," reach for Information Extractor first. The Agent is for when the extraction needs to be informed by tool calls or follow-up reasoning.

## Three production traps

**Vague category descriptions on Text Classifier and Sentiment Analysis.** The single biggest accuracy gap. A two-word category name with no description gets two-word reasoning from the model. Write descriptions like you're writing the brief for a new junior team member: what is this category, what kinds of items belong in it, what's the edge case that *doesn't* belong even though it sounds like it should. Aim for one to three sentences per category description. This work is the highest-leverage tuning you can do on any of these three nodes.

**Default temperature for classification.** As above, default sampling temperature produces inconsistent classification. For all three nodes — Text Classifier, Sentiment Analysis, and Information Extractor — set the Chat Model sub-node's temperature to 0 or close to it. The setting lives on the model node (OpenAI, Anthropic, Gemini), not the purpose-built node itself. Inconsistent results from these nodes are usually a temperature problem, not a prompt problem.

**Long inputs + complex schemas = parsing failures in Information Extractor.** When the input is long (a 10-page PDF, a 5,000-word webpage) and the schema is non-trivial (nested objects, lots of fields), the model can return malformed JSON or truncate partway through. Three mitigations, in order: enable Auto-Fixing (retries on parse error), pre-summarise the input with a cheaper model or simple text extraction before passing it to the Information Extractor, or chunk the input and run the Information Extractor per chunk with downstream merge. The Loop Over Items pattern from Chapter 16 handles chunking cleanly.

## When to climb back up to the AI Agent

These three nodes are the right answer for one-shot, no-tools, narrow tasks. The moment any of these is true, climb back to the AI Agent:

- **The task needs to look up information from another system to do its job.** A classifier that needs to check the customer's account status before deciding "billing dispute" vs "billing question" needs a tool, which means an Agent.
- **The output needs to chain — one classification step affects the next.** A multi-step workflow where the model first decides what kind of input this is, then takes different actions based on that decision, is the Agent's job.
- **You need conversational memory.** A support chatbot that remembers what was said earlier in the thread is the Agent's job (with a memory sub-node, Chapter 19).
- **The schema isn't fixed.** If the fields to extract depend on the input ("for invoices, pull amount and due date; for receipts, pull merchant and category"), the Agent's flexibility wins over Information Extractor's static schema.

For everything else — classify, score sentiment, extract known fields — the purpose-built nodes are faster to configure, cheaper to run, more predictable in production, and easier to debug.

## The takeaway

- **Three purpose-built AI nodes cover the most common "small AI" tasks.** Text Classifier (route to N buckets), Sentiment Analysis (score on a sentiment scale), Information Extractor (pull structured fields from unstructured input).
- **Each is the same cluster shape as the Agent**, just simpler: root node + Chat Model sub-node, no tools or memory required.
- **Text Classifier and Sentiment Analysis each produce one output branch per category** — like a Switch node, but with the model picking the branch. Always enable a fallback output for unmatched items.
- **Category descriptions are the single biggest lever on classification accuracy.** Write them like a brief for a new team member. Vague names + thin descriptions = unreliable model.
- **Set temperature to 0 on the Chat Model sub-node for all three nodes.** Classification and extraction want determinism, not creativity.
- **Information Extractor replaces the Agent + Structured Output Parser combo** for one-shot extraction. Use *From Attribute Descriptions* schema mode unless you have a specific reason to write JSON Schema.
- **Reach back for the AI Agent** when the task needs tools, memory, multi-step reasoning, or a dynamic schema.

## Try it yourself

Build a ticket triage workflow that uses both Text Classifier and Sentiment Analysis on the same input — the two-stage triage pattern from the cold open.

1. **Manual Trigger.** Pin sample data with three example support emails:
   ```json
   [
     { "subject": "Card declined again", "body": "Tried to renew yesterday and got declined three times. This is the third time this month. Fix it or I'm cancelling." },
     { "subject": "Feature request: bulk export", "body": "Hi team, would love to be able to bulk export our records to CSV. Currently doing it one at a time, which is fine but a bit slow. No rush." },
     { "subject": "Can't log in", "body": "Password reset email isn't coming through. Tried twice. Need urgent access to pull a report for my Monday meeting." }
   ]
   ```
2. **Text Classifier** node. Connect a Chat Model sub-node (any provider; set temperature to 0). Define three categories with proper descriptions:
   - **Billing** — "Customer is reporting an issue with payments, charges, refunds, subscriptions, invoices, or account renewal. Includes failed payments, disputed charges, and questions about billing periods."
   - **Technical** — "Customer is reporting that something doesn't work — login failures, broken features, errors, missing data, integrations not connecting. Anything where the product is malfunctioning for them."
   - **Feature Request** — "Customer is asking for a new capability, enhancement, or change to how the product works. Not currently broken; they want something added."
   - Set **When No Clear Match** to *Use a Fallback Output*.
3. **Sentiment Analysis** node. Connect the same Chat Model sub-node (or a separate instance, temperature 0). Use default categories (Positive, Neutral, Negative) and turn on **Include Detailed Results**.
4. Connect each Text Classifier output branch to a Set node that labels it with the category name. Connect each Sentiment Analysis output branch to a Set node that labels it with the sentiment.
5. Run the workflow.

**You'll know it worked when** each of the three emails takes a sensible classification path *and* a sensible sentiment path. The card-declined email should land on Billing + Negative. The feature request should land on Feature Request + Neutral or Positive. The login failure should land on Technical + Negative (or possibly Neutral if the model reads it as merely urgent rather than frustrated — both are defensible). Try re-running with the same input — the classifications should be identical, because you set temperature to 0. If they vary between runs, your temperature isn't actually 0.

This pattern — classifier for routing, sentiment analyser for prioritisation — is the canonical SME support triage workflow. With two nodes and four minutes of setup, you have a system that does in milliseconds what currently takes a human three minutes per email.

## What's next

Chapter 21 introduces the last major Part IV capability: **vector stores and retrieval-augmented agents**. When your agent needs to answer questions grounded in your own documents — a customer-support bot that knows your knowledge base, an internal assistant that knows your team's wiki, a researcher that knows last quarter's reports — the missing piece is letting the LLM look things up from a source of truth. You'll learn how to load documents into Pinecone, Supabase pgvector, or Postgres pgvector, and how to build a Q&A chain or retrieval-augmented agent that grounds every answer in your data. The chapter is also honest about when this is overkill — most SMEs don't need a vector database; they need better folder structure.
