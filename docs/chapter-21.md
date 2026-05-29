---
title: 21. How do you ground AI answers in your own documents? | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: Vector stores and retrieval-augmented agents in n8n — embeddings, chunking, Pinecone/Supabase/PGVector, the Q&A chain pattern, and the agent-with-Vector-Store-Tool pattern.
meta-twitter:title: Learn Automation Working
---

# 21. How do you ground AI answers in your own documents?

The support classifier from Chapter 20 is doing its job — billing emails go to the billing queue, technical to technical, feature requests to product. But the billing team is still spending most of their morning *answering* the emails, not categorising them. And a lot of what they answer is the same question repeated by different customers: *"What's the difference between annual and monthly billing for the Pro plan?"*

The answer lives in your *Pricing & Billing Guide* PDF. Twelve pages, last updated three months ago, sitting in a Drive folder somewhere. A junior staff member reads it, finds the relevant paragraph, writes the reply. Three minutes per email, sixty billing emails a day.

The Chapter 19 AI Agent could draft these replies — but only if it can *read the guide*. A general LLM doesn't know your pricing structure. It would guess. And guessing about prices to a customer who's about to renew is exactly the failure mode you don't want.

What you need is a way to let the agent **look things up** from your own documents before answering. That's what this chapter is about — vector stores, embeddings, and the **retrieval-augmented** pattern that grounds an AI's answer in source-of-truth content. By the end of the chapter you'll have a working answer-drafting system that cites your own PDFs.

## The honest question first: do you actually need this?

Vector stores are the most-hyped piece of the AI stack. They're also the most over-applied. Before you build one, ask honestly:

- **How many documents are involved?** A team with 50 internal docs in a Drive folder doesn't need a vector store. They need better folder structure and a search box. The point where vector retrieval starts paying off is roughly 200+ documents, or where the relevant passage is buried inside long files that human search can't reach.
- **How often will the system be queried?** Five queries a week from one person doesn't justify the setup. The pattern earns its complexity when many people ask many questions across many documents.
- **Do the documents actually contain the answer?** A vector store doesn't manufacture knowledge — it surfaces what's there. If the answer to your customers' billing question genuinely isn't in any document, no amount of retrieval helps. Write the answer down somewhere first.
- **Is the simpler version available?** For 80% of SME use cases, "give the AI Agent a *Google Drive Search* tool and let it look things up" works without any vector store at all. The agent searches Drive, opens the matching file, reads the answer.

Build the vector-store version when document volume is large, retrieval has to be precise across long files, and the simpler tools (search-based agent tools) aren't returning the right passages.

When those conditions are met — and for a billing-knowledge-base across years of accumulated PDFs and policy docs, they often are — the pattern in this chapter is the right answer.

## What an embedding is, in 60 seconds

An **embedding** is a number — actually a list of 1,536 numbers, in OpenAI's standard model — that represents a piece of text. Similar text produces similar number-lists. "Annual billing" and "yearly subscription" produce two number-lists that are mathematically close together. "Annual billing" and "the Tokyo office cafeteria" produce number-lists that are far apart.

A **vector store** is a database that's good at one specific job: given a query embedding, find the stored embeddings closest to it. That's it. No keyword matching, no manual tagging, no SQL queries. Just *find the saved things that are most similar to this thing*.

The retrieval-augmented pattern uses this to ground AI answers. Each chunk of your source documents gets embedded and stored. When a question comes in, the question itself gets embedded, the vector store finds the closest matching chunks, and those chunks get passed to the LLM along with the question — *"answer this question, using these excerpts."* The LLM answers grounded in your actual content, not its general knowledge.

## The ingest pipeline

Building a working vector store has two phases: getting your documents *in* (ingest) and querying them *out* (retrieval). The ingest pipeline is the same shape in every n8n RAG workflow:

```
File source → Document Loader → Text Splitter → Embeddings → Vector Store (Insert)
```

