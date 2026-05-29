---
title: 12. How do you actually write an expression? | Learn Automation Working
meta-description: A practical, open-source playbook for shipping real workflows with n8n.
meta-og:title: Learn Automation Working
meta-og:description: Expressions in n8n — the {{ }} syntax, $json, referencing other nodes, dates with Luxon, string operations, and the three errors you'll hit most.
meta-twitter:title: Learn Automation Working
---

# 12. How do you actually write an expression?

You build a workflow that pulls overdue invoices from HubSpot every morning and emails each customer a chase. It works on the test run. Then you check the inbox.

> Subject: Your invoice is overdue
>
> Hi customer, your invoice is overdue. Please pay it.

Every customer got that exact message. The fields were sitting right there in the data — names, invoice numbers, amounts due, days outstanding. The Gmail node sent the literal string "customer" because that's what you typed into the *To-Name* field.

What you needed was a way to say to the Gmail node: *don't use the word "customer", use whatever the current item's `contactName` field happens to be*. That instruction — "use the value from the data, not the literal text I typed" — is what an expression is.

Chapter 11 was the noun: items, JSON, the data flowing between nodes. This chapter is the verb. How to reach into the current item and pull out values.

## The 30-second mental model

Every parameter field in every n8n node has a small toggle next to it: **Fixed** or **Expression**. Fixed means *use exactly what I typed*. Expression means *evaluate what I typed as JavaScript, then use the result*.

Flip to Expression and the field accepts anything wrapped in double curly braces — `{{ ... }}`. Whatever's inside is JavaScript that runs at execution time.

```
Fixed:       Hi customer
Expression:  Hi {{ $json.contactName }}
```

First sends "Hi customer" to every recipient. Second sends "Hi Ahmad Tan" to the first item, "Hi Lim Wei Ling" to the second, and so on — `$json.contactName` resolves to a different value for each item the node processes.

That's the whole mechanism. Everything below is things you can put inside the braces.

You will rarely write expressions from scratch. The expressions editor lets you drag fields from the input panel directly into a parameter, and it builds the expression for you. The reason to understand the syntax is so that when something breaks at 6 PM on a Friday, you can read the error and fix it without filing a ticket.

## `$json` — the data of the current item

`$json` means exactly one thing: the JSON of the item the current node is currently processing.

When a node runs over five items, it executes five times. Each time, `$json` refers to *that specific item's* JSON. The expression `{{ $json.email }}` gives item 1's email on the first execution, item 2's on the second, and so on. You write the expression once. The items model from Chapter 11 does the rest.

Dot notation chains into nested objects: `{{ $json.contact.email }}`. If a field name contains a space or special character — webhook payloads from external forms often have keys like `"First Name"` — use brackets instead: `{{ $json['First Name'] }}`.

Under the hood `$json` is shorthand for `$input.item.json`. You'll see the long form in older docs and shared workflows. Same thing. A few related accessors worth knowing:

- `$input.first().json.fieldName` — first item's value regardless of which item is being processed. Useful when one field applies to the whole batch.
- `$input.last().json.fieldName` — same idea, last item.
- `$input.all()` — the entire array; useful in Code nodes when you loop manually.

For most chapter-by-chapter work, `$json` is all you need.

## Reaching into other nodes with `$('Node Name')`

`$json` only sees the current node's input. To pull a value from three nodes back — or from across a branch — use `$('Node Name')`. Whatever's typed on the canvas goes in the quotes:

```
{{ $('HubSpot - Get overdue invoices').item.json.invoiceNumber }}
{{ $('Schedule Trigger').item.json.timestamp }}
```

Two traps:

- **Names are case- and whitespace-sensitive.** Node named *HubSpot — Get overdue invoices* (em-dash) but you typed *HubSpot - Get overdue invoices* (hyphen)? Undefined. The editor's drag-and-drop avoids this entirely — it copies the name verbatim. Type by hand and you're asking for a 20-minute debugging session.
- **`.item` is the *linked* item, not the first item.** n8n tracks which input item produced which output item across the workflow — item linking, covered in Chapter 11. `$('Earlier Node').item` gives you the upstream item that corresponds to whatever you're currently processing. If linking has been broken (usually by a Code node that didn't preserve `pairedItem`), it returns undefined and you get *Can't get data for expression*. Fix by repairing linking, or use `$('Earlier Node').first()` explicitly.

You'll also see an older syntax in legacy workflows: `$node["Node Name"].json.fieldName`. It still works, but it's not what the editor generates. Use `$('Node Name')` going forward.

