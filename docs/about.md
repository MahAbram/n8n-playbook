---
title: About This Playbook
---

# Learn Automation Working

**A practical, open-source playbook for shipping real workflows with n8n.**

For operations leads, analysts, marketers, founders, support managers, finance ops, and the engineers who back them up — anyone whose work involves shuttling data between Gmail, Slack, Sheets, a CRM, and three other apps.

## Why this book exists

You've already used a spreadsheet to track work that should track itself. You've already copy-pasted from an email into a CRM. You've already exported a CSV at 6pm on a Friday because some report needed it before Monday.

That's the **manual mode**. You move data; the systems wait.

There's a different mode: the **workflow mode**. You describe what should happen — *when a new lead arrives, enrich it, score it, send me a Slack to approve, then write it to the CRM* — and a workflow engine does it, every time, whether you're at your desk or asleep.

This book is about that mode. Not the theory of it; the daily practice of it.

We use **n8n** as the main running example because it's the deepest, most flexible tool, self-hostable, and has AI-native nodes baked in. The patterns work the same way in **Zapier**, **Make**, and **Power Automate** — where another tool has a notable equivalent, we cite it.

**Prerequisites:** you've used spreadsheets, Gmail, and at least one app with a "Connect to..." button. That's it. We'll cover everything else.

> **One promise to non-technical readers, up front.** You do not need to learn to code to get value out of this book. You do not need to read API documentation. You do not need to write JSON by hand. n8n's visual canvas, 650+ built-in app integrations, and AI-native nodes do almost all of that *for* you. The throughline of the whole book is: **if you can think a workflow through end-to-end, you can build it in n8n.** This is true for triggers, for connecting your apps, for branching logic, for transforming data, for integrating AI to read unstructured input, even for error handling. You decide what should happen; n8n handles how. The only piece you can't outsource is *deciding what you want to happen*.

## How to read this book

> **Don't try to learn all of this before you start.** A 32-chapter table of contents can be intimidating — sub-workflows, error handlers, queueing, self-hosted Docker deployments, multi-step AI agents — and the natural reaction is *"I need to understand all of that first."* You don't. The fastest readers do this: **read Part I, do the 10-minute first win in Ch. 4, pick one workflow from Part V that matches your day job, and just *start*.** Everything else is opt-in. You'll grow into sub-workflows the day your main canvas hits 60 nodes. You'll discover error handlers when your first workflow silently fails. The advanced patterns will pull *you* — you won't need to push toward them.

Reading paths, depending on who you are:

- **Brand new to automation** — Part I and Part II in order, then jump to the workflow in Part V that matches your role. Skip everything else for now.
- **Convince me before I invest in setup** — Part I, then skip ahead to **Part V** and your role chapter. Loop back to Part II once you're sold.
- **Already shipped a few Zaps** — skim Part I, settle in for Part III (this is where the depth jump happens), and treat Parts IV–VI as reference.
- **Rolling this out across a team** — Part I, then Ch. 7 (trust), Ch. 14 (human-in-the-loop), Ch. 26 (sub-workflows), and Ch. 27 (self-hosting) — the four chapters that turn automation from one person's side project into a team capability.

Every chapter is standalone. Workflow JSON is importable. Examples are real — drawn from actual working teams, paraphrased and anonymised.

## A note on examples

Every workflow shown in this book comes from **real, paraphrased usage** — actual things teams shipped to do real work. We deliberately avoid toy examples like *"send me a Slack when it's sunny"*; if a workflow is in here, it's something you could plausibly ship at work on Monday.

Client names, ticket IDs, internal hostnames, and personal data are anonymised. The shape of the work is real.

## Three throughlines

If you forget every specific node and pattern in this book and you remember these three, you'll figure out the rest as the tools change underneath you.

1. **If you can think a workflow through, you can build it in n8n.** You will not be asked to write code, read API docs, or set up servers. You will be asked to *think through what should happen, step by step*.
2. **Equip first, then engage.** Before starting any new workflow, the first move is *not* "how do I build this?" — it's *"what app nodes already exist for the systems involved? Is there a template? Are my credentials connected?"* Pre-equipping a new workflow is the difference between an hour of fighting integrations and ten minutes of forking a working example.
3. **Ship and watch.** Activate your workflows against real Gmail, real HubSpot, real Stripe — and watch the Executions log. Production is the only real test. Reserve human-in-the-loop approval gates for the small set of *big and irreversible* actions (mass customer sends, large transfers, deletes); for everything else, the cost of a bad execution is lower than the cost of never shipping.

## Start reading

→ **Chapter 1: What changes when you stop doing it by hand?**

Or, if you'd rather just *try it*:

→ **Chapter 4: A 10-minute first win**

---

Released under the MIT License. An open-source project. Contributions welcome.