Five nodes. Each does one thing.

- **File source** — wherever the documents live. Google Drive trigger (fires when a new file lands), Notion polling trigger, a manual run that fetches everything once, an HTTP Request that downloads a public URL.
- **Default Data Loader** — converts the raw file into text. Handles PDFs, Word docs, plain text, and HTML automatically. Connect the file binary from the source node.
- **Recursive Character Text Splitter** — breaks the document into chunks. Set *Chunk Size* to 800 characters, *Chunk Overlap* to 100. These are the canonical defaults that work for most prose. Smaller chunks (300–500) are better when the source has very specific tightly-scoped paragraphs; larger (1500+) when the source has long-form reasoning that needs continuity to be useful.
- **Embeddings OpenAI** — turns each chunk into the 1,536-number embedding. Default model `text-embedding-3-small`; switch to `text-embedding-3-large` for higher quality at higher cost. Each provider has its own embeddings sub-node — Embeddings Cohere, Embeddings Gemini, Embeddings Hugging Face, Embeddings Ollama for self-hosted. You don't need a frontier model for embeddings; the cheap ones work well.
- **Vector Store (Insert mode)** — writes the chunk and its embedding into the database. We'll cover the three vector store options in the next section.

This pipeline runs once per document. For an "always-fresh" knowledge base, wire it to a Google Drive trigger so every uploaded or updated file flows through automatically. For a one-time setup, run it manually against the full Drive folder, then turn the workflow off.

### Chunking, the highest-leverage lever

Chunk size and overlap are the most consequential settings in the whole pipeline. Get them wrong and no amount of model upgrading helps.

**Too small** (chunks of 100–200 chars): each chunk loses the context that gives it meaning. The model retrieves "Pro plan: $49/month" without knowing what "Pro plan" refers to. Answers become incoherent.

**Too large** (3,000+ chars): each chunk dilutes the relevance signal. A query about "annual billing" matches a chunk that contains the billing paragraph *and* three paragraphs about other subjects. The retrieval is technically correct but the model has to wade through irrelevance.

**The 800/100 default** (800 chars per chunk, 100 chars overlap) keeps each chunk roughly one paragraph long, with enough overlap that ideas spanning paragraph boundaries don't get cleaved cleanly in half. Tune up or down only after you've tried the default and seen it fail on real queries.

## The three vector stores worth knowing

n8n ships sub-nodes for Pinecone, Supabase, PGVector (Postgres), Qdrant, Weaviate, Milvus, MongoDB Atlas, and a *Simple Vector Store* that lives in n8n's own memory (lost on restart — fine for prototypes, never for production).

Three are worth knowing for SME use.

**Pinecone** — fully hosted, easiest to start, paid from day one (free tier exists but is limited). Set up an index in the Pinecone dashboard, paste the API key into n8n, point the node at the index. No database to manage. Choose this when you don't want to think about infrastructure.

**Supabase** — hosted Postgres with pgvector built in. Generous free tier (500MB, enough for a few thousand pages). Bonus: the same database holds your application data, so retrieval and operational queries live together. Hybrid search (combining vector similarity with full-text keyword matching) is available natively via PostgreSQL's `tsvector`. Choose this when the free tier covers your scale or your team already uses Postgres.

**PGVector (self-hosted Postgres)** — the same pgvector extension on your own database. Maximum control, zero managed cost, ops burden on you. Choose this when data residency requires self-hosting (PDPA, GDPR).

For new builds, **start with Supabase**. The free tier accommodates most SME use, and the same database is reusable for adjacent purposes. Move to Pinecone if Supabase runs out of room, or to self-hosted PGVector if compliance demands it.

## Two retrieval patterns

Once documents are ingested, querying them has two canonical shapes in n8n. They produce similar answers but have different operational profiles.

### Pattern A — Question and Answer Chain

Deterministic retrieval. Every query goes through the same path: embed the question, retrieve the top-N chunks, pass them to an LLM to draft an answer.

