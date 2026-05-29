---
title: 9. Your workspace setup — projects, folders, tags | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: The hygiene chapter that pays dividends in month three — projects, folders, tags, naming, and the Executions log explained.
meta-twitter:title: Learn Automation Working
---

# 9. Your workspace setup — projects, folders, tags

You sit down on a Monday in month three. n8n now runs eighteen of your workflows. You want to find the one that emails the cash-position briefing each morning — yesterday's run looked weird, you want to check the AI prompt. You open n8n, scroll the workflow list. *"Workflow 14", "Untitled workflow", "Untitled workflow (1)", "Daily Briefing v2", "Daily Briefing — FINAL", "Daily Briefing — actually final", "test test"…*

It takes you five minutes to find the right workflow. You eventually do. You also notice three workflows you don't remember creating, one of which appears to be sending emails to a Sheet's column header. You make a mental note to look at that later. You won't.

This is the *workspace hygiene tax*, and almost everyone pays it eventually. The four chapters of Part II that come before this one are about getting **set up**. This one is about staying that way — the small, almost-boring decisions that keep your workspace navigable as it scales from 3 workflows to 30 to 300.

It's a short chapter. The rules are simple. They'll pay you back the first time you onboard a teammate, the first time a workflow fails silently for two weeks before you notice, the first time someone asks *"can you show me how you do X?"* and you can find it in fifteen seconds.

## The organizational hierarchy

n8n gives you four layers to organize workflows, from broadest to narrowest:

**1. Projects** — top-level containers, each with their own workflows, credentials, and team members. *"Sales Operations"* is a project. *"Customer Success"* is another. *"Personal automations"* is a third. Projects let you separate concerns: workflows in one project don't see credentials from another, and team members get role-based access to specific projects rather than to your whole instance. **Projects are available on Pro and Enterprise plans (and self-hosted Community Edition with the right config).** Free and Starter plans get one *Personal* project that holds everything.

**2. Folders** — nestable containers *inside* a project. A relatively new feature (introduced in early 2025), folders are the right way to group related workflows visually — *"Lead workflows", "Finance workflows", "Internal tools"* — without using up the heavier Projects mechanism. Folders are available in all plans, including the Free tier. Self-hosted users on older versions: enable folders with `N8N_FOLDERS_ENABLED=true` if they aren't showing up; recent versions enable them by default.

**3. Tags** — cross-cutting labels you attach to any workflow. *"Production", "WIP", "Owner: Maya", "Touches PDPA data"* — anything you might want to filter by that doesn't fit a folder structure. A workflow can have many tags; folders are a single home.

**4. The workflow itself** — its name, its nodes, its description.

If you're on a Free or Starter plan: don't worry about Projects. You have one. Use **folders + tags** within it. If you're on Pro or self-hosted Community at team scale: think of Projects as **departments**, folders as **functions within a department**, tags as **cross-cutting attributes**.

A workable starter structure for a small team:

```
Project: Sales Operations
├── Folder: Lead workflows
│   ├── Lead Qualification Engine (tags: Production, Webhook)
│   ├── Deal stagnation watcher (tags: Production, Schedule)
│   └── Cold outreach personaliser (tags: WIP)
├── Folder: Pipeline reporting
│   ├── Weekly pipeline digest (tags: Production, Schedule)
│   └── Forecast snapshot (tags: WIP)
└── Folder: Internal sales tools
    └── Quote-to-CRM sync (tags: Production)

Project: Customer Success
├── Folder: Ticket triage
│   ├── Sentiment & routing (tags: Production, Webhook)
│   └── KB answer drafter (tags: Production, Human-in-the-loop)
└── Folder: Renewals
    └── Renewal risk early warning (tags: Production)
```

Two projects, six folders, ten workflows. Tags do the cross-cutting filtering: "show me everything tagged *Production*" → eight workflows across both projects. "Show me everything tagged *Human-in-the-loop*" → one workflow (a sanity-check that all your sensitive workflows have approval gates).

You don't need to design this structure on day one. Build it as you go. The right rule: **when you have a third workflow that feels related to two existing ones, make a folder for them**. The right rule for projects: **when a team member's involvement is bounded — "Bob should only see Sales workflows" — create a project for it**.

## Naming workflows

This is the hygiene rule that pays back fastest. Three principles:

**1. Name workflows by *what they do*, not *what they are*.** *"Daily cash position briefing → email"* beats *"Workflow 14"* or *"Schedule trigger workflow"*. The name should fit on a single line in the workflow list and tell future-you what the workflow accomplishes, not which trigger it uses.

