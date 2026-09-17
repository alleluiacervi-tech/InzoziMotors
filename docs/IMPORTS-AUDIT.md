# Sawa Cars Imports — Deep Audit, Competitive Analysis & Roadmap

> Sep 17 2026 · Full trace of the Imports module — backend routes, all six
> `import_*` tables plus the global catalogue migrations, and all three
> clients (mobile, web, admin) — against the code, cross-referenced with
> established patterns from leading vehicle-export, auction, freight/customs
> and cross-border-payment platforms. Every backend finding below is verified
> against the code with file:line references. Live web search was
> unavailable during the competitive-analysis pass; see the note at the top
> of that section for what that does and doesn't affect.

## Verdict

The Imports module is the most *architecturally honest* thing in this repo
and the least *complete*. The pipeline, the immutable agreement snapshots,
the numbered PDF documents, the two-checkpoint payment review and the
cost/margin separation are genuinely good bones — better than most
classifieds companies ever build. But it stops at the exact point where an
import business actually lives: there is no supplier record, no shipment
intelligence, no buyer-visible bank instruction, no cancellation or refund
path, no reminder or SLA machinery, and no web presence at all for the
233-model catalogue only the mobile app can see. It is a well-built *record*
of an import, not yet a *system* that runs one.

The single most urgent item is not a feature. Three mobile screens still
tell buyers their import is **"100% Protected by Bank of Kigali / I&M Bank
Escrow Guarantee"** — naming two real banks and promising a guarantee that
does not exist, was deliberately deleted from the backend, and is locked off
in `platform_settings`. The web app was cleaned; the mobile app was not.
That copy ships today.

## What exists today

**Backend** — one router, `backend/src/routes/imports.js` (865 lines),
mounted at `/imports` in `backend/server.js:290`. Six tables from migration
`0015` (`import_orders`, `import_payments`, `import_documents`,
`import_order_events`, `import_agreements`, `import_shipments`), plus `0039`
(actual cost), `0044`/`0045` (the global catalogue), `0046` (studio renders)
and `0047` (the Commons photo review queue).

**The pipeline** is a 17-state machine declared as `STATUS_TRANSITIONS`:

`enquiry → quoted → agreement_pending → deposit_due → deposit_review →
ordered → inspected_abroad → shipping_booked → in_transit → arrived →
kigali_inspection → balance_due → balance_review → customs_clearance →
ready_for_handover → completed`, with `cancelled` reachable from most early
states.

**Money** is 50/50: issuing a quote deletes any `due` rows and writes
exactly two milestones, `initial_50` and `final_50`, splitting the total with
the remainder on the final. There is no gateway. The buyer transfers to a
bank and uploads proof; an admin walks it through `submitted → reviewed →
verified`. Verification of the first half advances the order to `ordered`;
the second to `customs_clearance`.

**Documents** — `backend/src/lib/documents/import-documents.js` renders
three numbered, SHA-256-hashed PDFs (quotation, service agreement, 50%
deposit invoice) from one immutable `import_agreements.terms_snapshot`, plus
a per-payment official receipt. Company and bank identity come from
environment variables.

**The catalogue** is 233 brand-new models across Japan, South Korea, China,
UAE and Europe, generated from `backend/data/import-catalog.json` into both
the database and a bundled mobile fallback (`src/data/importCatalog.js`).
Price, engine size and photographs are deliberately `NULL` until an admin
fills them — migration `0045` exists specifically to undo an earlier version
that invented all three.

**Clients**

| Surface | What it does |
|---|---|
| Mobile | The whole discovery funnel: brands → models → vehicle detail → enquiry, plus order list and order detail |
| Web dashboard | Order list, order detail, agreement acceptance, payment proof upload. **No enquiry creation, no catalogue** |
| Web public | Only `/tools/import-duty`, a standalone RRA duty calculator |
| Admin | Pipeline list with inline quote builder, operations record (payments, shipment, cost/margin, document pack, uploads, timeline), and a Commons photo review queue |

## What is genuinely strong

These are the parts to protect. Several are better than what the large
incumbents do.

**The agreement snapshot is immutable and versioned.** Issuing a new quote
supersedes the previous `import_agreements` row and mints version *n+1*;
acceptance records the accepting user, timestamp and IP. Every PDF renders
from that snapshot rather than from live order columns, so a document and
the terms it describes cannot drift apart. BE FORWARD and most brokers send
a PDF and hope nobody re-reads it.

**Documents are numbered, hashed and streamed under access control.**
`file_sha256`, `document_number`, `page_count` and a `no-store, private` +
`nosniff` + `no-referrer` header set on every download, with the hash
surfaced as `X-Document-SHA256`. Every download writes an admin-audit row.
This is a real evidentiary chain.

**Cost and margin are separated from the quote, and enforced at the read
boundary.** `fullOrder()` strips `internal_notes`, `actual_cost_rwf`,
`cost_note`, `cost_recorded_at` and `cost_recorded_by` for non-admins,
`/imports/mine` names its columns explicitly rather than selecting `*`, and
the `cost_recorded` event is written with `customer_visible = FALSE`. There
is a test asserting all three. Most teams leak this.

**The two-checkpoint payment review is honest about its own constraint.**
`submitted → reviewed → verified` cannot be short-circuited, and the code
comments explain that a second human account does not exist yet rather than
pretending the separation is a maker-checker control.