## Dates: Luxon, `$now`, `$today`

Dates are where ops leads get hurt. n8n's answer is Luxon — a JavaScript date library exposed through two ready-made variables and a `DateTime` constructor.

- **`$now`** — current moment, as a Luxon DateTime, in the workflow's configured timezone.
- **`$today`** — `$now` snapped to midnight. Same date, time component zeroed.

You chain methods off them:

```
{{ $now.plus({ days: 7 }).toFormat('yyyy-MM-dd') }}   →  2026-05-31
{{ $now.minus({ hours: 2 }).toISO() }}                →  2026-05-24T07:47:00.000+08:00
{{ $today.toFormat('dd MMM yyyy') }}                  →  24 May 2026
```

`.plus()` and `.minus()` take objects: `{ days: 7 }`, `{ hours: 2, minutes: 30 }`, `{ months: 1 }`. `.toFormat()` uses Luxon's token strings — `yyyy` (4-digit year), `MM` (zero-padded month), `dd` (zero-padded day), `HH:mm:ss` (24-hour). Tokens are case-sensitive: `MM` is month, `mm` is minutes. There's no `DD` or `YYYY` in Luxon — get it wrong and you'll see literal letters in the output. Full token table at [docs.n8n.io/data/specific-data-types/luxon](https://docs.n8n.io/data/specific-data-types/luxon/).

To parse an incoming date string, use `DateTime` directly:

```
{{ DateTime.fromISO($json.createdAt).plus({ days: 30 }).toFormat('yyyy-MM-dd') }}
```

That reads as: take `createdAt`, parse as ISO 8601, add 30 days, format. This is the canonical recipe for "compute a due date 30 days from when the record was created."

One trap worth flagging: vanilla JavaScript's `new Date(...)` works in expressions but doesn't respect the workflow's configured timezone. n8n's docs explicitly recommend Luxon over `Date()` for this reason. If you're copy-pasting JavaScript that uses `Date()`, translate it before shipping.

A local wrinkle: if your invoices are due "by end of day Friday Kuala Lumpur time" and your n8n Cloud workspace defaults to UTC, an unconverted timestamp is eight hours off and you'll dunning-mail customers on Thursday afternoon by mistake. Set the workflow timezone in Settings, or chain `.setZone('Asia/Kuala_Lumpur')` before formatting.

## Strings: building messages

The overdue-invoice email from the cold open is just string assembly with values plucked from `$json`. Two ways to write it.

Template literals (backticks with `${...}`) — preferred once you have more than two variables:

```
{{ `Hi ${$json.contactName}, your invoice ${$json.invoiceNumber} for RM ${$json.amountDue} is ${$json.daysOverdue} days overdue.` }}
```

Plain concatenation with `+`:

```
{{ 'Hi ' + $json.contactName + ', your invoice ' + $json.invoiceNumber + ' is overdue.' }}
```

Same result. Backticks read better at scale.

Common string operations:

- `{{ $json.email.toLowerCase() }}` — normalise before storing.
- `{{ $json.name.trim() }}` — strip whitespace from form submissions.
- `{{ $json.phoneNumber.replace(/\s+/g, '') }}` — remove all spaces.
- `{{ $json.fullName.split(' ')[0] }}` — first name from "first last". (Brittle for names like "Mohd Ali bin Ismail" — common shortcut, not a name parser.)
- `{{ $json.invoiceNumber.startsWith('INV-') }}` — true/false. Useful inside an If node's condition.

If a field might not exist, calling `.toLowerCase()` on `undefined` throws. Next section.

## Conditionals and fallbacks

Real data is missing fields. Three idioms handle this, in order of how often you'll reach for them:

**Nullish coalescing (`??`)** — use the left value if it's defined and not null, otherwise the right:

```
{{ $json.phoneNumber ?? 'No phone on file' }}
```

**Logical OR (`||`)** — almost the same, but also falls through for empty strings, zero, and false. Use `??` unless you specifically want empty strings to count as missing:

```
{{ $json.discount || 0 }}
```

**Ternary (`condition ? ifTrue : ifFalse`)** — branching values inside a single field:

```
{{ $json.amountDue > 10000 ? 'urgent' : 'standard' }}
```

Nest ternaries past one level and your future self will hate you. If you need three or more branches, use an If or Switch node — that's Chapter 13.

A common composite: a personalised greeting that degrades gracefully:

```
{{ `Hi ${$json.contactName ?? 'there'}, your invoice ${$json.invoiceNumber ?? '(reference unavailable)'} is overdue.` }}
```