**2. Trigger first, action last** is a useful pattern when names are long. *"[Webhook] New lead → Qualify → HubSpot + Slack"* tells you the input, the work, and the output in one glance. *"[Schedule] Weekly NPS digest → Slack"* tells you it's a Friday automation. *"[Drive] New meeting transcript → Linear tasks"* tells you the trigger is a file arriving.

**3. Never use version suffixes in workflow names.** *"Daily Briefing v2"* and *"Daily Briefing — FINAL"* are how the mess in this chapter's opening scene starts. If you need version history, n8n has it built-in — the workflow's *History* tab shows every save. If you need to keep an old version active temporarily while testing a new one, deactivate the old one or move it to a *"Deprecated"* folder. Don't rename it.

A few names that age well:

```
[Webhook] New website lead → Enrich → Qualify → HubSpot + Slack
[Schedule 7am] Personal morning briefing → Gmail
[Gmail label:receipts] Extract receipt → Google Sheet
[Drive folder:transcripts] Meeting notes → Linear action items
[HubSpot deal stage:Negotiation] Stagnation watcher → Slack
[Manual] Backfill last quarter NPS → Slack digest
```

Names that age badly:

```
Test workflow
Test workflow (1)
My workflow
Daily Briefing v3 FINAL
Webhook test — DO NOT DELETE
asdf
```

## Tagging — what's worth a tag and what isn't

Tags are flexible but cheap-to-misuse. A few tags pay for themselves; many tags become noise. A starter set that works:

- **`Production`** — the workflow is active, running on real data, monitored. The most important tag to use consistently. *"Show me everything tagged Production"* should equal *"show me every workflow I actually rely on."*
- **`WIP`** — work-in-progress, not yet activated. Useful for sweeping these into a separate view from production workflows.
- **`Deprecated`** — kept around for reference but not in active use. Cheaper than deleting.
- **One tag per project area** if you have many projects: `Sales`, `Finance`, `Support`. (Useful if a workflow lives in *"Internal Tools"* but is owned by the Sales team.)
- **One tag for sensitive workflows**: `Touches-customer-data`, `Touches-money`, `Has-human-approval`. Filtering by these tags becomes your quarterly compliance review.

Things that don't earn a tag, in practice: trigger types (you can see those at a glance in well-named workflows), credentials used (search by credential is faster), the date you built it (n8n records this). Tags should be **categorical**, not informational.

## The Executions panel

Beyond organising workflows, the other thing you live in is the **Executions panel** — the log of every workflow run. Each row shows the workflow name, the trigger time, how long it took, and whether it succeeded (green), failed (red), or is still running (yellow).

This is where your *"ship and watch"* practice from Ch. 7 happens. A few practical moves:

- **Filter by workflow** when you want to check on one specific workflow's health. Click the workflow name in the filter dropdown, or open the workflow and click its *Executions* tab.
- **Filter by status** when you want to triage failures. *"Show me everything that failed in the last 24 hours"* takes two clicks.
- **Click into a failed execution** to see exactly which node failed and what data triggered the failure. The data panel shows you the input that broke the node — usually the fastest path to a fix is *"oh, the field name changed in the source app."*
- **Retry from this node.** When you've fixed the underlying cause (the broken expression, the missing field, the wrong credential), click *Retry from this node* and the execution resumes from that point with corrected input. No re-running the whole workflow.
- **Execution data retention** — n8n keeps successful executions for a configurable period (default 14 days on Cloud), failed executions for longer. Self-hosted instances configure this via the `EXECUTIONS_DATA_PRUNE_*` environment variables. For most teams the defaults are fine; if you're in a regulated industry, check what your retention requirements are.

A note on cost: each execution counts against your n8n Cloud plan's monthly limit. If a workflow runs every minute, that's 43,200 executions/month — enough to blow through a Starter plan and most Pro plans. The Executions log is where you spot this kind of runaway *before* the bill arrives.

## Sharing and team workflows

If you're working solo, skip this section.

If you're on a team, two mechanisms matter:

**Workflow sharing.** On Pro and Enterprise plans, you can share an individual workflow with specific team members and set their access (owner, editor, viewer). This is the right pattern for collaboration on a *specific* workflow — someone else helps you build it, then they go back to their own work.

