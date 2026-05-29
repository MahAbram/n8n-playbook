---
title: 29. Connecting to a database and writing real records | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: When and how to talk directly to Postgres or Supabase from an n8n workflow — bypassing CRM rate limits, building internal tools, treating n8n as orchestration over your real systems of record. Covers the Postgres node operations, credentials and SSL, the Supabase service_role trap, parameterised queries vs SQL injection, and the read-only-by-default safety patterns.
meta-twitter:title: Learn Automation Working
---

# 29. Connecting to a database and writing real records

You've been bumping the HubSpot API rate limit for a week. The workflow that backfills lead enrichment hits 100 requests per 10 seconds and chokes; you split it into batches; the batches push your daily quota; you negotiate a higher tier and discover it costs RM 1,800 a month for capacity you'll use for twenty minutes a day. Meanwhile your data lives in HubSpot whether or not the CRM is the right tool to read 50,000 rows from at once.

The moment you realise *the CRM is a UI over a database, and the database wants to be queried directly* is the moment this chapter starts mattering. Not for everything — most workflows are fine going through the app's API. But for the volume-heavy, join-heavy, or dashboard-shaped work, hitting the database directly turns a rate-limited 30-minute job into a 30-second query.

This chapter is the graduation step: you stop treating n8n as a glue between apps and start treating it as the orchestration layer over your real systems of record.

## When you actually want to talk to a database directly

Three concrete triggers, one anti-trigger.

**CRM or app rate limits have become the constraint.** HubSpot caps free-tier reads around 100 requests per 10 seconds. Salesforce's daily API limit is surprisingly easy to hit on bulk operations. When a workflow you'd otherwise finish in two minutes takes thirty because you're rate-limited, and the next pricing tier doesn't justify the spend, you've outgrown the app's API. The Postgres instance the app sits on will serve 1,000 of the same query in the time the API gives you 10.

**Internal dashboards and reports.** When marketing wants a weekly digest of deal-stage transitions and finance wants a monthly reconciliation, you're querying 10,000+ rows per report. Doing that through the app's API means paginating, retrying, and waiting. SQL `SELECT` with a `GROUP BY` returns the answer in milliseconds.

**Multi-table joins the app's API doesn't expose well.** *Customers who placed an order in the last 30 days but haven't logged in this week, grouped by account-tier* is a single SQL query and an awkward multi-call exercise through most CRM APIs. Joins are what SQL was invented for.

The anti-trigger: **don't go direct when the app's API does what you need and your volume is modest.** App APIs come with conveniences — webhooks on real events, built-in change-tracking, business-logic enforcement the database itself doesn't know about. A Postgres trigger doesn't know that updating `lifecycle_stage` is supposed to enqueue a welcome email; HubSpot's automation engine does. Reach for direct database access on volume, joins, or rate-limit pressure — not on principle.

## Postgres node anatomy

The Postgres node has five operations. Each is a different way of saying *here's a SQL statement* — the question is how much of the SQL you write yourself.

**Execute Query** is the unrestricted one. You write the SQL, the node runs it. `SELECT`, `INSERT`, `UPDATE`, `DELETE`, anything. Most powerful, reach for last — the other four are safer because they constrain what's possible. Use Execute Query when you need a join, a window function, or anything beyond row-by-row CRUD.

**Insert** and **Update** are the row-level CRUD operations. You pick a table, the node generates the SQL. The critical setting is **Mapping Column Mode**:

- *Map Automatically* — incoming JSON field names must match column names in Postgres. If your upstream emits `{ "customer_email": "x@y.com" }` and your table has a `customer_email` column, the node figures it out. Add a Set node ([Chapter 17](./chapter-17.md)) upstream to rename fields if they don't already match.
- *Map Each Column Manually* — you select each column from a dropdown and drag in the value. Slower, more explicit, harder to break when upstream data shape changes.

Map Automatically is faster when your JSON shape is stable; Map Manually is right when upstream data is messy or you want the workflow to fail loudly if the input shape drifts.

**Insert or Update** is the upsert. Same Mapping Column Mode options, plus a *Unique Column* field where you nominate the column that determines uniqueness (a primary key or unique-indexed column like `email`). On run: if a row with this unique value exists, update it; if not, insert it. The right operation for "sync state from an external source into our database without creating duplicates."