```
Chat Trigger / Webhook
    → Question and Answer Chain
        ├── Chat Model (LLM that drafts the answer)
        └── Vector Store Retriever
            └── Vector Store (Retrieve as Vector Store for Chain mode)
```

The *Question and Answer Chain* is a root node with two sub-node attachments: a Chat Model (which writes the answer) and a Retriever (which fetches the chunks). The Vector Store Retriever sits between the chain and the vector store, configurable for how many chunks to fetch (default 4, raise to 8–10 for more thorough answers at higher cost).

Use this pattern when the workflow is a Q&A pipeline — every question gets the same retrieval treatment, no decision-making about whether to retrieve. It's the right shape for FAQ bots, document Q&A interfaces, and "ask the wiki" tools. Predictable cost, predictable behaviour.

### Pattern B — AI Agent with Vector Store Tool

Agent-driven retrieval. The agent decides whether to look something up, and what to look up, based on the query.

```
Chat Trigger
    → AI Agent
        ├── Chat Model
        ├── Memory (Simple Memory, Postgres Chat Memory, etc.)
        └── Vector Store Question Answer Tool
            ├── Chat Model (for summarising retrieved chunks)
            └── Vector Store
```

The agent uses the vector store as one of its tools (Chapter 19's `$fromAI()` pattern). When the user's question seems to need lookup, the agent calls the *Vector Store Question Answer Tool*; when the question is conversational ("hi", "thanks") or already in the conversation memory, it doesn't. This is more flexible than Pattern A and substantially more useful for chatbots: small talk is cheap, lookups happen only when needed.

Use this pattern when the workflow is conversational, when not every turn needs retrieval, or when you want to combine retrieval with other tools (a support bot that can both look up the knowledge base *and* check the customer's account status). It's the canonical shape for support chatbots and internal AI assistants.

A useful intermediate shape: the agent has *multiple* Vector Store Question Answer Tools, one per document collection — *"Pricing Guide"*, *"Engineering Docs"*, *"HR Policies"*. The agent picks the right knowledge base for the question, then retrieves within it. Each tool gets its own descriptive name and description so the agent knows which to reach for.

## Three production traps

**Chunking that's wrong for the source.** Setting *Chunk Size 800* works for prose. It works badly for code (where 800 chars cuts mid-function), for tables (where 800 chars splits a row), and for Q&A-style documents (where each Q&A pair should be its own chunk regardless of length). When retrieval feels off and the model is wrong about specifics, look at the chunks first. The Vector Store node has a *Get Many* mode you can use to inspect what's actually stored — read a few chunks, ask whether they make sense as standalone passages. If they don't, the chunking is wrong, not the model.

**Stale ingest.** The Pricing Guide PDF gets updated. The vector store still has the old embedding. Queries now retrieve outdated answers — answers that confidently cite the old prices. Two fixes: re-ingest from scratch periodically (acceptable for low-volume corpora; just delete the old vectors and re-run the ingest), or build the ingest workflow to track updates by file ID and metadata, deleting old chunks for that file before inserting new ones. The Notion-trigger pattern from the canonical templates does this elegantly.

**Hallucinations even with retrieval.** Retrieval-augmented doesn't mean hallucination-free. If the retrieved chunks don't contain the answer, the LLM will still produce *some* answer — sometimes plausibly worded enough to look correct. Three mitigations: tell the system prompt explicitly to refuse if the chunks don't contain the answer (*"If the retrieved content doesn't answer the question, say 'I don't have that information' and stop"*), include source citations in the answer (asking the model to quote or cite the chunk that supports each claim makes silent fabrication harder), and inspect a sample of production answers weekly. RAG narrows the hallucination surface; it doesn't eliminate it.

## The takeaway

- **Vector stores are over-applied.** Before building one, check whether a Google Drive search tool on an AI Agent solves your problem. Most SMEs don't need a vector database.
- **Embeddings turn text into numbers; vector stores find similar numbers.** Retrieval-augmented patterns use this to ground AI answers in your own documents.
- **The ingest pipeline is always the same shape:** file source → Data Loader → Text Splitter → Embeddings → Vector Store (Insert). Five nodes, runs once per document.
- **Chunking is the highest-leverage setting.** 800/100 (chunk size 800 chars, overlap 100) is the canonical default for prose. Re-tune only after you've seen the default fail on real queries.
- **For new SME builds, start with Supabase pgvector.** Free tier covers most use; Pinecone for scale; self-hosted PGVector for compliance.
- **Two retrieval patterns:** Q&A Chain (deterministic, every query retrieves) for FAQ pipelines, AI Agent with Vector Store Tool (agent decides) for chatbots and assistants.
- **RAG narrows hallucination, doesn't eliminate it.** Instruct the model to refuse when chunks don't contain the answer, request citations, sample-audit production output weekly.

## Try it yourself

Build the billing-knowledge Q&A pipeline from the cold open. You'll need: one PDF (any product or policy document you own), a Supabase account (free tier), an OpenAI API key for embeddings + answering. About 20 minutes.

**Part 1 — Ingest the PDF.**

1. **Manual Trigger.** (Switch to Google Drive Trigger later if you want auto-ingest.)
2. **HTTP Request** node, or **Google Drive** node, to fetch the PDF. (For testing: paste the PDF URL into HTTP Request, set Response Format to *File*.)
3. **Default Data Loader** node. Attach to the PDF binary from step 2. Type: *PDF*.
4. **Recursive Character Text Splitter** sub-node, attached to the Loader. Chunk Size: 800. Chunk Overlap: 100.
5. **Embeddings OpenAI** sub-node, attached to the Vector Store. Model: `text-embedding-3-small`.
6. **Supabase Vector Store** node, operation: *Insert Documents*. Attach the Embeddings and the Loader's text output. Set Table Name to `documents` (create the table in Supabase first using the canonical schema from their pgvector docs).
7. Run the workflow once. Check Supabase — you should see N rows in the `documents` table, each with a chunk and an embedding column.

**Part 2 — Q&A on the ingested PDF.**

1. **Chat Trigger** — gives you a chat window for testing.
2. **Question and Answer Chain** node.
3. Attach a **Chat Model** sub-node (OpenAI Chat Model, model `gpt-4o-mini`, temperature 0).
4. Attach a **Vector Store Retriever** sub-node.
5. Attach the **Supabase Vector Store** node to the Retriever, this time in *Retrieve Documents (As Vector Store for Chain)* mode. Limit: 4.
6. In the Q&A Chain's system prompt: *"Answer the user's question using only the information in the retrieved context. If the context doesn't contain the answer, say 'I don't have that information in the provided documents.' Quote specific passages when relevant."*
7. Open the chat window. Ask a question whose answer is genuinely in the PDF.

**You'll know it worked when** the chat reply is specific and accurate to the PDF's content — not a generic plausible-sounding answer, but one with the actual numbers, names, or rules from the document. Then ask a question whose answer is *not* in the PDF and confirm the system says it doesn't have the information (it should, given the system prompt). The two tests together — accurate retrieval *and* honest refusal — are what production RAG looks like.

## What's next

Part IV ends here. The next part pivots from mechanics to deployment: role-specific workflow patterns that turn everything you've built into shippable systems. Chapter 22 opens Part V with **business development** — surveying four canonical BD patterns (lead qualification scoring, inbound enrichment, stalled-pipeline follow-up, and meeting-prep briefing), with the Lead Qualification Engine built end-to-end as the hands-on walkthrough. It pulls together the AI Agent from Chapter 19, the Switch from Chapter 13, the human approval from Chapter 14, the credentials from Chapter 8, and the error workflow from Chapter 15. That's where you stop learning n8n and start using it.
