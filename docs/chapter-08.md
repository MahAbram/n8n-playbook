---
title: 8. Setting up your first credentials | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: Gmail, Slack, Google Sheets, HubSpot — the four credentials that unlock 80% of beginner workflows, with the current 2026 setup paths.
meta-twitter:title: Learn Automation Working
---

# 8. Setting up your first credentials

You started building a workflow yesterday. New website lead → enrich the data → score it with an AI → write to HubSpot, ping Slack. Halfway through, the Gmail node asks you to *"Create a credential"*. You click the button. n8n asks for a Client ID and a Client Secret. You don't have either of those. You google. You end up reading a Google Cloud Console tutorial that's three years old. Forty-five minutes later, you have set up a Google Cloud Project, enabled four APIs, configured an OAuth Consent Screen, added yourself as a test user, copied a redirect URL, pasted credentials back into n8n — and you still haven't built the actual workflow.

This chapter exists so that doesn't happen again. Four credentials — **Gmail, Slack, Google Sheets, HubSpot** — unlock the majority of beginner workflows. We'll connect each one, the *current* way, with the shortcuts that exist if you're on n8n Cloud and the path that works if you're self-hosted.

A note up front about staleness. Google, Slack, and HubSpot have all changed their authentication models in the last 18 months. **HubSpot deprecated API keys** and now uses Private App tokens (with newer accounts seeing a *Service Keys* successor mechanism rolling out). **Google has tightened OAuth Consent Screen verification.** **n8n now recommends OAuth2 for the Slack node** even though the older token path still works. Most YouTube tutorials and Medium posts you'll find online teach an older path that still works mechanically but isn't the recommended one. This chapter uses the methods n8n's own docs at [docs.n8n.io/integrations/builtin/credentials/](https://docs.n8n.io/integrations/builtin/credentials/) recommend at writing — when in doubt, the canonical docs are the source of truth, not this chapter.

## A credential is not an account

Quick clarification before we start. When you "connect Gmail" to n8n, you are **not** logging into your Gmail account from inside n8n. You're giving n8n a **token** — a long string of characters — that represents *permission to do specific things on your behalf*. The token is encrypted at rest (n8n uses an encryption key that's auto-generated on Cloud and set via `N8N_ENCRYPTION_KEY` for self-hosted installs — back this up immediately if you're self-hosting, because losing it makes every credential unreadable).

The token has **scopes** — narrow permissions. You're granting *"read my emails"* or *"send messages to one channel"*, not *"do anything as me forever."* You can revoke the token from the source app at any time (Google Account → Security → Connections; Slack → Apps; HubSpot → Settings → Integrations) without touching n8n. Credentials in n8n are *reusable* — connect Gmail once, every workflow that needs Gmail uses the same credential.

The four credentials below cover 80% of the workflows you'll build in your first six months. Walk through each one; the rest of n8n's 650+ app integrations follow the same shape.

## Gmail — and the Cloud vs self-host split

Gmail credentials are where the Cloud-vs-self-host distinction shows up sharpest. The end result is the same — n8n can read, draft, label, and send email — but the setup path is dramatically different.

**If you're on n8n Cloud:** click *Create New Credential* in any Gmail node, choose **Gmail OAuth2 API**, and click *Sign in with Google*. A standard Google login window opens; you pick the account, approve the scopes, done. This is **Managed OAuth2** — n8n maintains its own Google Cloud Project, and Cloud users authenticate against that. Zero Google Cloud Console work on your end. Same for Sheets, Drive, Calendar — one Google sign-in covers them all.

