---
title: 4. A 10-minute first win | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: Ten minutes, one trigger, one action, one real workflow shipped — your first proof that automation works on your data.
meta-twitter:title: Learn Automation Working
---

# 4. A 10-minute first win

You have ten minutes. Maybe a coffee, maybe a tea, maybe you're on the train. The goal of this chapter is that by the time the mug is empty, an n8n workflow will have run against your real Gmail and produced one real piece of your actual work — not a toy task, not a tutorial, a thing you'd otherwise have done yourself in the next hour.

No theory. No diagrams. We did that in the last two chapters. This one is just the doing.

**A note before you start.** Later in this book you'll see chapters on branching, looping, AI agents, error handlers, sub-workflows, self-hosted Docker deployments. **Ignore all of that for today.** None of it is needed for your first win, your first week, or, honestly, your first month. The advanced patterns pull you in *when a real workflow makes you wish you had them*. Today we're doing the simplest possible workflow: one trigger, one action, hit "test", watch it run. That's it.

## What you're building

A **Personal Morning Brief**. Every weekday at 7am, n8n reads your Google Calendar, finds today's meetings, and emails them to you as a one-screen summary. Two nodes total. Five minutes of building. Five minutes of clicking through Google's permissions screens. Useful from day one, even if you never build anything else.

Why this workflow specifically: it touches both ends of the architecture diagram (Schedule trigger on one side, Gmail node on the other), the credentials are ones you almost certainly already have, and the output lands in a place you already check first thing in the morning. It's the simplest possible end-to-end workflow that still feels real.

## Step 1: sign up for n8n Cloud (2 minutes)

We're using **n8n Cloud's free tier** today. It's the fastest path — no install, no Docker, no terminal. The Cloud free tier (200 executions per month, one active workflow) is enough to run today's workflow forever; the 14-day Pro trial unlocks more if you want to keep building. Self-hosting is a real option but it's a Ch. 6 / Ch. 28 conversation, not a first-win one.