**The catalogue refuses to invent data.** Migration `0045` is a deliberate
retreat from 29 fabricated rows with hand-typed FOB figures and seven stock
photos reused across 33 references. Price, engine and photo are nullable *by
design* so "not known yet" is representable. The Commons photo queue
(`0047`) requires a human to approve each specific image and carries CC
attribution fields through to the client. This discipline is rare and
valuable.

**Duty rates are data, not code.** `GET /settings/duty-rates` serves the
schedule; the *bases* (what each percentage is charged on, and in what
order) stay in code because choosing a wrong base is a modelling error. Web
and mobile implementations mirror each other deliberately. The fallback
schedule carries a `reviewed_on` date.

**The audit trail is append-only and dual-visibility.**
`import_order_events` carries `from_status`, `to_status`, `metadata` and a
`customer_visible` flag, so one table serves both the operator's forensic
record and the buyer's timeline.

## Defects found

These are specific, reproducible and fixable now. Severity ordered.

### P0 — Escrow guarantee copy still live in the mobile app

`src/screens/ImportVehicleDetailScreen.js:529` — *"Protected by Bank of
Kigali / I&M Bank Escrow Guarantee. No payment is required today."*
`src/screens/SearchResultsScreen.js:355` and `src/screens/SearchScreen.js:214`
— *"🛡️ 100% Protected by Bank of Kigali / I&M Bank Escrow"*

The backend endpoint that fronted this was deleted with an explicit comment
saying the arrangement does not exist. `web/src/components/home/TrustGuarantees.tsx`
documents the same cleanup on the web. The mobile copy was missed. It names
two real financial institutions, uses the word *escrow*, and claims 100%
protection, on the screen where a buyer decides to commit to a
multi-million-franc import. This contradicts the project's stated first
rule, contradicts `guarantees_enabled = false` locked in `platform_settings`,
and is the kind of claim a regulator or a bank's legal team acts on.

### P0 — The buyer is told to pay, and never shown where

The deposit-invoice PDF carries `IMPORT_BANK_NAME` /
`IMPORT_BANK_ACCOUNT_NAME` / `IMPORT_BANK_ACCOUNT_NUMBER`. Neither client
links to any generated document: `generated_documents` comes back in the
`/imports/:id` payload and **no web or mobile code reads it**. Meanwhile
`sendImportUpdate` emails the buyer: *"Only pay using the corporate bank
instructions displayed on your official order."* There are no instructions
displayed on the official order.

A buyer who accepts the agreement is asked for a bank reference and a proof
photo with no legitimate in-product channel telling them the account to pay.
That is not merely a gap — it manufactures the exact conditions for a
WhatsApp impersonation scam, on the highest-value transaction the company
touches.

### P1 — The state machine can be bypassed through the payment routes

`STATUS_TRANSITIONS` is enforced only in `PATCH /:id/status`. Three other
routes write `import_orders.status` directly with no transition check:

- `POST /:id/payments/:paymentId/proof` sets `deposit_review` or
  `balance_review`
- `PATCH /:id/payments/:paymentId` on verify sets `ordered` or
  `customs_clearance`
- `POST /:id/accept-agreement` sets `deposit_due`

Both milestone rows are created as `due` the moment a quote is issued, and
the proof route filters only on `p.status IN ('due','rejected')` — never on
order status. The web UI renders the upload form for **any** due payment
once the agreement is accepted. So a buyer can upload proof for `final_50`
immediately after accepting, forcing the order to `balance_review`; an admin
verifying it pushes the order to `customs_clearance`, skipping `ordered`,
`shipping_booked`, `in_transit`, `arrived` and `kigali_inspection` entirely.
The order is then in customs clearance for a vehicle nobody has ordered.

### P1 — No cancellation, adjustment or refund path

`import_payments.milestone` permits `adjustment` and `refund`, and `status`
permits `refunded`. **Nothing in the codebase ever writes any of the
three.** There is no way to:

- let a buyer withdraw their own enquiry (`PATCH /:id/status` is admin-only)
- re-quote after customs assesses duty higher than estimated
- record a refund of a verified deposit on a cancelled order

An order cancelled after the deposit is verified has money recorded as
received and no mechanism to record it going back.

### P1 — `/imports` has no write rate limit

`writeLimiter` is applied to `/messages`, `/reviews`, `/disputes` and
`/id-verification` in `backend/server.js:245-248`. `/imports` is not in that
list, so enquiry creation and the multipart proof-upload route sit behind
only the 1000-per-15-minutes global backstop. The upload route writes files
to disk.

### P2 — The import funnel is English-only in a six-language app

`ImportBrandsScreen.js` and `ImportBrandModelsScreen.js` contain **zero**
`t()` calls; `ImportVehicleDetailScreen.js` has three. Hardcoded strings
include *"Sign In Required"*, *"Import request submitted successfully!"*,
*"Price on request"*, *"Brand new · 0 km"*. The app ships English,
Kinyarwanda, French, Swahili, Korean and Chinese, and the order screens are
fully translated — so a Kinyarwanda-speaking buyer browses the catalogue in
English and then reads their order in Kinyarwanda.

### P2 — Duty base ignores the freight figure it already has

`calcRwandaDuty` derives CIF by grossing the vehicle value up by a flat
`freight_insurance_pct` of 12%. `ImportVehicleDetailScreen.js` calls it while
holding a real `typical_freight_usd` — e.g. $2,800 on a $15,500 FOB, which is
18%, not 12%. The displayed cost lines are right; the *tax base* is computed
from a proxy when the actual number is in hand, understating duty on
freight-heavy routes. `calcRwandaDuty` should accept an optional explicit
freight/insurance amount.