**If you're self-hosted:** you need to create your own Google Cloud OAuth credentials. There's no shortcut. The steps:

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create a new project (or use an existing one).
2. Enable the **Gmail API** (and any other Google APIs you'll use — Sheets API, Drive API, etc.) under *APIs & Services → Library*. Each API has to be enabled individually.
3. Configure the **OAuth Consent Screen** under *APIs & Services → OAuth consent screen*. Choose *External* unless you have a Google Workspace; fill in app name, support email, and developer email. You can leave it in *Testing* status — but in testing mode, you can only authenticate with email addresses you add as Test Users, and the limit is 100 users.
4. Under *APIs & Services → Credentials*, click *Create Credentials → OAuth client ID → Web application*. Give it a name.
5. Under *Authorized Redirect URIs*, paste the **OAuth Callback URL** that n8n shows in the credential setup screen (it looks like `https://your-n8n-domain/rest/oauth2-credential/callback`).
6. Click Create. Google shows you a Client ID and Client Secret. Copy both.
7. Back in n8n's credential setup screen, paste Client ID and Client Secret, then click *Sign in with Google*.

That's the one-time setup. The same Client ID and Client Secret work for every Google service — you don't repeat this for Sheets or Drive. n8n's full instructions are at [docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service](https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/).

**The Service Account alternative.** OAuth credentials are tied to a specific Google account — the one you signed in with. If that person leaves your company, the credential breaks; if their password changes, the tokens may invalidate. For team and production use, the recommended path is a **Service Account** — a Google-managed identity that exists independent of any human user. The setup is longer (you create a JSON key file in Google Cloud and paste its contents into n8n's Service Account credential type, then explicitly share each Sheet or Drive folder with the Service Account's email), but the credential survives employee turnover. For your first workflows, OAuth is fine. When you're shipping production workflows that your team relies on, migrate to a Service Account. The setup is documented at [docs.n8n.io/integrations/builtin/credentials/google](https://docs.n8n.io/integrations/builtin/credentials/google/).

## Slack — two paths, depending on the node

Slack credentials offer two options in n8n: **Slack API** (an access token) and **Slack OAuth2 API** (a full OAuth flow). Picking between them depends on which Slack node you're using:

- For the **Slack node** (sending messages, uploading files, posting to channels, managing conversations): n8n recommends **OAuth2** in their official docs. Both work, but OAuth2 is the recommended path.
- For the **Slack Trigger node** (starting a workflow when a message arrives, a button is clicked, or a slash command fires): you **must** use an Access Token. OAuth2 doesn't work with the Slack Trigger.

The token path is simpler — fewer steps, no redirect-URL plumbing — and it covers most beginner workflows. The OAuth2 path is what n8n recommends for the Slack node specifically and is required if you eventually add the Slack Trigger. If you're not sure which you'll need, start with the token path (you can always add OAuth2 later as a separate credential).

**The token path (works for both the Slack node and the Slack Trigger node):**

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click *Create New App → From scratch*. Name it (e.g. "n8n Workflow Bot"), pick your workspace, Create.
2. In the app dashboard, click *OAuth & Permissions* in the left menu.
3. Scroll down to *Scopes → Bot Token Scopes*. Add the scopes your workflows need. The common starter set: `chat:write` (post messages), `channels:read` (list channels), `users:read` (look up usernames), `files:write` (upload files). The [n8n Slack docs](https://docs.n8n.io/integrations/builtin/credentials/slack/) list the full recommended set; add more as workflows need them.
4. Scroll back to the top of the page and click *Install to Workspace*. Approve. Slack shows you a **Bot User OAuth Token** starting with `xoxb-`. Copy it.
5. In n8n, in any Slack node, click *Create New Credential → Slack API*. Paste the token in the *Access Token* field. Save.
6. **If using this for the Slack Trigger** also: in n8n's credential edit screen, paste the **Signing Secret** (from *Slack app → Settings → Basic Information*) into the *Signature Secret* field, then go to *Slack app → Features → Event Subscriptions*, enable events, and paste the Webhook URL from your n8n Slack Trigger node as the **Request URL**.

That's it. Your workflows can now post to any channel the bot has been invited to. (Important: Slack bots don't auto-join channels — you'll need to invite `@your-app-name` to each channel where you want it to post. Run `/invite @n8n-workflow-bot` in the channel.)

**The OAuth2 path (n8n's recommendation for the Slack node):**

If you're on Cloud, n8n provides a *Connect my account* button that handles the OAuth flow against n8n's own Slack app — zero Slack-app setup on your end. Click, approve, done.

If you're self-hosting, you need to create the Slack app yourself: same starting steps as the token path (create app, configure scopes, install to workspace). Then add the OAuth callback: under *OAuth & Permissions → Redirect URLs*, add the OAuth Callback URL from n8n's *Slack OAuth2 API* credential screen. In *Settings → Basic Information → App Credentials*, copy the **Client ID** and **Client Secret**. In n8n, create a *Slack OAuth2 API* credential, paste both, click *Connect my account*.

n8n's full Slack credentials doc: [docs.n8n.io/integrations/builtin/credentials/slack](https://docs.n8n.io/integrations/builtin/credentials/slack/).

## Google Sheets — same Google credential, no extra setup

If you've connected Gmail above, **you've already connected Google Sheets**. The same Google credential covers every Google service whose API you've enabled.

**On Cloud:** Managed OAuth2 covers Sheets automatically. Click *Create New Credential* on a Google Sheets node and your existing Google credential appears in the dropdown.

**Self-hosted:** Ensure the **Google Sheets API** is enabled in your Google Cloud Project (under *APIs & Services → Library*). Then reuse the same OAuth Client ID and Client Secret you set up for Gmail. No new client, no new redirect URL.

If you went the Service Account route for Gmail, you have one extra step for Sheets: each Sheet you want the workflow to access must be **explicitly shared with the Service Account's email** (looks like `n8n-workflows@your-project.iam.gserviceaccount.com`). Open the Sheet, click *Share*, paste the Service Account email, grant Editor permissions. This step is required because Service Accounts don't have human users to grant access; the share has to be granted per-resource. Most beginner Sheets-related bugs are this step missed.

## HubSpot — the one most internet tutorials get wrong

HubSpot's authentication model has changed in the last few years. Here's the current state, which most online tutorials don't reflect:

- **API Keys**: deprecated since 2022. If a tutorial tells you to use one, it's stale.
- **Private App tokens (App Token)**: the current recommended path per the [n8n HubSpot credential docs](https://docs.n8n.io/integrations/builtin/credentials/hubspot/), and what the *HubSpot App Token* credential in n8n is built around.
- **Developer API Key**: required only for the **HubSpot Trigger** node, which uses HubSpot's Webhooks API.
- **OAuth2**: still works, the right choice if you're building a tool that connects to multiple HubSpot accounts (most readers aren't). Cloud users get a managed shortcut; self-hosted users build their own OAuth client.

For this book's purposes — connecting your one HubSpot account to n8n — **create a Private App and use its access token**. The steps, current as of writing:

1. Log into HubSpot. You need *Super Admin* access. If you're not a Super Admin on your company's HubSpot, ask whoever is.
2. Click the **settings icon** in the main navigation bar.
3. In the left sidebar, go to *Integrations → Private Apps*.
4. Click *Create private app*.
5. On the **Basic Info** tab, enter the app's **Name** (e.g. "n8n Production"). Optionally add a logo and description.
6. Open the **Scopes** tab and add the scopes your workflows need. Common starters for CRM workflows: `crm.objects.contacts.read`, `crm.objects.contacts.write`, `crm.objects.deals.read`, `crm.objects.deals.write`, `crm.objects.companies.read`, `crm.objects.companies.write`. The [n8n HubSpot docs](https://docs.n8n.io/integrations/builtin/credentials/hubspot/) list the full required-scopes mapping by node operation.
7. Click *Create app* to finish. Review the info modal and select *Continue creating*.
8. Once the app is created, open the *Access token* card and click *Show token* to reveal the token. Copy it.
9. In n8n, create a *HubSpot App Token* credential. Paste the token as the *App Token*. Save.

**A note on HubSpot's evolving model.** HubSpot is rolling out a newer **Service Keys** mechanism alongside Private Apps, intended as an eventual successor. As of the n8n docs at writing, the canonical path for new credentials is still Private Apps — but HubSpot's UI sometimes routes you to *Service Keys* in newer accounts. If the *Private Apps* menu isn't visible in your account, search HubSpot's settings for "service keys" or "private apps" and follow whichever option HubSpot surfaces; both produce a token that pastes into n8n's *HubSpot App Token* credential field. Watch [docs.n8n.io/integrations/builtin/credentials/hubspot](https://docs.n8n.io/integrations/builtin/credentials/hubspot/) for the latest path.

**If you need the HubSpot Trigger node** (start a workflow when a contact is created, a deal stage changes, etc.), that requires a **Developer API Key** from a HubSpot Developer Account (different from your main HubSpot portal). The full setup is documented at [docs.n8n.io/integrations/builtin/credentials/hubspot](https://docs.n8n.io/integrations/builtin/credentials/hubspot/). For most beginner workflows, you don't need this — a Schedule trigger that polls HubSpot every five minutes (using the regular HubSpot node) covers the same ground without the developer-account setup.

## Testing a credential

After saving any credential, n8n attempts to connect using the credentials you provided. A green checkmark next to the credential name means it works; a red error means it doesn't. If you see red, the error message usually points at the cause: wrong scope, expired token, redirect URL mismatch, missing API enablement.

For a quick second-test that doesn't require building a workflow, drop the relevant node onto a blank canvas, configure one simple operation (Gmail: *Get Many Messages*; Sheets: *Get Many Rows* from a Sheet you own; HubSpot: *Get Many Contacts*), and click *Test step*. If you see real data come back, your credential is good. If you see an error, fix it before continuing — credentials that work for some operations and not others are a real and confusing failure mode.

## Hygiene rules that pay back early

Five practices that cost nothing now and save you a lot later:

- **Name credentials with purpose, not service.** *"Gmail — Production"* and *"Gmail — Test Account"* beat *"Gmail account 1"* and *"Gmail account 2"*. Future-you picks the right one from a dropdown without thinking.
- **One credential per service per environment.** Real Gmail credential for activated workflows; test Gmail credential for development. The single most common cause of an automation incident: the right workflow pointing at the wrong credential at the wrong time.
- **Narrowest scopes that work.** If a workflow only reads, don't grant write. If a Slack bot only posts to one channel, don't grant workspace-wide scopes. Scopes are easy to add later; harder to defend in an audit when over-granted.
- **Document in the credential description.** n8n lets you add a description to every credential — use it. *"Used by: lead-qualification, daily-cash-briefing. Owner: ops. Last rotated: 2026-03-15."* Three months later, that note tells you whether the credential is still in use before you delete it.
- **Rotate when an employee leaves.** Credentials outlive the people who set them up. Add *"rotate any API key or OAuth credential they connected"* to the offboarding checklist — especially HubSpot Service Keys and Slack tokens, where the human who created them is sometimes the one being offboarded.

## The takeaway

- A credential is a **scoped token**, not a login. n8n stores it encrypted; you reuse it across every workflow that needs the service.
- **Cloud users get a shortcut** on Google services via Managed OAuth2 — one-click sign-in with no Google Cloud Console setup.
- **Self-hosted users** create an OAuth Client in Google Cloud Console once; the same Client ID/Secret covers Gmail, Sheets, Drive, Calendar.
- Slack: **OAuth2 is n8n's recommended method for the Slack node**; the **token path** is simpler and is required for the Slack Trigger node. Both work; pick based on what your first workflow needs.
- HubSpot: **Private App tokens** are the current canonical path (API keys are deprecated). HubSpot is rolling out *Service Keys* in some accounts as an evolving successor — if you only see Service Keys in your account's UI, the resulting token still pastes into n8n's *HubSpot App Token* credential.
- **Service Accounts** (Google) are the production-grade alternative to OAuth — they survive employee turnover where OAuth doesn't.
- One credential per service per environment, narrowest scopes, descriptive names. These three rules prevent more incidents than any tooling.

## Try it yourself

Connect two of the four credentials this chapter walked through — whichever pair matches what you'll actually build first. For most readers, the right starter pair is Gmail + Google Sheets (covers the daily-briefing and invoice-extraction workflows from Ch. 4 and Ch. 24) or Slack + HubSpot (covers the lead-triage and ticket-routing workflows from Ch. 22 and Ch. 23).

For each, complete the setup steps, then test the credential by adding a single node to a blank workflow and running one operation against your real account:

```
The credential I set up:       ____________________
The test I ran:                ____________________
What I got back:               ____________________
What I named the credential:   ____________________
```

**You'll know it worked when** a real piece of data — a real email subject line, a real Sheet row, a real Slack channel name, a real HubSpot contact — appears in the test step's output panel. Bonus: open the Credentials panel in n8n and read what you named each credential. If the names would still make sense to a colleague who'd never seen them, you've done the hygiene work right.

## What's next

You have n8n running, a trust posture set, and credentials connected to the four most-used apps. The last setup chapter, Ch. 9, is the hygiene one — how to organize workflows in **projects**, **folders**, and **tags** so your workspace doesn't sprawl into a mess in month three. Short chapter; high return. After that, Part III starts the real building.
