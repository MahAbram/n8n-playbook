---
title: Appendix A — Glossary | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: Plain-English definitions of every term the book uses, alphabetically organised, with pointers to the chapter that introduces each concept in depth.
meta-twitter:title: Learn Automation Working
---

# Appendix A — Glossary

Plain-English definitions of every term the book uses. Alphabetical. Each entry one or two sentences, with a chapter pointer to where the term is introduced and used in depth.

When a term has multiple meanings in different software contexts, the definition is the one n8n uses. Where n8n's usage differs from a wider industry convention (notably JMESPath argument order), the entry says so.

---

**Active workflow** — A workflow that is switched on and listening for its trigger. Inactive workflows can be edited and tested manually but won't fire on schedule or webhook. *See Chapter 10.*

**AI Agent** — An n8n cluster node that combines a Chat Model, optional Memory, and zero or more Tools to handle tasks that need reasoning rather than fixed transformation. *See Chapter 19, Chapter 21.*

**API key** — A static credential string used to authenticate against a service. Simpler than OAuth2 but less secure; rotate regularly and store only in n8n's credential store, never in workflow JSON. *See Chapter 8.*

**At-least-once delivery** — A guarantee that a workflow will fire at least once per event, possibly more than once if retries occur. Pair with idempotent downstream actions. *See Chapter 15.*

**At-most-once delivery** — A guarantee that a workflow will fire at most once per event, with no retries on failure. Webhooks are typically at-most-once; Schedule Triggers are best-effort with no catch-up. *See Chapter 15, Chapter 30.*

**Canvas** — The visual editor where workflows are built. The unit of attention; when a canvas grows past ~30 nodes, sub-workflows become worth considering. *See Chapter 1, Chapter 27.*

**Chat Model** — A cluster sub-node that wraps an LLM (OpenAI, Anthropic, Gemini, local via Ollama). Connects to an AI Agent or to a stand-alone LLM node. *See Chapter 19.*

**Cluster node** — A multi-component node where one root node (AI Agent, Question and Answer Chain) is configured by attached sub-nodes (Chat Model, Memory, Tools, Vector Store). *See Chapter 19, Chapter 21.*

**Code node** — A node for writing custom JavaScript or native Python when expressions and existing nodes aren't enough. Cannot make HTTP requests directly, cannot access the filesystem, cannot read environment variables in v2. *See Chapter 17, Chapter 31.*

**Concurrency** — How many executions a workflow (or instance) can run at the same time. Capped per Cloud plan; uncapped by default on self-hosted single mode. *See Chapter 30.*

**Continue on Fail / Continue using error output** — Per-node settings that let a workflow proceed when a node errors, with the error data routed to a separate error output. *See Chapter 15.*

**Credential** — Encrypted authentication for a third-party service, stored in n8n's database and decrypted at runtime using `N8N_ENCRYPTION_KEY`. Never visible in plain text after creation. *See Chapter 8, Chapter 28.*

**Cron expression** — A five-or-six-field string describing when a Schedule Trigger should fire. Validate at `crontab.guru` before saving; syntax errors silently skip executions. *See Chapter 10, Chapter 30.*

**Edit Fields (Set node)** — The node for shaping data: rename fields, add fields, drop fields, compute new values via expressions. The most-used data-shaping node in any working estate. *See Chapter 17.*

**Error Trigger** — A trigger node that fires when a *different* workflow fails. Used to build a single error-handling workflow that catches failures across an entire estate. *See Chapter 15.*

**Event-driven trigger** — A trigger that fires when something actually happens (new email, new HubSpot contact, webhook received). Cheaper per execution than polling because it doesn't fire on empty checks. *See Chapter 30.*

**Execute Sub-workflow** — The parent-side node that calls another workflow as a sub-workflow. *Wait for Sub-Workflow Completion* should stay on unless you specifically want fire-and-forget. *See Chapter 27.*

**Execute Sub-workflow Trigger** — The child-side node (also labelled *When Executed by Another Workflow*) that lets a workflow be called by another. Defines the input contract via *Define using fields below*. Replaces the old Start node, which is gone in v2. *See Chapter 27.*

**Execution** — One full run of a workflow, regardless of how many nodes or how much data. The unit n8n bills on (Cloud) and the unit your performance budget thinks in. *See Chapter 10, Chapter 30.*

**Execution data pruning** — Automatic deletion of old execution records. Enabled by default in modern n8n: 14 days or 10,000 executions, whichever hits first. *See Chapter 30.*

**Expression** — A dynamic value computed at runtime, wrapped in `{{ }}`. Supports `$json`, `$('Node Name')`, Luxon, JMESPath, and JavaScript syntax. *See Chapter 12.*

**Filter node** — A logic node that drops items not matching its criteria. Cleaner than an If node when you only want one branch. *See Chapter 13.*

**Form Trigger** — A trigger that exposes an n8n-hosted form. Used for human-input workflows and ad-hoc submissions. *See Chapter 10, Chapter 14.*