### P2 — Shared bank-reference state across payments (mobile)

`ImportOrderDetailScreen.js` holds one `ref` state for all payment rows, so
typing a reference for one milestone populates the field on every other due
milestone. With both milestones due simultaneously (see P1), this is
reachable.

### P3 — Smaller items

- `quote_expires_at` is stored and printed on the PDF but never enforced; an
  expired quote is still acceptable.
- Mobile proof upload uses `appendImage` — photo only. Web accepts PDF. A
  buyer with a bank PDF receipt cannot submit it from the app.
- The buyer sees `p.status` and `p.milestone` raw on mobile (`p.status` is
  rendered unlabelled), while the web has translated labels for both.
- `import_documents` marked `customer_visible` are returned to the buyer by
  the API and rendered by neither client.
- Mobile order detail has no shipment panel; the web does. A buyer on the
  app cannot see carrier, vessel or ETA.

## Structural gaps

Not bugs — whole capabilities that were never built. Each one is currently
absorbed by a human with a spreadsheet and a WhatsApp thread.

**No supplier entity.** `import_shipments.supplier_name` is a free-text
column. There is no suppliers table, no exporter verification, no
per-supplier performance history, no link between a supplier and the quotes
built from their prices. The single largest risk in a vehicle import
business — sending money to an exporter who does not ship — has no data
model at all.

**No shipment intelligence.** `import_shipments` holds `carrier`,
`vessel_or_flight`, `bill_of_lading` and `last_location` as strings an admin
types. Nothing validates a B/L, nothing polls a carrier or port, nothing
detects that an ETA has slipped, nothing alerts anyone.
`estimated_arrival` is a single column with no history — so "the ETA has
moved three times" is unanswerable.

**No cost model.** `actual_cost_rwf` is one integer and a free-text note.
There is no line-item structure, so the business cannot answer *which* leg
lost money — was it the FOB, the freight, the duty assessment or the
clearing agent? Quoting is therefore an act of memory, not of data.

**No quote intelligence.** Building a quote is three numbers typed into
three boxes in the admin list. There is no template, no reuse of a previous
quote for the same model, no duty pre-calculation feeding the form, no FX
provenance (`exchange_rate` is an optional free number), no margin target,
and no validation that the quote covers the cost.

**No landed-cost calculator wired to the catalogue.** The RRA calculator at
`/tools/import-duty` and the 233-model catalogue are entirely separate
systems. A buyer cannot pick a model and get a landed estimate on the web at
all, because the catalogue is not on the web.

**No catalogue on the web.** 233 models, each with make, model, body type,
fuel, origin and port — invisible to Google. This is the single biggest
missed growth asset in the repo. Every competitor's traffic comes from
exactly these pages.

**No web enquiry creation.** `importOrders.create` exists in
`web/src/lib/api.ts:363` and no page calls it. A buyer on a laptop cannot
start an import.

**No reminders, SLAs or ageing.** Nothing notices an enquiry sitting
unquoted for a week, a quote about to expire, a deposit due for ten days, or
an order stuck in `in_transit` past its ETA. The admin Action Center
surfaces a count of awaiting import money and nothing else.

**No structured buyer requirements.** The enquiry captures origin, make,
model, year and a free-text note. No budget range, no colour, no trim, no
must-have options, no timeline, no financing need, no attachment. So the
first operator action on every enquiry is a WhatsApp conversation to collect
what the form should have asked.

**No in-context messaging.** `person_conversations` exists (migration
`0041`) but imports do not use it. Every clarification happens off-platform,
which means the order record is not the record.

**No customs or regulatory workflow.** `customs_clearance` is a status with
nothing behind it. No declaration reference, no clearing agent record, no
assessed-vs-estimated duty reconciliation, no RSB/pre-shipment conformity,
no registration handover.

**No analytics.** The checklist's own "operational analytics: conversion,
cycle time, overdue stages and outstanding balances" line is unticked and
remains unbuilt. Nobody can currently answer what fraction of enquiries
convert, or how long an import takes.

## Industry and competitive analysis

> **Research note.** Live web search was unavailable in this session. What
> follows is drawn from domain knowledge of these platforms' long-established,
> publicly observable product patterns — reliable at the level of *what
> capability exists and why it matters*. Specific tax percentages, fee
> schedules and regulatory thresholds are deliberately **not** asserted
> here; every Rwanda figure in the roadmap is marked as requiring
> verification against RRA, RSB and Magerwa before it is built on.

### Direct competitors — Japanese/Korean used-vehicle exporters

**BE FORWARD, SBT Japan, TradeCarView, CarUsed.jp, AutoRec.** This is who a
Rwandan buyer is actually comparing you against. Their established pattern:

- **Destination-aware pricing.** You choose your country and port, and every
  price in the grid switches from FOB to CIF for *your* port. This is the
  defining feature. A buyer never has to ask what shipping costs.
- **Enormous SEO surface.** Tens of thousands of indexed stock pages, plus
  per-country regulation guides (age limits, inspection requirements,
  right-hand-drive rules, duty overviews). The regulation pages are pure
  organic acquisition.
- **Stock photography at volume** — 30 to 100 photographs of the actual
  unit, including undercarriage and engine bay, with damage maps.
- **Third-party inspection certificates** (JEVIC, EAA, QISJ) attached to the
  listing, with grade sheets.
- **Self-service tracking** keyed to a B/L or chassis number, with vessel
  name, departure, ETA and document dispatch status.