**Delete** removes rows, filtered or whole-table. Use with restraint; see the safety patterns section below.

Three options worth knowing about:

- **Output Large-Format Numbers As: Text.** Postgres `BIGINT` and `NUMERIC` columns can hold values larger than JavaScript represents precisely (above roughly 16 digits). The default *Numbers* setting silently corrupts these — IDs like `1729384756102938472` round to nonsense. If your IDs are big integers, flip this to *Text*.
- **Replace Empty Strings with NULL.** Useful when your upstream is a Google Sheet or CSV where empty cells came through as `""` rather than `null`.
- **Query Batching: Transaction.** On Execute Query, wraps all incoming items in one transaction — failures roll back the whole thing. The right choice for destructive operations.

The full reference is at [docs.n8n.io](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/); the options above are the ones that actually matter in day-one workflows.

## A short warning about SQL injection

This is the chapter where you start hand-writing SQL. It is also the chapter where it becomes possible to write a workflow that's wide open to SQL injection — a class of bug where untrusted input becomes part of the SQL command itself, not just a value within it.

The trap looks like this. You have a Form Trigger collecting an email and you want to look up the customer record. You drop a Postgres node in Execute Query mode and write:

```sql
-- DANGEROUS, do not do this
SELECT * FROM customers WHERE email = '{{ $json.email }}'
```

This *works* — n8n substitutes the expression and the query runs. It also fails catastrophically the day someone submits `' OR '1'='1` — the query becomes `WHERE email = '' OR '1'='1'` and returns every customer in your database. Or worse: `'; DROP TABLE customers; --`. Direct string interpolation into SQL is how production databases get destroyed.

The Postgres node has a parameterised-query mode for exactly this. Use `$1`, `$2`, `$3` as placeholders in the SQL, and pass values through the **Query Parameters** field as a comma-separated list:

```sql
-- SAFE: the value goes through Query Parameters
SELECT * FROM customers WHERE email = $1
```

In **Query Parameters** below the query field: `{{ $json.email }}`. The driver handles quoting and escaping; injection becomes structurally impossible because the value can never be parsed as SQL.

The rule: **any value that originated from user input — form submissions, webhook payloads, email subject lines, AI-generated content — must go through Query Parameters, never through expression interpolation inside the SQL string.** Hard-coded values (table names, fixed filter clauses) can stay inline. The Insert / Update / Upsert / Delete operations parameterise automatically; the trap is specifically in hand-written Execute Query SQL.

## Credentials and SSL — the part where everyone gets stuck

Postgres credentials in n8n take Host, Database, User, Password, Port, an SSL mode, and an optional SSH Tunnel. The fields look obvious until they don't connect; failures cluster around three things.

**SSL mode.** Managed databases (Supabase, AWS RDS, DigitalOcean Managed Databases, GCP Cloud SQL) require SSL — set *SSL* to **Require** or **Verify-Full**. Self-hosted Postgres on the same Docker network usually doesn't support SSL — set it to **Disable** or **Allow**. Picking the wrong mode produces opaque errors (`server does not support SSL connections` from a managed instance, `connection terminated unexpectedly` from a self-hosted one). The full [SSL mode reference](https://docs.n8n.io/integrations/builtin/credentials/postgres/) covers all five settings; *Require* fits most managed-database cases.

**Hostname inside Docker.** If your n8n container and Postgres container live in the same Docker Compose stack, the *host* is the Postgres service name (`postgres`), not `localhost` and not the host machine's IP. The single most common self-host trip-up.