**Generic HTTP credential** — A credential for the HTTP Request node when the target service isn't one of n8n's named integrations. Supports Bearer Token, Header Auth, OAuth2, and API Key in header. *See Chapter 18, Appendix C.*

**`$getWorkflowStaticData()`** — A function in the Code node that persists small amounts of data across production executions of the same workflow. Two scopes: `'global'` and `'node'`. Can be flaky under high frequency; use a database table for mission-critical state. *See Chapter 31.*

**Human-in-the-loop (HITL)** — A workflow that pauses for human approval, review, or input before proceeding. Implemented via Send and Wait for Response, Form node, or Wait node + webhook resume. *See Chapter 14.*

**HTTP Request node** — The universal node for calling any HTTP API n8n doesn't have a dedicated node for. Supports all auth methods via Generic credentials. *See Chapter 18.*

**Idempotency** — The property that the same input produces the same outcome, even if the workflow runs multiple times. Critical for at-least-once delivery; use a unique-key check (Postgres upsert, Sheets find-or-create) to enforce. *See Chapter 10, Chapter 15.*

**If node** — A logic node that branches into two outputs (true / false) based on conditions. *See Chapter 13.*

**Information Extractor** — A purpose-built AI node that pulls structured fields from unstructured text (invoices, emails, documents) against a schema you define, returning clean JSON. The workhorse for document workflows; pair with Auto-Fixing and string-typed dates parsed downstream. *See Chapter 20.*

**Insert or Update (upsert)** — A Postgres node operation that inserts a row if no match exists for the Unique Column, or updates the existing row if one does. The right operation for "sync state without creating duplicates." *See Chapter 29.*

**Item** — The fundamental unit of data flowing between nodes — a JSON object wrapped as `{ "json": { ... } }`. Workflows process arrays of items. *See Chapter 1, Chapter 11.*

**Item linking** — The mechanism by which n8n preserves the identity of an item across multiple nodes, so a downstream Set or Filter can refer back to the originating item's data. *See Chapter 11.*

**JMESPath** — A query language for nested JSON. Available in expressions and the Code node via `$jmespath()`. n8n uses `search(object, searchString)` argument order — the *opposite* of the JMESPath spec's `search(searchString, object)`. *See Chapter 31.*

**`$json`** — The expression-syntax reference to the current item's JSON payload. The most-used expression token. *See Chapter 12.*

**Loop Over Items** — A node (formerly Split In Batches) that processes items in chunks, with each chunk passing through downstream nodes before the next chunk fires. Used for rate-limited APIs and batch processing. *See Chapter 11.*

**Luxon** — n8n's bundled date/time library, accessed in expressions as `DateTime.now()`, `$now`, `$today`. Replaces JavaScript's native Date for any non-trivial date math. *See Chapter 12.*

**Manual execution** — A workflow run started from the editor via the Execute Workflow button. Doesn't count toward Cloud's execution quota, doesn't trigger `$getWorkflowStaticData()` persistence. *See Chapter 30, Chapter 31.*

**MCP (Model Context Protocol)** — An open standard for connecting AI assistants to external tools. n8n supports both MCP Server Trigger (expose workflows as tools) and MCP Client Tool (call external MCP tools from an AI Agent). *See Chapter 31, Chapter 32.*

**Memory** — A cluster sub-node that gives an AI Agent persistent context across turns. Options range from in-memory buffer (single execution) to Postgres-backed (across executions and workflows). *See Chapter 21.*

**Merge node** — A logic node that combines two or more input streams. Modes include append, combine by field, and multiplex. *See Chapter 13.*

**Node** — A single step in a workflow. Comes in three shapes: trigger nodes, action nodes, and cluster nodes. *See Chapter 1.*

**OAuth2** — A token-based authentication flow where users grant scoped access to an application via a third-party login. The default for Gmail, Slack, Google Sheets, HubSpot, Salesforce, Xero, and most modern apps. *See Chapter 8, Appendix C.*

**Parameterised query** — A SQL query that uses `$1`, `$2` placeholders for values, with the actual values passed via a separate Query Parameters field. The only safe way to use user-sourced data in hand-written SQL. *See Chapter 29.*

**pgvector** — A Postgres extension for storing and querying vector embeddings. Used by n8n's Postgres Vector Store cluster sub-node. *See Chapter 21.*

**Pinned data** — Test data fixed to a node's output for repeatable manual runs. Survives until manually cleared; useful for downstream debugging without re-firing upstream nodes. *See Chapter 5, Chapter 7.*

**Polling** — A trigger pattern that repeatedly checks a source for changes on a schedule. Cheaper to build than webhooks but more expensive to run; the most common anti-pattern in working estates. *See Chapter 30.*

**Postgres Trigger** — A trigger node that fires when a row is inserted, updated, or deleted in a Postgres table, using LISTEN/NOTIFY. Requires CREATE TRIGGER privilege, which most managed providers restrict. *See Chapter 29.*

**Production execution** — An execution started by a real trigger (Schedule, Webhook, app event) rather than manually. Counts toward Cloud's quota; persists `$getWorkflowStaticData()`. *See Chapter 30, Chapter 31.*