Go to [n8n.io](https://n8n.io/) and click *Get started*. You can sign up with Google, GitHub, or email. The signup asks you to name your *workspace* — pick anything, you can rename it later. It then drops you into an empty canvas with a giant button labeled *Start from Scratch*.

> **This UI may have changed since this was written.** n8n iterates on its onboarding flow regularly. The screenshots and button labels below were correct as of writing; **if anything doesn't match what you see, follow the in-app prompts — n8n's flow is well-signposted, and the [official tutorial](https://docs.n8n.io/try-it-out/tutorial-first-workflow/) is always more current than this book.**

**In other tools.** Zapier signup is at [zapier.com](https://zapier.com); Make at [make.com](https://make.com). Both have free tiers and similar first-workflow flows. The five steps below map almost one-to-one — different button names, same shape.

## Step 2: add a Schedule trigger (1 minute)

Click *Start from Scratch*. You'll see an empty canvas with one prompt: *"Add first step"*. Click it. n8n opens a node panel with a search box and a long list of triggers organised by category.

Type *Schedule* and pick the **Schedule Trigger**. The node lands on the canvas and a configuration panel opens on the right.

Set it to:

- **Trigger Interval**: Days
- **Days Between Triggers**: 1
- **Trigger at Hour**: 7
- **Trigger at Minute**: 0

That's *"every day at 7:00 AM"*. Skip the timezone setting for now (n8n uses your workspace timezone by default — confirm it's correct in your account settings if your morning emails arrive at strange times).

Click *Back to canvas*. You should see a single Schedule Trigger node on an otherwise empty graph.

## Step 3: add a Google Calendar node (2 minutes)

Click the small *+* button to the right of your Schedule Trigger node. The node panel opens again. Type *Google Calendar* and pick the **Google Calendar** node.

Set it to:

- **Resource**: Event
- **Operation**: Get Many
- **Calendar**: (your primary calendar, which will appear after you connect credentials below)
- **Return All**: off — limit to maybe 20 events
- **Filters**: After → `{{ $now.startOf('day') }}` ; Before → `{{ $now.endOf('day') }}`

Those last two are **expressions** — n8n's way of computing values at runtime. You can type them or use the drag-and-drop expression editor; for today, paste them as shown. They mean *"events between the start and end of today."*

You'll be asked to connect a Google credential. Click *Create New Credential* → *Sign in with Google* → pick your Google account → grant the calendar permissions n8n asks for. n8n stores the credential encrypted and reuses it across every future workflow that needs Google access. You won't do this dance again.

When the credential connects, click *Test step*. n8n runs *just this node* against your real calendar and shows you the output — an array of items, one per event, with fields like `summary`, `start`, `end`, `location`, and `attendees`. This is the moment the architecture diagram from Ch. 2 clicks into place: real data, real apps, items flowing through.

If your calendar is empty today, add a fake event for tomorrow and adjust the expression to look at tomorrow temporarily — you want to see real data before continuing.

## Step 4: add a Gmail node (2 minutes)

Click the *+* to the right of your Google Calendar node. Type *Gmail* and pick the **Gmail** node.

Set it to:

- **Resource**: Message
- **Operation**: Send
- **To**: your own email address
- **Subject**: `Morning brief — {{ $now.format('EEEE, dd MMM') }}`
- **Email Type**: Text (HTML works too but text is simpler today)
- **Message**: paste this expression block:

```
Good morning.

You have {{ $('Google Calendar').all().length }} events today:

{{ $('Google Calendar').all().map(item => '• ' + item.json.summary + ' (' + $now.setZone('Asia/Kuala_Lumpur').toLocaleString({ hour: '2-digit', minute: '2-digit' }) + ')').join('\n') }}

Have a good day.
```

That block is doing a few things at once. It counts how many events today's calendar holds. It then builds a bullet list of each event's title. The result is one short, readable email. Don't worry if the syntax looks unfamiliar — Ch. 12 walks through expressions properly. For today, paste and trust.

Connect the Gmail credential (it's the same Google sign-in you just did for Calendar; n8n recognises the account). Click *Test step*. Check your inbox.

The email is in your inbox. From your own Gmail. Sent by a workflow you just built. The architecture diagram from Ch. 2 just ran end-to-end on your real data, in real time.

## Step 5: activate it (1 minute)

The workflow has only run because you clicked *Test step* by hand. To make it run automatically every morning, you need to **activate** it.

Top right of the canvas — there's a toggle labeled *Inactive*. Click it. It flips to *Active*. n8n is now watching the clock; at 7:00 AM tomorrow morning, the workflow will run on its own.

That's it. You're shipped. Close the tab, finish your coffee.

## Step 6: watch it run (the next morning)

Tomorrow at 7am, an email arrives. You scroll past it half-asleep. That's fine — the magic isn't in the email, it's in the **Executions log**. Open n8n on your laptop later that day. Click *Executions* in the left sidebar.

There it is: one green row, dated this morning at 7:00:00. Click into it. You see every step of the workflow as it ran — the Schedule trigger firing, the Calendar fetching your events, the Gmail sending. Click any node and see the data that flowed through it: the actual event titles, the actual email body.

This is the "ship and watch" throughline from Ch. 1 made literal. You didn't have to test the workflow exhaustively before activating it. You built it, you activated it, you watched what it did, and now you have the tape to prove it ran. If anything had gone wrong, the row would be red and you'd click into it to see exactly which node failed and why. Tomorrow when you adjust the wording of the email, or add the weather, or filter out events with the word "Tentative" in them, you'll do the same loop — edit, test, activate, watch.

## What not to do today

You will be tempted to do a few things. Don't. Not today.

- **Don't add an AI Agent node.** You will, soon. Today it's one trigger, one action.
- **Don't fork ten templates from the n8n template library.** That's the *"equip first"* habit for new workflows, covered in Ch. 8 — today the muscle to build is *one workflow, end to end, my own data*.
- **Don't try to self-host.** That's Ch. 6 / Ch. 28. Cloud is the right starting surface; the operational question of where n8n runs is a separate conversation.
- **Don't connect five credentials.** You needed Google. That's it.
- **Don't watch a 45-minute YouTube tour first.** The fastest way to get good at this is to build a bad workflow on a real task, not to consume more setup content.

The point of all of these is the same: the first win is *one workflow, end to end, in one workspace, against your real data*. Everything else is opt-in, later.

## What just happened

You built a graph of two nodes and pointed it at your real calendar and your real inbox. n8n watched the clock, called the Google APIs you authorised, transformed the response into a friendly email, and sent it to you. The architecture diagram from Ch. 2 just ran end-to-end on your machine, against your real data, in real time.

The feeling, the first time, is a small jolt. Most people say some version of *"oh, that's what they meant"*. The workflow-mode shift is one of those things you don't really believe until your own data is involved. Now it has been.

The next 60 minutes of investment, in Part II, is what turns a satisfying one-off into a daily habit — picking the right hosting model (Ch. 6), thinking through what to trust the workflow with (Ch. 7), setting up the credentials that unlock 80% of beginner workflows (Ch. 8), and getting your workspace organised before it sprawls (Ch. 9). But none of that is required to keep using what you just set up. You can close this book right now and get value from it tomorrow.

## The takeaway

- One workspace, one workflow, two nodes. That's the entire first-win recipe.
- The two ends of the architecture diagram — a **trigger** at one side, a **connected app** at the other — bracket every workflow you'll ever build. Today's workflow is the minimum viable version of that shape.
- **Ship and watch**: activate the workflow, let it run on schedule, inspect the Executions log to see what it did. Not the other way around.
- Branching, looping, AI, error handlers, self-hosting — *all opt-in later*. None of them are gates between you and a useful first day.

## Try it yourself

Do exactly the chapter:

1. Sign up for n8n Cloud's free tier at [n8n.io](https://n8n.io/).
2. Build a workflow with a Schedule trigger → Google Calendar → Gmail.
3. Test it manually with *Test step* on each node.
4. Activate it. Wait until 7am tomorrow. Check your inbox.
5. Open the Executions log. Look at what ran.

**You'll know it worked when** an email lands in your inbox tomorrow morning that you didn't send, and you can open the Executions log and watch the tape of how it got there. Bonus points if the thought *"oh — I could also add the weather to this"* arrives unprompted.

*If you'd rather build something different*: a **Schedule trigger → Gmail** that sends you a quote of the day from the [Quotable API](https://quotable.io) via an HTTP Request node. A **Gmail trigger** that watches for emails with the label *"receipts"* and writes them to a Google Sheet. A **Schedule trigger** that hits an RSS feed and emails you yesterday's headlines. Same shape, different ends.

## What's next

The next chapter is the big strategic one — and the one most people quietly need. Before you sign up for "AI Inbox Triage for $30/month" or "AI Sales Assistant for $200/month", read it. A general-purpose workflow engine pointed at the systems you already pay for replaces a surprising number of those subscriptions.
