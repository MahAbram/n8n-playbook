---
title: Appendix C — Credentials cheat sheet | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: A one-page reference for connecting the 20 most-common apps the book references — where to find the API key or OAuth flow, what scopes to grant, and the gotchas that catch first-time integrators.
meta-twitter:title: Learn Automation Working
---

# Appendix C — Credentials cheat sheet

The shortest path to most n8n frustrations is a misconfigured credential. The error message says "401 Unauthorized" or "invalid_grant" and you spend forty minutes searching for the right answer. This appendix is the answer. Twenty apps, the same template each time, the gotchas named upfront.

A few cross-cutting principles before the entries:

**Two credentials per service, minimum, when the service supports it.** A read-only credential for analytics and reporting workflows; a scoped-write credential for the few workflows that mutate state. The discipline from [Chapter 8](./chapter-08.md) and [Chapter 29](./chapter-29.md) — don't let one super-user credential handle every workflow's needs. The five minutes saved at setup is paid back tenfold the first time something goes wrong.

**Never paste an API key into a workflow node directly.** Always use n8n's credential store — credentials are encrypted with `N8N_ENCRYPTION_KEY` ([Chapter 28](./chapter-28.md)) and never appear in workflow JSON exports. A credential typed into a Set node or HTTP Request URL is one accidental sharing away from being compromised.

**Rotate on a schedule.** Quarterly for production credentials, immediately when someone leaves the team. Most apps make rotation a 30-second operation; treat it as recurring hygiene, not an emergency response.

**When OAuth2 fails with `invalid_grant`, re-authenticate.** This is the most common OAuth2 error and it almost always means the refresh token has expired or been revoked. Delete the credential, recreate, re-grant. Don't debug the symptom; just re-auth.

The twenty entries are grouped by category: communication, CRM, productivity, project management, finance, AI, database, and generic HTTP.

---

## Communication

### Gmail

**Auth type.** OAuth2.
**Where to get the credential.** Google Cloud Console → APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application. Add `https://your-n8n-instance/rest/oauth2-credential/callback` as the authorised redirect URI.
**Required scopes.** Minimum: `https://www.googleapis.com/auth/gmail.modify`. For read-only: `https://www.googleapis.com/auth/gmail.readonly`. For full send-and-modify: `https://mail.google.com/`.
**n8n credential type.** Gmail OAuth2 API.
**Common gotchas.**
- The OAuth consent screen must be *published* (Google Cloud Console → OAuth consent screen → Publish App), not in Testing mode. Testing mode allows only 100 users and tokens expire weekly. This is the single most common Gmail credential break.
- Workspace accounts may need admin approval for the OAuth app before users can grant consent.
- The same OAuth credential works for Gmail, Google Sheets, Google Drive, and Google Calendar if you grant all the necessary scopes during the consent flow.

---

### Slack

**Auth type.** OAuth2 (recommended) or Webhook URL (incoming webhooks only).
**Where to get the credential.** OAuth2: api.slack.com → Your Apps → Create New App → From scratch. Webhook URL: same flow, then enable Incoming Webhooks and copy the channel-specific URL.
**Required scopes (Bot Token).**
- `chat:write` for posting messages
- `channels:read`, `groups:read` for listing channels
- `users:read` for resolving user IDs
- `files:write` for file uploads
- Add `chat:write.public` if your bot needs to post to channels it hasn't been invited to.
**n8n credential type.** Slack OAuth2 API for full bot functionality; Slack Webhook for fire-and-forget incoming-only.
**Common gotchas.**
- Bot tokens (`xoxb-...`) are not the same as user tokens (`xoxp-...`). Bot tokens are what you want 95% of the time.
- The bot must be *invited to the channel* (`/invite @your-bot-name`) before it can post there, unless you have `chat:write.public`.
- Incoming Webhook URLs are channel-specific and silently fail if the channel is renamed or archived. Use OAuth2 if you need to post to channels dynamically.