**Project membership.** Adding a team member to a Project gives them access to every workflow and credential in that project under a defined role. This is the right pattern for *team ownership* — "the Sales Ops team owns the Sales Operations project; the Finance team owns the Finance project; the workflows in each move independently."

Roles in n8n's RBAC (Enterprise/Pro):

- **Owner**: full control of the project, can add/remove members.
- **Admin** (Enterprise): can edit workflows and credentials, can manage members.
- **Editor**: can create, edit, and run workflows; cannot manage members.
- **Viewer**: can see workflows and executions but not edit; useful for stakeholders who want visibility without write access.

The pattern that scales for teams: **one project per functional team, one team-shared credential per service per environment, every workflow owned by at least two people in the project**. The "at least two people" rule prevents the *"the person who built this left and now nobody can change it"* scenario, which is the most common operational risk in team-scale automation.

## Version control — when it earns its cost

n8n workflows export as JSON. You can `Download` any workflow from its menu and import it elsewhere. Some teams check workflow JSON into Git for the same reasons they check code into Git: change history, rollback, code review, the ability to recreate the workflow from scratch.

**Do this if**: you have engineering-led teams already in a Git habit, you run workflows across multiple n8n instances (dev / staging / prod), or compliance requires an auditable change log beyond n8n's built-in version history.

**Don't bother if**: it's just you, or your team is small enough that n8n's own version history (Workflow → History) gives you everything you need. Most readers don't need Git workflow management for at least the first year. Some never need it.

If you do go down this path: export workflows to a folder, *sanitise* (strip credentials and IDs — n8n's export does this for credential values automatically, but double-check), commit with a clear message describing the change, and tag releases. The shape is the same as a code repo. n8n Enterprise has a native Git sync feature for teams that want this without writing scripts.

## The quarterly review

The single highest-leverage hygiene practice — one hour per quarter, three things:

1. **Open the Workflows list, sorted by last execution.** Anything at the bottom that hasn't run in 90 days is a candidate for deletion or `Deprecated` tagging. Workflows you forgot exist are the easiest place for credentials to leak.
2. **Open the Credentials panel.** Walk down the list. Anything not used by an active workflow gets deleted. Anything you don't recognise gets investigated. Anything connected by an ex-employee gets rotated.
3. **Open the Executions log filtered by *failed*.** If any workflow has been failing silently for weeks without you noticing, this is when you find it. Either fix it or deactivate it.

One hour. Three things. Once a quarter. The single most effective preventive maintenance practice in n8n.

## The takeaway

- The hierarchy: **Projects** (departments) → **Folders** (functions) → **Tags** (cross-cutting) → **Workflows**.
- Free and Starter: one Project, use folders and tags inside it. Pro and team-scale: Projects per team, folders per function.
- Name workflows by **what they do**, with trigger first: *"[Webhook] New lead → Qualify → HubSpot"*. Never use version suffixes.
- Tags should be **categorical** (Production, WIP, Sales, Touches-PDPA-data) — not informational.
- The Executions log is your *"ship and watch"* surface. Filter by failure status; retry from the failing node; mind the per-execution cost on Cloud plans.
- For teams: project membership for team ownership; workflow sharing for one-off collaboration; the **at-least-two-owners** rule prevents the "ex-employee built this" scenario.
- One hour per quarter on workflows, credentials, and silent failures. Prevents most operational incidents at SME scale.

## Try it yourself

Whatever your current workspace looks like, spend ten minutes doing a hygiene pass:

```
Workflows I should rename:               ____________________
Workflows I should put in folders:       ____________________
Tags I should add (Production, WIP):     ____________________
Credentials with bad names:              ____________________
Workflows I haven't touched in 60+ days: ____________________
```

For each row, do the change immediately. Don't make a follow-up todo — n8n's interface is fast enough that the rename, the move-to-folder, the tag-application all happen in seconds.

**You'll know it worked when** opening your workflow list this evening, you can find any workflow you remember building within ten seconds — and the ones you'd forgotten about are either properly named or correctly deprecated.

## What's next

Part II is done. You have n8n running where you want it (Ch. 6), a clear trust posture (Ch. 7), credentials connected (Ch. 8), and your workspace organised (Ch. 9). Everything from here on is **building**.

Part III is the technical core of the book — triggers, the item-based data model that makes everything composable, branching, looping, error handling, AI integration. By the end of Part III, you can build any workflow you can describe. The data model chapter (Ch. 11) is the single most important conceptual chapter in the book; everything else clicks into place once it lands.