**Push trigger** — A trigger that receives events as they happen (Webhook, native event triggers like HubSpot Trigger), rather than checking for them. Synonym for event-driven trigger. *See Chapter 30.*

**Queue mode** — A self-hosted scaling architecture where a main process handles UI and triggers while separate worker processes pull executions from a Redis-backed queue. *See Chapter 28, Chapter 30.*

**Retry On Fail** — A per-node setting that retries a failed node up to five times with configurable wait between attempts. The first error-handling layer; insufficient on its own for resilient workflows. *See Chapter 15.*

**Reversibility** — Whether a workflow's effect can be undone. A workflow that sends customer emails is irreversible; one that writes to a draft folder is reversible. Reversibility informs how much testing and gating a workflow needs. *See Chapter 7.*

**Row-Level Security (RLS)** — Postgres / Supabase policies that restrict which rows a query can see, based on the user role making the query. Bypassed entirely by Supabase's `service_role` key. *See Chapter 29.*

**Schedule Trigger** — A trigger that fires on a recurring schedule (every X minutes, daily at 9 AM, cron expression). The first trigger most readers reach for and the most overused. *See Chapter 10, Chapter 30.*

**Send and Wait for Response** — An n8n action that posts a message to Slack/Telegram/Email/Form and pauses the workflow until the recipient responds. The canonical human-in-the-loop pattern. *See Chapter 14.*

**Sentiment Analysis** — A purpose-built AI node that scores the emotional tone of text (positive / neutral / negative). Used for ticket triage and escalation routing. Set Chat Model temperature to 0 for consistent results. *See Chapter 20.*

**`service_role` (Supabase)** — Supabase's admin API key that bypasses Row-Level Security entirely. The default for the Supabase node credential, and a security trap if used in production for sensitive data. *See Chapter 29.*

**Set node** — *See Edit Fields.*

**Single mode** — n8n running as one process that handles UI, triggers, scheduling, and workflow execution. The default; sufficient up to roughly 200 executions/day before queue mode becomes worth it. *See Chapter 28, Chapter 30.*

**SSL mode** — A Postgres credential setting controlling whether the connection is encrypted. Managed databases require *Require* or *Verify-Full*; self-hosted local Postgres often wants *Disable*. *See Chapter 29.*

**Stop and Error node** — A node that throws an explicit error at the point it's placed, halting the execution and surfacing the error to the Executions log. Useful for asserting expected state. *See Chapter 15, Chapter 31.*

**Structured Output Parser** — A cluster sub-node attached to an AI Agent that constrains the agent's output to a defined schema (JSON Schema). Turns freeform LLM responses into reliable workflow data. *See Chapter 19.*

**Sub-workflow** — A workflow called by another workflow via Execute Sub-workflow. Used to extract canvas-overflowing logic for readability or to build reusable shared logic across multiple parents. *See Chapter 27.*

**Switch node** — A logic node that branches into N outputs based on values. Cleaner than chained If nodes when more than two branches are needed. *See Chapter 13.*

**Task runner** — A separate isolated process that runs Code-node JavaScript and Python in n8n v2. Enabled by default (`N8N_RUNNERS_ENABLED=true`); the architecture that mitigates Code-node sandbox escapes. *See Chapter 28, Chapter 31.*

**Text Classifier** — A purpose-built AI node that sorts each item into one of several categories you define, each with a description that acts as a brief. More direct and cheaper than a full AI Agent for narrow routing tasks. *See Chapter 20.*

**Tool / Tool node** — A capability exposed to an AI Agent (Workflow Tool, Code Tool, HTTP Request Tool, MCP Client Tool). The agent decides which tool to call based on the user's request. *See Chapter 21.*

**Trigger** — The node that starts an execution. Every workflow has exactly one active trigger. *See Chapter 10.*

**Two-owners rule** — The discipline that every production workflow has at least two people who understand it well enough to fix it. The single most-broken governance rule in working estates. *See Chapter 9, Chapter 32.*

**Vector store** — A storage system for vector embeddings, used for similarity search in RAG patterns. n8n supports Postgres (pgvector), Pinecone, Qdrant, Supabase, and in-memory. *See Chapter 21.*

**Wait for Sub-Workflow Completion** — An option on the Execute Sub-workflow node that pauses the parent until the child workflow finishes. Default on; should stay on unless you specifically want fire-and-forget. Fixed in v2 to correctly wait through child Wait nodes and HITL steps. *See Chapter 27.*

**Wait node** — A node that pauses a workflow for a fixed duration, until a specific time, or until a webhook callback resumes it. *See Chapter 14.*

**Webhook** — An HTTP endpoint hosted by n8n that fires a workflow on receipt of an HTTP request. The most flexible trigger; can receive from any system that can make an HTTP call. *See Chapter 10, Chapter 18.*

**Workflow** — A series of connected nodes that defines an automated process from trigger to final action. The unit of building and ownership. *See Chapter 1.*

**Worker** — A self-hosted n8n process running in queue mode that pulls executions from the Redis queue and runs them in parallel with other workers. Scaled horizontally by adding more workers. *See Chapter 28, Chapter 30.*