---

### Telegram

**Auth type.** Bot Token.
**Where to get the credential.** Talk to `@BotFather` on Telegram → `/newbot` → choose a name → BotFather returns your token (looks like `1234567890:ABCdefGhIJKlmNoPQRstuVWxyZ`).
**Required scopes.** Telegram doesn't use scopes; the bot token has full access to messages sent to it.
**n8n credential type.** Telegram API.
**Common gotchas.**
- Bots cannot initiate conversations with users. The user must message the bot first (or be added to a group containing the bot) before the bot can send them a message.
- Chat IDs are not phone numbers or usernames. Send your bot any message, then call `https://api.telegram.org/bot<TOKEN>/getUpdates` to find your numeric chat ID.
- Group chat IDs are negative numbers (`-1001234567890`); user chat IDs are positive.

---

## CRM

### HubSpot

**Auth type.** OAuth2 (recommended for shared instances) or Private App Access Token (recommended for SME self-use).
**Where to get the credential.** Private App: HubSpot → Settings → Integrations → Private Apps → Create a private app → grant scopes → copy the access token. OAuth2: HubSpot Developer Account → Apps → Create app → OAuth setup.
**Required scopes.** Minimum for read-only: `crm.objects.contacts.read`, `crm.objects.deals.read`. For full CRM operations: `crm.objects.contacts.write`, `crm.objects.deals.write`, `crm.schemas.contacts.read` (for custom field definitions).
**n8n credential type.** HubSpot App Token (for Private App) or HubSpot OAuth2 API.
**Common gotchas.**
- Free-tier HubSpot caps API reads at roughly 100 requests per 10 seconds. The [Chapter 30](./chapter-30.md) anti-pattern (polling every minute) hits this fast; use HubSpot Triggers for event-driven work.
- Custom property internal names differ from display names. *"Account Tier"* might internally be `account_tier_2024_v3`. Always use the internal name in n8n.
- Sandbox accounts and production accounts need separate Private App tokens; do not share between environments.

---

### Pipedrive

**Auth type.** API Token (Pipedrive does not offer OAuth2 to most users).
**Where to get the credential.** Pipedrive → Settings → Personal Preferences → API → copy your personal API token.
**Required scopes.** Pipedrive's API token has full account access; there's no scoping at the token level. Scope by creating a *separate user* with limited permissions, then use that user's token.
**n8n credential type.** Pipedrive API.
**Common gotchas.**
- The API token is bound to the user, not the company. If the user is deleted or deactivated, every workflow using their token breaks immediately.
- Pipedrive's stage names are reused across pipelines but stage IDs are pipeline-specific. Filter by stage ID, not stage name, if you have multiple pipelines.
- Custom field keys are 40-character hashes (`abc123def456...`), not human-readable. Pull the field definitions once to map them, then store the mapping in a Set node at workflow start.

---

### Salesforce

**Auth type.** OAuth2.
**Where to get the credential.** Salesforce → Setup → App Manager → New Connected App → enable OAuth Settings → add callback URL `https://your-n8n-instance/rest/oauth2-credential/callback` → select scopes → save → wait 5–10 minutes for propagation before testing.
**Required scopes.** `api` for basic CRUD; `refresh_token, offline_access` to keep the token alive past one hour.
**n8n credential type.** Salesforce OAuth2 API.
**Common gotchas.**
- Sandbox orgs use a different login URL (`test.salesforce.com`) than production (`login.salesforce.com`). The Connected App must be configured separately in each org.
- Salesforce's API daily limit varies by edition. Enterprise/Unlimited is generous; Professional Edition has tight limits that bulk operations hit fast.
- IP restrictions on the Connected App (under Manage → Edit Policies → IP Relaxation) can silently break credentials when n8n's outbound IP changes. Set to "Relax IP restrictions" unless you have specific IP-allowlist requirements.

---

## Productivity

