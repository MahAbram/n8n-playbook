---
title: 18. How do you call any API n8n doesn't already integrate with? | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: HTTP Request and Respond to Webhook in n8n — the three authentication patterns, the Import cURL shortcut, pagination strategies, and the synchronicity trap that breaks half of all custom-webhook workflows.
meta-twitter:title: Learn Automation Working
---

# 18. How do you call any API n8n doesn't already integrate with?

Your lead qualifier from earlier in this part has been working with HubSpot and the AI Agent. Now you want to enrich each incoming lead with company data — employee count, industry, funding round — from a service called Clearbit. You open n8n, search the node panel for "Clearbit," and find nothing. Clearbit isn't in n8n's built-in app list.

For a moment it feels like you've hit a wall. You haven't. n8n has built-in nodes for the most-used 400 services; there are roughly 350 more out there that don't have a dedicated node but absolutely have an HTTP API. The **HTTP Request** node — one of the core nodes — calls any of them. This chapter is how.

The mental model is small. Every HTTP API call is the same five-part shape: a **method** (GET, POST, PUT, PATCH, DELETE), a **URL**, optional **headers**, optional **query parameters**, and an optional **body**. If you can read an API's documentation page and translate it into those five, you can call that API from n8n. The Import cURL shortcut covered later in this chapter compresses even that to one paste.

The chapter closes with the **Respond to Webhook** node — the action-side counterpart of the Webhook trigger from Chapter 10. When something else is calling *your* workflow and waiting on a reply (Stripe sending a payment event, Typeform submitting a form, a customer system POSTing to your endpoint), Respond to Webhook is what shapes the reply.

## The two credential paths

When you add an HTTP Request node and set its **Authentication** field, you see two top-level options: *Predefined Credential Type* and *Generic Credential Type*.

**Predefined Credential Type** is n8n's library of ~200 pre-configured services. Pick *Stripe API* or *Notion API* or *Anthropic API* from the dropdown, supply just the key or token, and n8n handles the rest — the right header name, the right format, the right token-refresh logic if applicable. The official guidance is to use Predefined whenever it's available. It's strictly simpler than Generic. If the service you want is in that list, you don't think about auth at all.

**Generic Credential Type** is for everything else. You tell n8n which auth pattern to use — Header, Bearer, OAuth2, etc. — and configure the specifics yourself, guided by the API's documentation. This sounds intimidating; in practice, almost every API uses one of three patterns.

## The three generic auth patterns you'll actually use

**Header Auth** — the most common pattern, covering both API keys and bearer tokens. The API documentation tells you to send a particular header on every request — `Authorization: Bearer sk_live_abc123`, or `X-API-Key: abc123`, or whatever variant the service prefers. In n8n, set Generic Auth Type to *Header Auth*, supply the header **Name** (e.g., `Authorization`) and **Value** (e.g., `Bearer sk_live_abc123`).

A quirk worth knowing from the canonical docs: n8n's *Bearer Auth* credential type is "actually just header authentication with the Name set to Authorization and the Value set to Bearer <token>." So if you see *Bearer Auth* as an option, you can use it — it's a one-field shortcut for the most common Header Auth variant. Same mechanism, less typing.

**OAuth2** — the heaviest setup, deepest integration. Used by Google, Microsoft, Salesforce, HubSpot, and most modern SaaS that needs scoped per-user access rather than a static API key. Five OAuth2 *grant types* exist; for n8n workflows you'll see two:

- **Authorization Code** — the user logs in via a popup, n8n stores the resulting token, and refreshes it automatically when it expires. Used when you're acting *as a user*. This is what most predefined OAuth credentials use behind the scenes.
- **Client Credentials** — your application authenticates as itself (no user popup), n8n exchanges a client ID/secret for an access token. Used for server-to-server integrations and most "API key but actually OAuth" setups.

Configuring OAuth2 generic requires the API's *Authorization URL*, *Access Token URL*, *Client ID*, *Client Secret*, and *Scopes* — every API's docs page tells you these. n8n provides a *Redirect URL* you paste into the API's app-registration screen so the auth callback comes back to your workspace.

**Query Auth** — credentials in the URL itself (`?api_key=abc123`). Most modern APIs have moved away from this because URLs are logged in places they shouldn't be, but some legacy and Google services still use it. Set Generic Auth Type to *Query Auth*, supply the parameter name and value, and n8n appends it to every request.

What you almost never use, despite being listed: Basic Auth (username/password — old SaaS and some internal systems), Digest Auth (legacy server-to-server), and OAuth1 (Twitter pre-2023, almost nothing now). If the API documentation explicitly demands one of these, you'll know. Otherwise, default to Header Auth or OAuth2.

## Import cURL — the shortcut you'll use daily

This is the feature that separates an afternoon of HTTP-Request configuration from twenty seconds of it.

Most API documentation pages — Stripe, Clearbit, GitHub, OpenAI, the Anthropic docs you might already have open — include a tab labelled *cURL* with a runnable command example. Something like:

```bash
curl -X POST https://api.example.com/v1/leads \
  -H "Authorization: Bearer sk_live_abc123" \
  -H "Content-Type: application/json" \
  -d '{"email": "ahmad@tan.com", "source": "form"}'
```

In the HTTP Request node, click **Import cURL** at the top. Paste that entire command. n8n parses the method, URL, headers, and body, and auto-fills the node's configuration. You change the hardcoded values to expressions (`{{ $json.email }}` instead of `ahmad@tan.com`), connect it to the trigger, and you have a working node.

This is by far the fastest path for non-developers. Read the API docs *just enough* to find the cURL example for the operation you need. Paste. Edit the dynamic fields. Done.

One caveat from the canonical bug tracker: Import cURL occasionally mishandles very complex request bodies (multi-line JSON with escaped quotes, multipart uploads with binary data). For the 95% case of "send these headers, send this JSON body" it works reliably. If a paste produces an obviously wrong configuration, fall back to manual setup.

## Pagination — how to get all the records, not just the first 100

Most APIs cap a single response at 50–500 records. When the answer to "give me all my contacts" is larger than that cap, the API returns the records *in pages*. Three pagination patterns exist; n8n's HTTP Request node handles all three through **Add Option → Pagination**.

| Pattern | What the API does | n8n config |
|---|---|---|
| **Offset / page number** | You send `?offset=100` or `?page=2`; the API returns the next chunk | Pagination Mode: *Update a Parameter in Each Request* |
| **Cursor** | API returns `next_cursor` or `next_url` in its response; you send that back to get the next page | Pagination Mode: *Response Contains Next URL* |
| **Header-based** | API returns a `Link` header with the next page's URL | Pagination Mode: *Response Contains Next URL*, with an expression extracting the URL from the header |

Cursor pagination is more reliable than offset/page-number when the underlying data is changing during the paging (someone adds a record while you're paging through; offset/page-number skips it or duplicates it; cursor doesn't). **When an API offers both, prefer cursor.**

The most important pagination setting is **Max Pages**. Always set this. A misconfigured pagination loop that doesn't know when to stop will fetch until n8n's memory or your API quota runs out — both expensive failure modes. Set Max Pages to a deliberately high number for your real needs (50, 100), and the safety ceiling prevents disasters.

Configuring pagination requires reading the API's docs to find out: what parameter name to use (`offset`, `page`, `cursor`, `starting_after`?), how to recognise the last page (empty response array? missing `next_cursor` field?), and what the page size limit is. Three to five minutes with the docs page; once configured, n8n loops through all the pages automatically.

## Respond to Webhook — the action-side of the Webhook trigger

The Webhook node from Chapter 10 receives an HTTP call and starts a workflow. By default, n8n sends back a basic 200 OK response *after the entire workflow finishes*. That works for fire-and-forget webhooks.

It doesn't work when the caller is waiting for a specific response — a Typeform integration that needs to confirm the submission with a custom message, a Stripe webhook that demands a 200 OK within seconds, a custom-built API integration where your client app expects a JSON object back.

**Respond to Webhook** is the node that controls the response explicitly. Three setup requirements:

1. **In the Webhook trigger**, set **Respond** to *Using 'Respond to Webhook' Node* (not the default *When Last Node Finishes*).
2. **Add a Respond to Webhook node** anywhere downstream in the workflow.
3. **Configure the response** — what to send back. The five options:
 - *All Incoming Items* — return all input items as a JSON array.
 - *First Incoming Item* — return just the first input item's JSON.
 - *JSON* — return a JSON object you define inline.
 - *Binary File* — return a file (PDF, image, anything binary).
 - *Text* — return a plain-text response.

The node also lets you set the **Response Code** (200, 201, 400, 404 — useful for telling the caller what kind of result this was), and **Response Headers** if the caller cares about content-type or custom headers.

### The synchronicity trap

This catches almost everyone the first time they build a synchronous webhook flow. The constraint is unyielding: **n8n can only respond while the original HTTP connection is still open.** If the workflow takes too long, errors out before reaching the response node, or sits in a Wait node, the caller times out and gets nothing.

Three concrete failure modes:

- **Long-running workflow.** Your webhook triggers a workflow that calls three APIs, processes the responses, and writes to a database. The whole thing takes 8 seconds. The caller (often a webhook provider like Stripe) times out after 3–5 seconds and treats the call as failed. Even though your workflow eventually succeeded, the caller retries — sometimes thousands of times — until you fix it.

- **Respond to Webhook after a Wait node.** Your workflow pauses for human approval before responding to the caller. The caller's HTTP connection times out long before the human clicks Approve. The Respond to Webhook node fires, but there's nothing on the other end of the connection to receive it.

- **Queue mode (self-hosted at scale).** When n8n's queue mode is enabled, webhook executions are pushed onto a queue and processed asynchronously. The HTTP connection gets an immediate 200 from the queue handler — and that's all the caller will ever see. Respond to Webhook never gets a live connection.