Missing name? "Hi there." Missing invoice? "(reference unavailable)." Both present? Personalised. One expression, no extra nodes. The cheapest reliability you can buy in n8n.

## The expression editor

Almost every expression in this chapter, you should be building by drag-and-drop, not typing.

Flip a field to Expression mode, click the small icon next to it, and n8n opens the full editor — input data on the left, your expression in the middle, live preview on the right. The preview updates as you type and shows what the expression resolves to *for the currently-selected input item*.

Two things to actually do:

- **Drag fields into the expression box.** Grab `contactName` from the input panel, drop it into the expression — n8n inserts `{{ $json.contactName }}`. Drag from a different node and it inserts the full `$('Node Name').item.json.fieldName` form. No typos. No case-sensitivity bugs.
- **Use the item paginator to test edge cases.** Above the input panel: *1 of 5*, *2 of 5*. Click through. The preview updates per item. This catches the bug where item 3 has a missing field that items 1, 2, 4, 5 all have. If preview shows `undefined` on any single item, your expression is fragile.

Most experienced users don't memorise expression syntax — they recognise it. You'll write maybe ten or fifteen expressions from scratch in your first year. The rest get built for you. Your job is reading what the editor produced and deciding whether it's correct.

## When expressions break

Three errors are common enough to commit to memory.

**`Can't get data for expression`** — n8n is trying to resolve `$('Some Node').item.json.field` but Some Node either hasn't run yet, or item linking between it and the current node is broken. Fix: execute the upstream node first (manual execution from its node menu), or check whether a Code node in between stripped paired-item information.

**`Cannot read properties of undefined (reading 'something')`** — your expression assumed a field existed and it didn't. Use `??` to provide a fallback, or guard with a ternary. This is the most common runtime error in production, and ninety per cent of the time it's a third-party API returning a slightly different shape than it returned during testing.

**Literal `{{` showing up in the output** — you forgot to flip the field to Expression mode, or there's a stray `{` or trailing `.`. The editor usually catches this, but if it slips through, the field outputs raw braces as plain text.

For all three, the Executions log (Chapter 9) is your friend. Open the failed execution, click the failing node, look at the Input panel — that's the data shape your expression was operating on. The error tells you what your expression expected. Reconciling the two is the entire debugging loop.

## The takeaway

- **Every parameter field is either Fixed (use the literal text) or Expression (evaluate as JavaScript inside `{{ }}`).** That toggle is the entire conceptual surface.
- **`$json` = the current item's JSON**, the same item the node is processing in this execution. Shorthand for `$input.item.json`.
- **`$('Node Name').item.json.fieldName`** reaches into another node, following item-linking threads. Names are case-sensitive — drag, don't type.
- **`$now` and `$today` are Luxon DateTime objects.** Chain `.plus()`, `.minus()`, `.toFormat()`. Use `DateTime.fromISO()` to parse strings. Avoid vanilla `Date()`.
- **`??` for missing-field fallbacks, ternaries for inline branching.** Don't nest past one level — that's what If and Switch are for.
- **Drag-and-drop in the expression editor builds expressions for you** and avoids case-sensitivity bugs. Use the item paginator to catch fragile expressions on edge-case items.

## Try it yourself

Take the workflow from Chapter 4 (Schedule → Calendar → Gmail). The Gmail message body is probably a static string. Replace it with an expression that adapts to recipient and date.

1. Add an **Edit Fields (Set)** node between Calendar and Gmail, in *Run Once for All Items* mode.
2. Define a field `today` with `{{ $today.toFormat('cccc, dd MMMM yyyy') }}` — full day name, then date.
3. Define `meetingCount` with `{{ $('Google Calendar').all().length }}`.
4. In the Gmail body, build:
   ```
   {{ `Good morning. Today is ${$json.today}. You have ${$json.meetingCount ?? 0} meeting${$json.meetingCount === 1 ? '' : 's'} scheduled.` }}
   ```
5. Set the Calendar query to a Saturday with no meetings. Re-run.

**You'll know it worked when** the Saturday version reads naturally: "You have 0 meetings scheduled." The `??` handled the missing field, the ternary handled the singular/plural, and the date formatted in your local language. Three expression patterns from this chapter, in one field.

## What's next

Expressions handle two-way branching inside a single field — `urgent` or `standard`, `Hi name` or `Hi there`. As soon as you want to route different items down different *paths* — high-value leads to one Slack channel, low-value to another; paid invoices to a done pile, unpaid to a chase queue — you need branching nodes. Chapter 13 covers the three: **If**, **Switch**, and **Filter**, and how to pick between them.