### Google Sheets

**Auth type.** OAuth2 (shares the same credential as Gmail if you grant the scopes together).
**Where to get the credential.** Same as Gmail — Google Cloud Console → OAuth2 credential. Grant `https://www.googleapis.com/auth/spreadsheets` for read-write or `.../spreadsheets.readonly` for read-only.
**Required scopes.** `https://www.googleapis.com/auth/spreadsheets` (read-write), `https://www.googleapis.com/auth/drive.file` (to create new sheets), `https://www.googleapis.com/auth/drive` (to see/manage all sheets).
**n8n credential type.** Google Sheets OAuth2 API.
**Common gotchas.**
- A Sheet ID is the long string in the URL between `/d/` and `/edit`, not the sheet's filename. Filename matches break when someone renames the file.
- Tab names are case-sensitive. *"Sheet1"* and *"sheet1"* are different tabs.
- The `Append Row` operation respects the sheet's existing column order; the `Update Row` operation requires you to know the row number, which usually means looking it up first via a search query.

---

### Notion

**Auth type.** Integration Token.
**Where to get the credential.** Notion → Settings & Members → Integrations → Develop your own integrations → New integration → name it, select workspace, choose Internal → copy the Internal Integration Token.
**Required scopes.** Granted per-integration: Read content, Update content, Insert content. Plus the integration must be explicitly *added to each page or database* it should access (Share → Add connection).
**n8n credential type.** Notion API.
**Common gotchas.**
- The token alone isn't enough — you must share each database or page with the integration via Notion's Share button. A workflow that worked yesterday will fail the moment the database's sharing settings change.
- Database property names in Notion's UI are not the same as property IDs in the API. Use n8n's property dropdown rather than typing names; it pulls the actual IDs.
- Page IDs are 32-character hex strings with optional hyphens. Both formats work; pick one and be consistent.

---

### Airtable

**Auth type.** Personal Access Token (Airtable deprecated the older API key format in early 2024).
**Where to get the credential.** Airtable → Account → Developer hub → Personal access tokens → Create token → name it, grant scopes, select bases.
**Required scopes.** `data.records:read`, `data.records:write`, `schema.bases:read` (for table/field lookups).
**n8n credential type.** Airtable Personal Access Token.
**Common gotchas.**
- Tokens are scoped to specific bases at creation time. To add a new base, edit the token's permissions or create a new one — there's no "all bases" wildcard.
- Field IDs vs field names: n8n defaults to using field names, which break if anyone renames a field in the Airtable UI. For mission-critical workflows, use field IDs (visible in the Airtable API documentation for each base).
- Airtable's API rate limit is 5 requests/second per base. Hitting it returns a 429; build with [Chapter 11](./chapter-11.md)'s Loop Over Items pattern if processing large batches.

---

### Typeform

**Auth type.** Personal Access Token.
**Where to get the credential.** Typeform → Account → Personal tokens → Create new token → grant scopes.
**Required scopes.** `forms:read` (list and read forms), `responses:read` (read submissions), `webhooks:write` (create webhooks for triggering n8n).
**n8n credential type.** Typeform API.
**Common gotchas.**
- The Typeform Trigger node creates a webhook on the form at activation. If you delete the n8n workflow without deactivating it first, the webhook stays on the Typeform side and silently fails. Always deactivate before deleting.
- Typeform's question IDs are short hashes (`abc12345`), not the question text. Field references in your workflow need the IDs, which you'll need to map once when you first build against a form.
- Hidden fields submitted via URL parameters are accessible in the webhook payload; use them to pass context (campaign source, user ID) through the form without exposing it to respondents.

---

## Project management

### Linear