- **Multi-currency, multi-language** as standard — typically 10+ languages.
- **Auction-agent access** — bidding into USS/TAA/JU on the buyer's behalf,
  with live auction sheets translated.

Their weakness, and your opening: they are transactional and remote. They do
not clear customs in Kigali, do not register the vehicle, do not inspect on
arrival, and do not exist locally when something goes wrong.

### Auction and wholesale platforms

**Copart, IAAI, Manheim, ACV Auctions, Carvana.** Relevant for their
*condition-evidence* and *document* machinery:

- **Structured condition reports** — standardised, machine-comparable
  grading rather than prose. ACV's audio engine analysis and Manheim's AI
  damage detection from photos are the reference implementations.
- **VIN-decoded specification** as the spine of every record, with history
  joins (title, odometer, accident).
- **Title and document pipelines** — tracked as their own workflow with
  states, because a vehicle with no title is a vehicle that cannot be sold.
- **Arbitration windows** — a bounded, evidenced dispute process with clear
  rules about what is arbitrable.

### Freight, logistics and customs technology

**Flexport, Freightos, project44, FourKites, Expeditors, Zencargo.**

- **Quote comparison and instant quoting** — Freightos returns real rates in
  seconds by pre-indexing carrier rate sheets rather than asking a human.
- **Milestone-based shipment visibility** with predicted vs. actual ETA, and
  *exception alerting* when a milestone slips. project44 and FourKites exist
  almost entirely to do this one thing.
- **Document automation** — OCR and extraction from commercial invoices,
  packing lists and B/Ls, with automatic cross-document consistency checks.
- **Landed-cost engines** — HS-code classification driving duty, tax and fee
  calculation per destination, maintained as regulatory data.
- **Customs filing integration** — direct submission to the destination
  authority's system rather than a PDF handed to an agent.

### Cross-border payments

**Wise, Payoneer, Thunes, Onafriq (MFS Africa), Flutterwave.** Relevant
because your 50/50 milestone model is currently a bank transfer and a
photograph:

- **Deterministic reference codes** per transaction so reconciliation is
  automatic, not visual.
- **Bank-feed or API reconciliation** — matching an inbound credit to an
  invoice without a human comparing a screenshot to a statement.
- **FX rate locking with an expiry**, which is exactly what a quote
  denominated in RWF against a USD purchase needs.

### What this establishes as the table stakes

Across all four categories, the capabilities that recur — and that you do
not have — are: destination-aware landed pricing, structured condition
evidence, milestone visibility with exception alerting, document automation
with cross-checking, automated payment reconciliation, and an indexed public
catalogue.

## Gap matrix

Scored against the capability set the industry has established. ● built ·
◐ partial · ○ absent.

| Capability | Us | Note |
|---|---|---|
| Public, indexed model catalogue | ○ | 233 models, mobile-only, zero SEO surface |
| Destination-aware landed pricing | ◐ | Duty engine is good; not wired to the catalogue, absent on web |
| Structured buyer requirements at enquiry | ○ | Origin, make, model, year, free text |
| Quote templates / reuse / duty pre-fill | ○ | Three number boxes typed by hand |
| FX provenance and rate locking | ○ | `exchange_rate` is an optional free number |
| Versioned agreement + e-acceptance | ● | Best-in-class here |
| Numbered, hashed official documents | ● | Better than most competitors |
| Buyer-visible payment instructions | ○ | **The critical hole** |
| Payment reconciliation | ○ | An admin eyeballs a photograph against a statement |
| Refunds / adjustments / cancellation | ○ | Schema allows it; no code writes it |
| Supplier records and verification | ○ | One free-text column |
| Pre-shipment inspection evidence | ○ | A status name, no artefact |
| Shipment milestone tracking | ◐ | Fields exist; typed by hand, no history, no validation |
| ETA history and delay alerting | ○ | One column, overwritten |
| Carrier / port integration | ○ | — |
| Document OCR and cross-checking | ○ | — |
| Customs declaration workflow | ○ | A status with nothing behind it |
| Arrival inspection → 150-point reuse | ○ | The checklist engine exists and is not reused here |
| In-context buyer–operator messaging | ○ | `person_conversations` exists, imports do not use it |
| Reminders, SLAs, ageing, escalation | ○ | — |
| Operational analytics | ○ | One count in the Action Center |
| Multi-language funnel | ○ | 6 languages shipped, funnel is English-only |
| Audit trail | ● | Append-only, dual-visibility, admin-audit on top |
| Cost / margin separation | ◐ | Correct and enforced, but one integer with no line items |
| Automated tests | ◐ | 4 tests covering privacy, checkpoints and cost; no transition coverage |

The shape of this is clear: **the record-keeping and evidence layers are
strong; the acquisition, intelligence, automation and operations layers are
close to empty.**

## UX and workflow recommendations

### The buyer's journey, as it should read

The current journey is: *browse → tap request → wait → get a number →
accept → be confused about where to pay*. The target is a journey where the
buyer always knows three things: what it will cost, where the car is, and
what happens next.