**IP allowlists on managed providers.** DigitalOcean Managed Databases, AWS RDS, and similar refuse connections from any IP not on their trusted-sources list. Symptom: credential test fails with an uninformative timeout. Fix: find n8n's outbound IP (Cloud instance's egress IP, your VPS's public IP) and add it to the database's allowlist. For GCP Cloud SQL, the [Cloud SQL Auth Proxy](https://cloud.google.com/sql/docs/postgres/sql-proxy) as a sidecar container sidesteps the allowlist entirely.

A debugging habit worth forming: test credentials by running a one-line workflow with a Postgres node set to Execute Query `SELECT 1`. If that returns `{ "?column?": 1 }`, the credential works. The credential-test button in the UI tests authentication but doesn't catch every SSL or networking issue; a real query is the only honest test.

## Supabase: two ways to connect, one trap

Supabase is Postgres with a managed REST API, auth, real-time, and storage on top. There are two ways to connect an n8n workflow to a Supabase database, and they behave very differently.

**Way 1: the Supabase node.** Uses Supabase's PostgREST API — REST endpoints over HTTPS, authenticated with an API key. The [Supabase credential](https://docs.n8n.io/integrations/builtin/credentials/supabase/) asks for your project URL and a **Service Role Secret** (the `service_role` key from Project Settings → API). Easy to set up. Operations on the node — Get, Get Many, Create, Update, Delete — map cleanly to common CRUD patterns.

The trap: **`service_role` bypasses Row-Level Security entirely.** Any RLS policies on your tables — the ones ensuring a customer can only see their own orders, that staff can only see records in their region — are ignored when n8n connects with `service_role`. This is by design (PostgREST distinguishes "anon" from "service role" for exactly this reason), but it means a Supabase node workflow has admin-level access to every table, every row. For development this is fine. For production handling sensitive data, create a dedicated PostgREST role with scoped grants and use *that* role's key, not `service_role`.

**Way 2: the Postgres node, pointed at Supabase's Postgres connection string.** Supabase exposes the underlying Postgres directly; you get the connection details from Project Settings → Database. Treat it like any managed Postgres: SSL required, host is the connection-pooler URL, user/password from the dashboard. This path is what you want for direct SQL, joins, parameterised queries, and for integrations that require it — Postgres Chat Memory and the pgvector vector store from [Chapter 21](./chapter-21.md) both need the Postgres node, not the Supabase node.

Which to use: **Supabase node for simple CRUD and convenience; Postgres node for joins, transactions, vector stores, and anywhere you'd rather write SQL than learn PostgREST's filter syntax.** Many production workflows use both — Supabase node for routine writes, Postgres node for the dashboard query that joins five tables.

One more RLS gotcha: Supabase enables RLS by default on tables created via the Table Editor. If you connect with the *anon* key instead of `service_role`, queries return empty until you write policies. People debug this for hours because the table clearly has data. The [Supabase common issues page](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.supabase/common-issues/) names this explicitly.

## Safety patterns: read-only by default, scoped writes, WHERE-clause review

n8n gives you the same access to your database that a developer with a `psql` shell has. That power doesn't come with seatbelts. Four habits make it less likely you'll be the one who drops a table at 2 PM.

**Two credentials per database, minimum.** A *read-only* credential connected as a Postgres user with `SELECT` grants only, used for every analytics / dashboard / reporting workflow. A *write* credential connected as a user with `INSERT/UPDATE/DELETE` grants on specific tables, used for the few workflows that actually mutate state. The read-only credential is a structural guarantee that a runaway analytics workflow can't damage data:

```sql
CREATE USER n8n_readonly WITH PASSWORD '...';
GRANT CONNECT ON DATABASE your_db TO n8n_readonly;
GRANT USAGE ON SCHEMA public TO n8n_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO n8n_readonly;

CREATE USER n8n_writer WITH PASSWORD '...';
GRANT CONNECT ON DATABASE your_db TO n8n_writer;
GRANT INSERT, UPDATE, DELETE ON specific_table TO n8n_writer;
```

**The WHERE-clause review.** Never run an UPDATE or DELETE without a WHERE clause, and never deploy a destructive workflow without a second person reading the SQL. The "I'll just run this once" UPDATE missing its WHERE clause is the classic database disaster. When you do need to run a destructive query, set the Execute Query node's **Query Batching** mode to *Transaction* — failures roll the whole thing back rather than leaving the database half-modified.

**Schema-drift defence.** Schemas change. A column gets renamed; a table moves; a workflow that ran for six months suddenly fails because somebody added a NOT NULL constraint. Add a cheap validation step at the start of mutation workflows — a Postgres Execute Query node running `SELECT 1 FROM target_table LIMIT 1` confirms the table exists in the shape you expect before you start mutating. If validation fails, the workflow stops cleanly with a useful error instead of corrupting half the rows.

**The Postgres Trigger node, briefly.** n8n has a [Postgres Trigger](https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.postgrestrigger/) that fires workflows on INSERT/UPDATE/DELETE events using Postgres's LISTEN/NOTIFY mechanism. The right answer when you want a workflow to run *exactly when a row changes* rather than polling on a schedule. The catch: the credential user needs CREATE TRIGGER privilege, which most managed providers restrict to the database owner. If you control the database, the Postgres Trigger is great. If you're on a managed instance with restricted privileges, polling with a Schedule Trigger and a `WHERE updated_at > NOW() - INTERVAL '5 minutes'` query is the practical workaround.

## Try it yourself: parameterised read + safe upsert against Supabase

You'll build two workflows against a free-tier Supabase project — one that reads safely with parameterised queries, one that upserts with Map Automatically. About 25 minutes.

You'll need a Supabase account (`supabase.com`, free tier is fine) and an n8n instance.

1. **Create the Supabase project.** In the Supabase dashboard, create a new project. From Project Settings → Database, copy the connection details (host, database name, user, password, port).
2. **Create a test table** via the SQL Editor in Supabase:
   ```sql
   CREATE TABLE customers (
     id BIGSERIAL PRIMARY KEY,
     email TEXT UNIQUE NOT NULL,
     name TEXT,
     lifetime_value NUMERIC,
     updated_at TIMESTAMP DEFAULT NOW()
   );
   INSERT INTO customers (email, name, lifetime_value)
     VALUES ('a@example.com', 'Alice', 1200), ('b@example.com', 'Bob', 800);
   ```
3. **Add a Postgres credential in n8n.** Host, Database, User, Password from step 1; SSL = *Require*. Test the credential.
4. **Workflow 1 — parameterised read.** Manual Trigger → Set node (set `email` to `a@example.com`) → Postgres node in Execute Query mode. Query: `SELECT * FROM customers WHERE email = $1`. Query Parameters: `{{ $json.email }}`. Execute. You should see Alice's row.
5. **Workflow 2 — safe upsert.** Manual Trigger → Set node (output `{ "email": "c@example.com", "name": "Carol", "lifetime_value": 2000 }`) → Postgres node in Insert or Update mode. Schema: `public`. Table: `customers`. Mapping Column Mode: *Map Automatically*. Unique Column: `email`. Execute twice — first run inserts Carol, second run updates her (change `lifetime_value` to 2500 between runs).

**You'll know it worked when** the read workflow returns exactly Alice's row using `$1` (not string interpolation), the first upsert run inserts a new row, and the second run with a changed `lifetime_value` updates the existing row rather than creating a duplicate.

Once you've shipped this against real data, switch the read workflow's credential to a `n8n_readonly` Postgres user, leave the upsert workflow's credential as a scoped-write user, and never let the two collide.

## The takeaway

- **Reach for direct database access on volume, joins, or rate-limit pressure** — not on principle. App APIs come with conveniences (real webhooks, business-logic enforcement) that going direct loses.
- **The Postgres node has five operations.** Execute Query (unrestricted SQL), Insert, Update, Insert or Update (upsert with a Unique Column), Delete. Most workflows want one of the four constrained operations; reach for Execute Query last.
- **Use parameterised queries (`$1`, `$2`) for any user-sourced value.** Direct expression interpolation inside SQL strings is the SQL injection trap. Hard-coded structural elements can stay inline; values that originated as input must go through Query Parameters.
- **SSL mode is the most common credential trip-up.** Managed databases want *Require* or *Verify-Full*; self-hosted local Postgres often wants *Disable*. Test with a one-line `SELECT 1` workflow, not just the credential-test button.
- **Supabase has two connection paths.** The Supabase node (PostgREST, `service_role` bypasses RLS) is easy but blunt. The Postgres node pointed at Supabase's connection string is what you want for joins, transactions, and vector stores.
- **Two credentials per database, minimum.** Read-only for analytics, scoped writes for the workflows that mutate. Never UPDATE or DELETE without a WHERE clause; wrap mutations in transactions.
- **The Postgres Trigger node is great when you have CREATE TRIGGER privilege.** Most managed providers don't grant it; schedule-trigger polling with `WHERE updated_at > NOW() - INTERVAL '5 minutes'` is the practical fallback.

## What's next

Chapter 30 is the performance chapter. How n8n thinks about concurrent execution, how to model cost from 10 executions a day to 10,000, when n8n Cloud's concurrency limits start to bite, and when self-hosting with queue mode (Chapter 28) starts paying back the operational investment. Now that you can talk to a database directly, the scale question gets sharper — querying Postgres 10,000 times an hour is a different ops problem from querying HubSpot 10 times.