**Auth type.** Personal API Key.
**Where to get the credential.** Linear → Settings (cmd-K, "settings") → API → Personal API keys → Create key.
**Required scopes.** Linear's API keys have full account access by default; no per-key scoping. For limited access, use OAuth2 (Linear → Settings → API → OAuth applications) and grant specific scopes.
**n8n credential type.** Linear API.
**Common gotchas.**
- Linear uses GraphQL, not REST. The n8n Linear node abstracts this, but if you fall back to the HTTP Request node for unsupported operations, you'll need to write GraphQL queries directly against `https://api.linear.app/graphql`.
- Team IDs and project IDs are UUIDs, not human-readable. Query them once at workflow start and pin them in a Set node.
- Webhook signatures are not verified by the n8n Linear Trigger node by default; if you need signature verification (recommended for production), pull the secret from the webhook configuration and verify in a Code node.

---

### Asana

**Auth type.** Personal Access Token (recommended for SME use) or OAuth2 (for shared/enterprise instances).
**Where to get the credential.** Asana → Profile → My Settings → Apps → Developer Apps → Personal Access Tokens → Create new token.
**Required scopes.** Personal Access Tokens have full access to the resources the user can access; no per-token scoping. Scope by creating a dedicated automation user with limited workspace access.
**n8n credential type.** Asana API or Asana OAuth2 API.
**Common gotchas.**
- Asana's workspace, project, section, and task hierarchy means most operations require multiple IDs at once. Pull them in a single batch at workflow start rather than per-item.
- Custom fields are workspace-scoped. A custom field that exists in workspace A doesn't exist in workspace B, even if both workspaces use the same custom-field name.
- The Personal Access Token is tied to the user. If the user leaves the team and their Asana account is deactivated, every workflow using their token breaks. Use a dedicated service account.

---

## Finance

### Stripe

**Auth type.** Restricted API Key (recommended) or Secret Key (only for unrestricted access).
**Where to get the credential.** Stripe → Developers → API keys → Create restricted key → grant per-resource permissions (read-only on customers, write on subscriptions, etc.). For workflows that need full access, use the Secret Key — but consider whether you actually need it.
**Required permissions.** Minimum for typical use: `Read` on Customers, Subscriptions, Invoices, Payment Intents. `Write` only on what the specific workflow actually creates or modifies.
**n8n credential type.** Stripe API.
**Common gotchas.**
- Test mode and Live mode have separate API keys. The dashboard toggle changes which key is shown; the keys themselves don't share state. Always confirm which mode the credential is in before activating workflows that move real money.
- Stripe's webhook signature verification is the only way to confirm an incoming webhook is actually from Stripe. The n8n Stripe Trigger handles this if you configure the signing secret; webhooks built manually via the HTTP webhook trigger do not.
- Restricted keys can't be modified after creation — only created or revoked. Plan the permission set carefully or expect to recreate the key as needs evolve.

---

### Xero

**Auth type.** OAuth2.
**Where to get the credential.** Xero Developer Portal → My Apps → New App → fill in details → add callback URL `https://your-n8n-instance/rest/oauth2-credential/callback` → save → grab Client ID and Client Secret.
**Required scopes.** `accounting.transactions` (read-write transactions), `accounting.contacts` (read-write contacts), `accounting.settings` (read chart of accounts), `offline_access` (refresh-token persistence).
**n8n credential type.** Xero OAuth2 API.
**Common gotchas.**
- Xero is multi-tenant; one OAuth credential can access multiple Xero organisations (tenants). Most n8n nodes require you to specify which tenant ID to use — pull it once from the connections list and pin it in a Set node.
- Xero's OAuth tokens expire every 30 minutes and need refresh; the `offline_access` scope is mandatory for n8n to refresh automatically. Forgetting it means the credential breaks after the first 30 minutes.
- Demo Company orgs reset weekly. Don't develop against Demo Company expecting your test data to persist.

---

## AI

### OpenAI