The fix is structural, not configurational: **acknowledge fast, process slow.** Put Respond to Webhook *early* in the flow, right after the trigger, with a fast acknowledgment payload. Then continue processing in the background. The caller gets its 200 in milliseconds; the long work happens after the response has already gone out.

The Stripe webhook pattern is canonical:

```
[Webhook trigger]
    → [Respond to Webhook: 200 OK, body: {"received": true}]
    → [process the event: update CRM, send Slack alert, write to DB, etc.]
```

Three nodes in, the connection is closed and Stripe stops retrying. Meanwhile your workflow keeps going.

## Two production traps

**Authentication credentials in logs.** When debugging, it's tempting to dump full request objects to a logging service. Most logging captures `Authorization` headers and request bodies wholesale. If those contain a Bearer token, you've now leaked credentials to whatever log aggregator you're using. n8n's credential system masks the actual token in the UI for this reason — but custom logging via Code or HTTP Request nodes doesn't get that protection. If you log requests for debugging, strip the auth header explicitly first.

**Respond to Webhook never reached.** Symptom: the caller reports timeouts; your executions log shows the workflow succeeding. Cause: the workflow takes too long, errors before the Respond node, or has a Wait between the trigger and the response. Fix: move Respond to Webhook to immediately after the trigger if you can, or restructure long-running logic into a sub-workflow (Chapter 27) that runs asynchronously.

## The takeaway

- **Every HTTP API call has the same five-part shape: method, URL, headers, query params, body.** Once you read API docs as those five fields, you can call any API.
- **Try Predefined Credential Type first; fall back to Generic.** n8n's predefined list covers 200+ services with zero auth configuration.
- **Three generic auth patterns cover almost everything:** Header Auth (most APIs), OAuth2 (per-user-scoped SaaS), Query Auth (legacy). Bearer is a one-field shortcut for the most common Header Auth variant.
- **Import cURL is the time-saver.** Paste the command from the API docs, get a configured node, swap hardcoded values for expressions.
- **For pagination, prefer cursor over offset when both are offered.** Always set Max Pages as a safety ceiling.
- **Respond to Webhook needs the trigger configured to *Using 'Respond to Webhook' Node*.** Mind the synchronicity trap: acknowledge fast, process slow. A Respond after a Wait, or in queue mode, never reaches the caller.

## Try it yourself

Build a small workflow that calls a real public API with no authentication, then build a second one with auth and pagination. Both use free, reliable test endpoints.

**Part 1 — A basic GET request.**

1. **Manual Trigger.**
2. **HTTP Request** node:
 - Method: `GET`
 - URL: `https://api.github.com/repos/n8n-io/n8n`
 - Authentication: *None*
3. Run the workflow. The node should return the n8n repo's metadata — stars, watchers, default branch, etc. — as a single JSON item.

If that worked, you've made your first n8n-driven API call. Read the response. Notice the nested structure: `{ "owner": { "login": "n8n-io", ... }, "stargazers_count": ..., ... }`. Expressions like `{{ $json.stargazers_count }}` work on this exactly the way Ch. 12 described.

**Part 2 — A paginated GET with header auth.**

1. **Manual Trigger.**
2. **HTTP Request** node:
 - Click **Import cURL** at the top. Paste:
 ```bash
 curl -X GET "https://api.github.com/users/n8n-io/repos?per_page=10" \
   -H "Accept: application/vnd.github+json"
 ```
 - Click Import. The node auto-configures.
 - Set Method to `GET` if it's not already. Confirm Headers contains the `Accept` entry.
 - Click **Add Option → Pagination**.
 - Pagination Mode: *Response Contains Next URL*.
 - Next URL: `{{ $response.headers.link?.match(/<([^>]+)>;\s*rel="next"/)?.[1] }}` — GitHub returns next-page URLs in the `Link` header.
 - Max Pages: `5`.
3. Run the workflow.

**You'll know it worked when** the node returns multiple repositories — between 30 and 50, depending on n8n-io's public repo count at the time you run it — across multiple pages, with no manual loop, no Wait node, and no Code. The HTTP Request node handled the pagination internally. Change Max Pages to `1` and re-run: you'll get exactly 10 results. Change it to `2` and you'll get 20. The cap behaves exactly as configured.

You now have everything you need to integrate with any HTTP API on the public internet.

## What's next

Part IV begins. The next three chapters move from the mechanics of n8n to its AI capabilities — the cluster of nodes that turn the platform from a workflow engine into something that genuinely reads, writes, and decides. Chapter 19 covers the **AI Agent node** and its surrounding nodes (chat models, memory, tools, output parsers), credential setup for OpenAI / Anthropic / Google Gemini, and how to build your first agent: a structured-data extractor that turns messy email subject lines into clean fields. This is where everything you've built in Part III starts producing genuinely intelligent behaviour, not just deterministic plumbing.