**1. Discovery.** Put the catalogue on the web. `/imports`,
`/imports/[make]`, `/imports/[make]/[model]` — server-rendered, in the
sitemap, with structured data. Add per-origin guides ("Importing from Japan
to Rwanda") which are the highest-intent organic traffic in this category.
Mirror the mobile brand → model → detail flow.

**2. Estimate before enquiry.** Every model page carries a landed-cost
estimator pre-filled with that model's engine size and origin, using the
existing duty engine. Let the buyer move a budget slider and see what it
buys. Label every figure as an estimate with the `reviewed_on` date already
in the rate payload. This converts browsers into enquiries and is the
single highest-leverage UX change available.

**3. A real enquiry form.** Replace the free-text note with structure:
budget range, colour preference, must-have options, target month, financing
needed (yes/no), trade-in (yes/no), intended use. Multi-step, one question
per screen on mobile, with progress. This is the difference between an
operator starting with a WhatsApp interrogation and starting with a quote.

**4. An order page that answers "what now?".** Today the buyer sees a
status pill and a timeline. It should lead with a single **next action**
card: *"Pay 12,500,000 RWF to — account details — using reference
IMP-2026-A3F1, then upload your receipt."* Bank instructions, the reference
to quote, and the upload in one place. Below that: a visual milestone
tracker (not a reverse-chronological log), the shipment panel, and the
document shelf.

**5. A document shelf on both clients.** `generated_documents` and
customer-visible `import_documents` are already in the payload. Render them.
A buyer should be able to download their quotation, agreement, deposit
invoice and receipts without asking.

**6. Mobile parity.** Shipment panel, documents, PDF upload for proof,
per-payment reference fields, and the full funnel translated into all six
languages.

### The operator's console

The admin list is a good triage surface with one weakness: the quote
builder is three unlabelled numeric inputs inline in a list row, and issuing
a quote does not generate the document pack — that is a separate button on a
separate page. An operator can therefore quote a buyer and leave them with
no invoice.

- **Quote builder as its own workspace**: cost lines on the left, duty
  auto-calculated from the model and origin, margin shown live against
  target, FX rate stamped with its source and timestamp, and the document
  pack generated on issue rather than as an afterthought.
- **Work queues instead of a status filter**: "needs quoting", "awaiting
  deposit >7 days", "ETA slipped", "proof awaiting review", "quote
  expiring". Ageing badges on everything.
- **Bulk shipment update** for the common case of several orders on one
  vessel.
- **A margin dashboard** — per order, per model, per origin, per supplier.

## Automation and intelligence opportunities

Ranked by payoff over effort. The first four need no model at all — resist
the urge to start with the AI.

### Tier 1 — deterministic automation, high payoff, low effort

**Landed-cost pre-calculation on every quote.** The duty engine already
exists. Feeding model + origin + engine size into it and pre-filling the
quote form removes the largest source of operator error and the largest
source of quoting delay.

**Deterministic payment references.** Issue each milestone a unique
reference derived from the order ref (`IMP-2026-A3F1-D1`). Display it in the
pay-now card, print it on the invoice, require it on the proof form. This
alone turns reconciliation from *compare a photo to a statement* into
*match a string*, and is the prerequisite for any later bank-feed
automation.

**Ageing, SLAs and reminder jobs.** Enquiry unquoted >48h, quote expiring in
3 days, deposit due >7 days, ETA passed with no arrival. Each one an email
plus a push plus an operator queue badge. The push infrastructure is already
built and waiting on credentials.

**Quote-expiry enforcement.** `quote_expires_at` exists. Expire the
agreement, block acceptance, notify both sides, offer a re-quote.

### Tier 2 — data and integration

**Document OCR on payment proof.** Extract amount, date, reference and
beneficiary from the uploaded receipt and pre-fill the reviewer's screen
with a match/mismatch verdict against the expected milestone amount and
reference. The operator still decides — this is decision support, not
automation of the decision. Meaningfully reduces fraud risk and review time.

**Supplier document extraction.** Commercial invoice, export certificate,
B/L — pull chassis number, engine number, year, CC, FOB value, and
cross-check them against the order and against each other. A mismatch
between the B/L chassis and the invoice chassis is the single most common
import failure and is entirely machine-detectable.

**Shipment tracking integration.** Start with a scheduled scrape/API against
the two or three carriers that actually serve Mombasa and Dar es Salaam,
keyed on B/L. Persist an ETA *history* table so slippage is visible and
alertable.

**FX rate stamping with provenance and lock.** Record source, timestamp and
rate on every quote; lock it for the quote validity window.

### Tier 3 — genuine AI, where it earns its place

**Enquiry → specification assistant.** A buyer describes what they want in
Kinyarwanda ("a strong car for Nyungwe roads, family of six, under 25
million") and the system proposes three catalogue models with landed
estimates and a comparison. This is the feature that makes the product feel
unlike a form, and it plays directly to a market where many buyers do not
know model names.

**Landed-cost prediction from history.** Once 50+ completed orders exist,
predict actual landed cost per model/origin from your own outcomes rather
than from a formula, and warn the operator when a quote deviates from the
predicted band.

**Anomaly detection on quotes and payments.** Flag a quote below cost, a
margin outside its historical band, a proof whose amount does not match, a
supplier whose delivery times are drifting.

**Arrival condition assessment.** Photos from the Kigali arrival inspection
scored for damage and compared against the pre-shipment set — the
ACV/Manheim pattern. This is also the natural place to reuse the existing
150-point checklist engine.

**Multilingual operator assist.** Draft the buyer-facing status update in
the buyer's language; the operator approves. Six languages are already
shipped; the bottleneck is writing in them.

### What not to automate

Payment verification, the decision to publish, and anything that would make
Sawa look like a party to the deal. Keep the human checkpoint on money.

## Capabilities to build

### Data model additions

| Table | Why |
|---|---|
| `import_suppliers` | Exporter identity, country, verification status, documents, contact, bank details, active flag |
| `import_supplier_performance` | Orders, on-time rate, defect rate, average days to ship — derived, per supplier |
| `import_order_costs` | Line-item cost ledger (FOB, freight, insurance, duty, clearing, transport, other) replacing the single `actual_cost_rwf` integer, which becomes a derived sum |
| `import_shipment_events` | ETA history and milestone log, so slippage is visible; `import_shipments` keeps current state |
| `import_quote_templates` | Per model+origin cost baselines for reuse |
| `import_customs_declarations` | Declaration reference, clearing agent, assessed duty, assessed vs. estimated variance, release date |
| `import_arrival_inspections` | Links an arriving vehicle to the existing 150-point checklist engine |
| `import_enquiry_requirements` | Structured budget, colour, options, timeline, financing, trade-in |
| `import_fx_stamps` | Rate, source, timestamp, locked-until, per quote |

### Tracking and communication

- Milestone tracker UI driven by the existing `import_order_events`, not a
  new system.
- ETA history with variance, surfaced to both buyer and operator.
- Wire imports into `person_conversations` so clarification lives on the
  order.
- Push notifications per milestone — the code path exists and is waiting on
  APNs/FCM credentials.
- WhatsApp is how Rwanda actually communicates. Treat a WhatsApp
  notification channel as a first-class requirement, not a nice-to-have, and
  keep the *record* in-platform.

### Payment capabilities

- Per-milestone deterministic references (prerequisite for everything
  else).
- Bank instructions rendered in-product from configuration — closes the P0
  hole.
- Mobile money for the deposit. In Rwanda this is not optional for anything
  under a few million francs.
- Adjustment and refund milestones actually implemented, with the same
  two-checkpoint review.
- Partial payments and a running balance — the current model assumes each
  milestone is paid in one transfer, which is not how large sums move here.
- Optional third-milestone split (deposit / shipping / balance) for
  higher-value orders.

> **Constraint to respect.** None of this means holding funds. Sawa is not a
> party to the deal, `payments_enabled` is locked false, and a
> percentage-of-sale commission is a retired concept. Payment capability
> here means *instructing, referencing, reconciling and evidencing*
> transfers that happen between the buyer and the bank — never custody. A
> mobile-money integration must be designed as a payment *instruction and
> confirmation* rail, not a wallet.

### Logistics

- Carrier and B/L validation at entry.
- Vessel and port ETA polling for Mombasa and Dar es Salaam.
- The inland leg — Mombasa/Dar to Kigali is where most delay actually
  happens, and it is currently invisible in the data model.
- Consolidation: several orders on one vessel, updated together.
- Bonded warehouse / Magerwa status as a tracked stage.

### Documentation

- Buyer-facing document shelf on both clients.
- Required-document checklist per stage, with completeness blocking
  advancement.
- Cross-document consistency checks (chassis, engine number, year, value).
- Document expiry tracking where relevant.
- Registration handover pack at completion.

## Scalability, reliability, security and operations

### Scale

Current volumes are small enough that none of this hurts yet, but each
will:

- `GET /imports/admin/all` selects `o.*` with a correlated payment
  subquery, `LIMIT 200`, no pagination and no cursor. It becomes the admin
  console's bottleneck.
- `fullOrder()` issues six queries per order detail view. Fine now; worth
  consolidating before the pipeline is busy.
- The catalogue endpoint caps at 250 rows with `LIMIT/OFFSET`. At 233
  models it fits by one row. The next 20 models break the "one page per
  brand" guarantee the code comments rely on.
- There is no caching on the catalogue at all — a fully public, rarely-
  changing dataset queried on every app launch.
- No index on `import_orders(assigned_admin_id)`, which every
  operator-scoped queue will need.

### Reliability

- The render-resolution and image-search admin routes hold an HTTP request
  open across dozens of sequential upstream calls. They are bounded and
  resumable, which is thoughtful, but this pattern belongs in a job queue —
  and a job queue is the same thing reminders, OCR and carrier polling will
  all need. **Introducing one background-job mechanism unlocks four
  separate roadmap items.**
- No retry or dead-letter handling for notification failures;
  `sendImportUpdate` is fire-and-forget by design, which is right for email
  and wrong for a payment-verified notice.
- `import_shipments` upsert uses `COALESCE(EXCLUDED.x, existing)` — so a
  field can be set but never cleared. Correcting a wrong bill of lading to
  empty is impossible.

### Security

- **Rate limiting** — add `/imports` to `writeLimiter` (see defects).
- **Document access** is correctly gated, but `GET /documents/:documentId/file`
  uses `res.sendFile(path.join(UPLOAD_DIR, file_url))` where `file_url` is a
  database string. It is written only by a controlled code path today; a
  path-traversal guard belongs there regardless, because the cost of being
  wrong is reading arbitrary files off the volume.
- **Bank detail changes** should be a two-person action with its own audit
  event. The checklist already calls for this and it is unbuilt. Changing a
  bank account is the highest-value attack against an import business.
- **Proof uploads** are magic-byte checked for PDF/image, which is good.
  Consider size limits per order and a virus scan before an operator opens
  them.
- **PII** — the passport/ID numbers that customs work will require are not
  yet in this model. Decide on retention and encryption *before* they
  arrive, not after.
- The `vehicles` table from migration `0043` already carries `vin_masked`
  and a masking discipline. Import orders have a raw `vin` column with no
  masking. Unify these.

### Operations

- Runbook for a stuck order, a rejected payment, a supplier failure, a
  customs hold.
- Reconciliation report: verified payments vs. bank statement, per period.
- Per-operator workload and response-time metrics.
- A defined escalation path when an import goes wrong — currently there is
  no dispute or exception workflow of any kind, and `/disputes` is a
  retired route.

## Rwanda-specific requirements

This is where a generic import platform loses and a local one wins. Every
item here is something BE FORWARD structurally cannot do.

### Regulatory

> Each figure below must be **verified against the current RRA, RSB and
> MINICOM instruments before it is built on.** The existing code is already
> careful about this — `FALLBACK_DUTY_RATES` carries a `reviewed_on` date
> and the rates are served as data. Extend that discipline; do not hardcode
> a new number anywhere.

- **Duty schedule maintenance** — who reviews the rates, how often, and how
  a change is recorded. Today `reviewed_on` is a string in a fallback
  constant. It should be an owned, dated, auditable operational process with
  a named reviewer.
- **Vehicle age rules** — Rwanda applies age-based treatment to used
  imports. The catalogue is brand-new only today, which sidesteps this; the
  moment used stock is added, age rules become load-bearing and the
  depreciation bands in the duty engine need re-verification.
- **Electric and hybrid incentives** — Rwanda has actively promoted EV
  adoption with tax treatment that differs from ICE vehicles. The catalogue
  already carries `fuel_types` including Electric. Modelling this correctly
  is both a compliance requirement and a marketing asset: *"this EV costs X
  less to import than the equivalent petrol"* is a compelling, true,
  locally-specific claim.
- **Pre-shipment conformity (RSB)** — verification of conformity
  requirements for imported goods need to be represented as a document
  stage with evidence, not assumed.
- **Magerwa / bonded warehouse** — a real, trackable stage between arrival
  and release that the current 17-state pipeline collapses into
  `customs_clearance`.
- **Registration and plates** — the handover is not complete when the
  vehicle leaves the yard; it is complete when it is registered.
  `ready_for_handover → completed` skips the part the buyer cares most
  about.
- **EAC transit** — Rwanda is landlocked. Every vehicle transits Kenya or
  Tanzania under a transit regime, and that leg is entirely absent from the
  data model.

### Payments and money

- **Mobile money (MTN MoMo, Airtel Money)** is the default payment
  instrument in Rwanda. A 50% deposit on a 30M RWF vehicle exceeds mobile
  money limits, but deposits, fees and adjustments do not. Supporting it for
  anything under the limit removes real friction.
- **RWF is canonical, USD is the trade currency.** The FX exposure between
  quoting in RWF and paying an exporter in USD is currently unmanaged and
  unrecorded. On a 30M RWF order, a 5% adverse move is 1.5M RWF of margin.
  This needs rate stamping, a validity window, and a documented policy on
  who bears the movement.
- **Bank transfer friction** — international wires from Rwanda involve
  documentation requirements buyers do not anticipate. The product should
  tell them what their bank will ask for *before* they go to the branch.

### Language, connectivity and trust

- **Kinyarwanda first in the funnel**, not just in the order screens. This
  is the single clearest signal that the product is for Rwandans, and it is
  currently absent from exactly the screens where it matters.
- **Offline resilience** — the bundled catalogue fallback is genuinely
  excellent and the right instinct. Extend it: an order detail should render
  from cache on a bad connection.
- **Data cost awareness** — image sizes and payload weight matter more here
  than the code currently assumes.
- **WhatsApp** is the communication default. Fighting it loses; integrating
  it wins.
- **Trust is physical.** Diaspora remittance-funded purchases are a real and
  substantial segment — someone abroad buying for family in Kigali. That is
  a distinct persona with distinct needs (a payer who is not the recipient,
  documents sent to two places, handover to a nominee) and the data model
  has no concept of it.

### The local advantage to press

A buyer importing through BE FORWARD is alone at Mombasa. Physical presence
in Kigali — arrival inspection, customs handling, registration, a person to
call — is the product. The software should make that presence *legible*:
show the inspection, show the clearing agent, show the registration
progress. That is not a feature competitors are slow to copy; it is one they
cannot copy.

## Where this can win

Three defensible positions, in order of how hard they are to copy.

**1. Total landed cost, honestly, before commitment.** Nobody serving this
market does this well. BE FORWARD quotes CIF and leaves Rwandan duty,
clearing, transit and registration as the buyer's problem — which is most of
the surprise and all of the anxiety. A calculator that shows the *complete*
Kigali-on-the-road number, with every line explained and the review date
stated, is both genuinely useful and a strong organic-traffic asset. You
already have the duty engine and the discipline not to invent figures. This
is mostly a matter of wiring what exists and putting it on the web.

**2. The physical last mile, made visible.** Arrival inspection against the
existing 150-point checklist, customs handling, registration, handover —
each one a stage with evidence a buyer can see. This converts your largest
cost (being physically present) into your largest differentiator. A remote
exporter cannot match it at any price.

**3. The verified-classifieds flywheel.** An imported vehicle that arrives,
gets inspected against the 150-point checklist and gets registered is a
vehicle with a complete, platform-owned provenance record from factory to
Kigali. When it is resold three years later, that record is worth something
to the next buyer — and it lives on your platform. No competitor in either
direction can assemble that. This is the strategic asset, and it costs
almost nothing extra because the inspection engine already exists.

**A note on what not to chase.** The temptation with imports is always to
move toward holding money — escrow, milestone custody, guarantees — because
it feels like it solves trust. It is also exactly what the project has
deliberately, repeatedly retired, and what the mobile app is still
accidentally advertising. Trust here should be built from *evidence and
visibility*, which are cheaper, more honest, and do not make you a financial
institution.

## Prioritized roadmap

Sizes are rough and assume the existing patterns in this repo. Each phase is
independently shippable and leaves the module better than it found it.

### Phase 0 — Stop the bleeding · days

Nothing else should start before this lands.

1. Remove the escrow-guarantee copy from all three mobile screens. **This
   one is urgent enough to do today, separately from everything else.**
2. Render bank payment instructions in the buyer's order, web and mobile,
   from the existing configuration.
3. Surface `generated_documents` and customer-visible `import_documents` on
   both clients — the data is already in the payload.
4. Add `/imports` to `writeLimiter`.
5. Route the payment routes through `STATUS_TRANSITIONS`, and gate
   `final_50` proof on the order having reached `balance_due`.
6. Path-traversal guard on the document file route.

*Unlocks: the module stops making claims it cannot honour, and a buyer can
actually pay.*

### Phase 1 — Complete the loop · 2–3 weeks

7. Buyer-initiated cancellation, plus `adjustment` and `refund` milestones
   with the existing two-checkpoint review.
8. Quote-expiry enforcement.
9. Structured enquiry requirements (budget, colour, options, timeline,
   financing).
10. Enquiry creation on the web.
11. Full i18n of the mobile import funnel.
12. Mobile parity: shipment panel, document shelf, PDF proof upload,
    per-payment reference fields.
13. Deterministic per-milestone payment references.

*Unlocks: an import can complete, be cancelled, or be corrected without an
operator writing SQL.*

### Phase 2 — Acquisition · 3–4 weeks

14. The catalogue on the web: `/imports`, `/imports/[make]`,
    `/imports/[make]/[model]`, sitemap, structured data.
15. Landed-cost estimator on every model page, wired to the existing duty
    engine, with the freight fix.
16. Per-origin import guides ("Importing from Japan to Rwanda").
17. Model comparison.

*Unlocks: the 233-model catalogue becomes an acquisition asset instead of a
mobile-only curiosity. Expect this to be the largest single change in
enquiry volume.*

### Phase 3 — Operations · 4–6 weeks

18. A background job mechanism — the enabling dependency for 19, 24, 26 and
    the existing catalogue jobs.
19. Ageing, SLAs, reminders and escalation.
20. Operator work queues replacing the status filter.
21. Quote builder as its own workspace, with duty pre-fill, live margin and
    the document pack generated on issue.
22. Line-item cost ledger replacing the single integer.
23. Supplier records with verification and derived performance.
24. Operational analytics: conversion, cycle time, stage ageing, outstanding
    balances, margin by model/origin/supplier.

*Unlocks: the business can see itself. Nothing in Phase 4+ is worth building
before this, because you cannot tune what you cannot measure.*

### Phase 4 — Intelligence · 6–8 weeks

25. OCR on payment proof, as reviewer decision support.
26. Supplier document extraction and cross-document consistency checks.
27. Shipment tracking integration and ETA history with delay alerting.
28. FX stamping, provenance and rate locking.
29. Customs declaration workflow with assessed-vs-estimated reconciliation.
30. Arrival inspection reusing the 150-point checklist engine.

*Unlocks: the operator stops being the integration layer.*

### Phase 5 — Differentiation · ongoing

31. Kinyarwanda enquiry assistant (describe what you need → three models
    with landed estimates).
32. Landed-cost prediction from your own completed orders.
33. Anomaly detection on quotes, margins and payments.
34. The provenance record: factory → import → inspection → registration →
    resale, as a platform-owned asset.
35. Diaspora buyer flow (payer ≠ recipient).

### Sequencing logic

Phase 0 is non-negotiable and fast. Phase 1 makes the module correct.
**Phase 2 is where I would put the money** — it is the highest return per
week of work in the entire list, because the catalogue already exists and
is simply invisible. Phase 3 before Phase 4 because analytics tells you
which Phase 4 item actually matters. Phase 5 only once there is enough
completed-order history for the intelligence to be real rather than
decorative.

## Open questions

These change what gets built, so they are worth answering before Phase 1.

1. **Is the catalogue brand-new only, permanently?** Used imports are the
   larger Rwandan market by volume, but they bring age rules, condition
   evidence, auction sourcing and odometer verification — a substantially
   bigger build. Migration `0045` deliberately chose brand-new. Is that
   strategy or a staging post?

2. **Who bears FX movement between quote and payment?** Today the quote is
   RWF and the exporter is paid USD, with no rate lock and no stated policy.
   Someone is carrying this risk; currently it is Sawa, silently.

3. **Does Sawa hold an import licence and clear in its own name, or act
   purely as an agent?** This determines whether the customs workflow
   tracks *your* declaration or a third party's, and whether a clearing
   agent is a supplier record or an internal role.

4. **Mobile money for deposits — in or out?** It is the Rwandan default and
   a clear friction reduction, but it sits near the payments boundary the
   project has deliberately locked. My reading is that an
   instruction-and-confirmation rail stays on the right side of that line,
   but it is your call and it should be explicit.

5. **Is the 50/50 split fixed?** The schema permits `adjustment` and the
   code hardcodes two milestones. A deposit/shipping/balance three-way split
   is common at higher values.

6. **How much can be automated before it stops feeling like a person is
   handling your import?** For a high-anxiety, high-value,
   relationship-driven purchase in this market, some human touch is the
   product rather than a cost. Worth deciding deliberately rather than by
   default.