**Auth type.** API Key.
**Where to get the credential.** OpenAI Platform → API Keys → Create new secret key → name it, select project (if using project-based billing), copy the key. The key is shown once — copy it immediately.
**Required scopes.** API keys grant access to all OpenAI APIs by default. For project-based scoping (Plus and above), create keys at the project level rather than the user level.
**n8n credential type.** OpenAI API.
**Common gotchas.**
- The Organisation ID is optional in the n8n credential but required if your account belongs to multiple organisations and you want to bill a specific one. Find it under Settings → Organization → Organization ID.
- Rate limits scale with usage tier (Tier 1 → 5). New accounts start at Tier 1 with tight limits; the [Chapter 22](./chapter-22.md) AI workflows can hit them on first activation if you're processing a backlog. Plan for it.
- API keys have no per-model scoping; a key that can call GPT-5 can also call DALL-E and the embeddings API. Track usage by project, not by key.

---

### Anthropic

**Auth type.** API Key.
**Where to get the credential.** console.anthropic.com → API Keys → Create Key → copy the key. Shown once; copy immediately.
**Required scopes.** Anthropic API keys have full access; scope by workspace (Workspaces → Create Workspace) and assigning keys to specific workspaces.
**n8n credential type.** Anthropic API.
**Common gotchas.**
- Model access depends on your tier. Sonnet and Haiku are available immediately; Opus and the largest models often require usage history or explicit access requests. Workflows that name a specific model in the system prompt may fail silently if the key doesn't have access.
- Anthropic's API rate limits are per-model — Sonnet limits don't constrain Haiku usage. If you're cost-tiering (cheap-fast-model for routing, expensive-smart-model for the final answer per [Chapter 23](./chapter-23.md)), you have two separate quotas to monitor.
- The `anthropic-version` header changes occasionally. The n8n credential handles this; manual HTTP Request calls to the Anthropic API need it set explicitly.

---

## Database

### Postgres

**Auth type.** Host + Database + User + Password + SSL mode + optional SSH Tunnel.
**Where to get the credential.** From your database admin — connection string components. Managed providers (Supabase, RDS, DigitalOcean) provide all five fields in their dashboard.
**Required permissions.** Application of the [Chapter 29](./chapter-29.md) two-credentials-per-database rule:
- *Read-only credential*: `GRANT SELECT ON ALL TABLES IN SCHEMA public TO n8n_readonly;`
- *Scoped-write credential*: `GRANT INSERT, UPDATE, DELETE ON specific_table TO n8n_writer;`
**n8n credential type.** Postgres.
**Common gotchas.**
- SSL mode mismatch is the most common failure. Managed databases require `Require` or `Verify-Full`; self-hosted local Postgres on the same Docker network usually needs `Disable`.
- Hostname inside Docker is the service name (`postgres`), not `localhost`. `localhost` inside the n8n container refers to the n8n container itself.
- IP allowlist refusals from managed providers produce uninformative timeout errors. Find n8n's outbound IP and add it to the database's trusted sources list.
- Test new credentials with a one-line `SELECT 1` Execute Query workflow before building anything else against them. The credential-test button verifies auth but doesn't catch every networking or SSL issue.

---

### Supabase

**Auth type.** Two paths — see [Chapter 29](./chapter-29.md) for the full discussion.
**Where to get the credential.**
- *Path 1 (Supabase node)*: Supabase Project → Settings → API → copy the Project URL and the `service_role` Secret.
- *Path 2 (Postgres node pointing at Supabase)*: Supabase Project → Settings → Database → copy the connection details (host, database, user, password). Use the *Connection pooler* settings for production workflows.
**Required permissions.**
- *Supabase node with `service_role`*: full admin access, bypasses Row-Level Security. Use a scoped PostgREST role for production sensitive-data workflows, not `service_role`.
- *Postgres node*: standard Postgres grants per the rule above.
**n8n credential type.** Supabase API (Path 1) or Postgres (Path 2).
**Common gotchas.**
- `service_role` bypasses RLS *entirely*. Any policy you've written on a table is invisible to the Supabase node when authenticated with this key. For development this is fine; for production handling regulated data it's a security trap.
- Supabase enables RLS by default on tables created via the Table Editor. If you connect with the *anon* key, queries return empty until you write policies — debug "table has data but query returns nothing" by checking RLS first.
- The Postgres node is required (not the Supabase node) for pgvector vector stores and Postgres Chat Memory from [Chapter 21](./chapter-21.md).

---

## Generic HTTP

### Webhook (n8n-hosted)

**Auth type.** No credential needed for the receiving side; authentication is per-request via headers or query parameters that the workflow validates.
**Where to get the URL.** Drag a Webhook node onto a canvas → the node generates two URLs (Test URL for editor execution, Production URL for active-workflow execution).
**Required scopes.** N/A.
**n8n credential type.** None for the incoming webhook itself. To validate incoming requests, use [Chapter 18](./chapter-18.md)'s signature-verification pattern in a Code node.
**Common gotchas.**
- The Test URL only fires when the workflow is open in the editor and "Execute Workflow" has been clicked. Production URLs require the workflow to be active. Switching between them is the most common cause of "my webhook works in test but not in prod" issues.
- Webhook URLs are predictable (`/webhook/<some-id>`). Anyone who knows the URL can fire your workflow. Authenticate every webhook that does anything meaningful — either via Header Auth (a shared secret in a header) or HMAC signature verification.
- Behind a reverse proxy, ensure `WEBHOOK_URL` is set ([Chapter 28](./chapter-28.md)) or the URLs displayed in the editor will be wrong.

---

### HTTP Request — generic credential (Bearer, OAuth2, API key in header)

**Auth type.** Multiple — covered case-by-case below.
**Where to get the credential.** Per-service; this entry is about which n8n credential type to use when the target service isn't one of n8n's named integrations.
**Required scopes.** Per-service.
**n8n credential type.**
- *Bearer Token*: `Header Auth` credential, header name `Authorization`, header value `Bearer <your-token>`. Or use n8n's dedicated `Generic Credential Type → Bearer Auth`.
- *OAuth2 (custom provider)*: `Generic Credential Type → OAuth2 API`. Configure auth URL, token URL, client ID, client secret, scopes. n8n handles the refresh flow.
- *API key in header*: `Header Auth` credential, header name (often `X-API-Key` or `api-key`), header value the key itself.
- *API key in query parameter*: `Query Auth` credential, parameter name and value.
- *Basic Auth*: `Basic Auth` credential, username + password.

**Common gotchas.**
- The custom OAuth2 type is where most third-party integrations live — anything from a vendor SDK to a partner's internal API. The hardest part is the *token URL* — many providers document the OAuth flow without naming the exact token endpoint, and you'll need to dig into their developer docs.
- API keys in headers vs query parameters: read the API docs carefully. Some services accept both; some only accept one. Sending an API key in the wrong location returns an authentication error that looks identical to a wrong key.
- For services that require multiple custom headers (e.g. tenant ID + API key), the `Header Auth` credential supports only one header — additional headers need to be added on the HTTP Request node itself, which means the credential becomes incomplete on its own. Document this in the workflow's notes.

---

## A note on credential rotation

The lifecycle of a working credential is: created, used, forgotten, leaked, rotated. The "forgotten" step is the one that hurts. A quarterly calendar reminder to rotate production credentials — or at minimum, audit which credentials are in use and which are stale — is the simplest discipline that prevents the leak-discovered-six-months-later scenario.

When you rotate, the order matters: create the new credential first, attach it to workflows one by one, confirm each works, *then* revoke the old credential. Doing it the other way — revoking first — breaks workflows that haven't been migrated yet.

And one piece of operational hygiene: never share credentials over Slack DMs, never paste them into tickets, never email them. Use a password manager with a shareable-link feature, or n8n's own credential sharing if the team's already in the same instance. The minute a credential touches a chat log it's effectively public.
