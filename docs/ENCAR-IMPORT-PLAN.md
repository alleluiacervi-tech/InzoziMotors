# Korean imports from Encar: plan

Status: **plan, not started.** Written 1 Oct 2026. Tasks are in
[`ENCAR-IMPORT-TODO.md`](ENCAR-IMPORT-TODO.md); tick them in the PR that ships
them. Decision IDs (E#) and architecture IDs (A#) are referred to from there.

## 1. Goal

A buyer in Rwanda can search every suitable used car for sale in South Korea,
open any one of them with all its photos, its Korean inspection report and its
insurance accident record, see an honest estimate of what it costs landed in
Kigali, and request it. The request becomes an ordinary import order and runs
through the process that already exists (quote → agreement → 50/50 payments
evidenced by bank-transfer proof → Kigali inspection → customs → handover).

It must do this without slowing the API, without the database or backups
growing with the size of the Korean market, and on the website and in the app
alike.

## 2. Principles

1. **Our database is a mirror of what is for sale now, not an archive.** A car
   that is sold is deleted the same day. The provider keeps the archive
   (Business plan); we keep only what an order needs.
2. **Users never wait on the provider.** Search reads our tables. The provider
   is called by a background worker, and by the API only for one car's
   inspection and accident detail, cached for 24 hours.
3. **Store only what is shown.** A list row is about half a kilobyte. Detail
   that only one screen reads is fetched on demand, not mirrored.
4. **Photos are never copied in bulk.** About 4 million photos (~600 GB) exist
   at any moment. We store their addresses. Only a car somebody orders has its
   photos copied, to Cloudinary, as evidence of what was agreed.
5. **Nothing a client can see carries the key, a plate, a full VIN or the Korean
   dealer's contact.** Public payloads use an allow-list, as `cars.js` does.
6. **An Encar car is never "Sawa Certified".** Its report is the Korean
   inspection, labelled as such. Ours happens in Kigali, as today.
7. **Money: estimates are labelled estimates.** The quote stays the only
   binding figure. Won are converted at the live rate; francs stay canonical.
8. **Nothing in the existing import order flow changes** except how an order
   starts. The direct-deal rule is unaffected: imports are the one flow Sawa
   runs, and it still holds no funds.
9. **Every step can be switched off without a deploy** (settings flags), and
   the rest of the product keeps working if the provider disappears.

## 3. What exists today (audited 1 Oct 2026)

- `global_import_catalog`: ~233 brand-new **models** (migration 0045), no real
  cars, prices or photos. Browsed brand → model.
  `backend/src/routes/imports.js` serves `/imports/catalog*`.
- The app bundles its own copy (`src/data/importCatalog.js`,
  `src/hooks/useImportCatalog.js`), and its search "Import Direct" tab searches
  that copy offline. Screens: `ImportBrandsScreen`, `ImportBrandModelsScreen`,
  `ImportVehicleDetailScreen`, `ImportCarCard`, a Home rail.
- Website: `/imports` (catalogue, duty estimate, request form).
- Admin: Imports orders, catalogue imagery (studio renders, official photos).
- Order pipeline: `import_orders` + payments, documents, events, agreements,
  shipments (0015, 0039). `specification JSONB` already exists on orders.
- FX: `lib/fx.js` handles USD→RWF only. Duty: `lib/duty-rates.js` already
  applies the EAC age allowance, which matters for used cars.
- No scheduler anywhere, deliberately. Backups are a full `pg_dump`.

## 4. The provider (encarapi.com), what the documentation guarantees

| Fact | Consequence |
|---|---|
| ~198k live Encar listings; K Car and KB Chachacha optional (beta) | Encar only at first (E6) |
| `GET /api/catalog/export`: full CSV, regenerated daily, does not count against the cap | Baseline, and weekly drift repair |
| `GET /api/catalog/changes?cursor=`: added / updated (`changedFields`) / reappeared / removed; monotonic cursor, lossless; up to 50k events per call | The only thing the worker reads in steady state |
| `IsDuplicate`, `DuplicateOf` | Copies are never stored |
| `GET /api/vehicle/{id}`, `/api/inspection/{id}`, `/api/record/{id}`; bulk versions take 500 ids | On-demand detail, cached 24 h |
| `POST /api/vehicle/{id}/refresh`: 100/day on Business, re-collected within ~2 h | Admin-only, before a quote |
| Price in 만원 (×10,000 KRW); `Year` as YYYYMM; mileage km; `Photos[].location` | Normaliser rules |
| Business €199/month: 60 req/min, 12 GB traffic/month, export + changes + bulk | Required plan (E1) |
| They recommend serving from your own database; detail cache 24 h, listings 4–6 h | Matches A2 |

**Not in the documentation, must be verified in Phase 0:** where photo
addresses point and whether photo views count against the 12 GB; whether the
image host can serve small sizes; the export's real size; rate-limit headers;
the licence to store data and display photos (no terms are published).

## 5. Architecture decisions

**A1 — Provider client.** `backend/src/lib/encar/client.js`: one place that
knows the base URL and the `x-api-key` header; a token-bucket limiter under
60/min shared by worker and API; timeouts; retry with backoff on 429/5xx;
response-size guard. The key comes from `ENCAR_API_KEY` on the server only, is
added to the log redaction list (`x-api-key`, `api_key`), and is never sent to
or built into a client.

**A2 — Mirror, not live search.** Baseline from the export once; then the
change feed every 10 minutes. Weekly, the export is compared with our table to
repair any drift (it costs nothing against the cap). Search and listing pages
never call the provider.

**A3 — A separate worker.** A `sawa-encar-sync` service in
`docker-compose.prod.yml`, same image as the API, running
`node src/workers/encar-sync.js`: an in-process loop, not cron, holding a
Postgres advisory lock so only one copy ever runs. Its own small connection
pool (2). The API is unaffected if it stalls or crashes.

**A4 — Ingest rules decide what is stored.** Kept in `platform_settings`
(`encar_ingest_rules`, admin-editable): exclude duplicates, placeholder prices,
listings without photos, LPG/CNG/hydrogen fuels, and lease/rental (the change
feed's default `sell_type`). Optional ceilings for age and mileage (E4).
Changing the rules re-applies them from the next export.

**A5 — Tables (one migration).**

| Table | Holds | Size |
|---|---|---|
| `encar_listings` | One row per car for sale: id (provider id), make, model, badge (English, plus Korean model name for search), year, month, mileage, fuel, transmission, category, colour, seats, power, price in 만원, estimated Kigali price in RWF, cover photo, photo paths (`text[]`, host stripped), photo count, first seen, last changed | ~0.5 KB/car, ~150k cars, **~100–200 MB with indexes** |
| `encar_detail_cache` | Detail, inspection and record payloads for cars someone opened; `expires_at` 24 h, purged hourly | Tens of MB, bounded by traffic |
| `encar_sync_state` | Cursor, `since`, last success, last error | One row |
| `encar_sync_runs` | One row per run with counts; kept 30 days | Tiny |

`import_orders` gains `encar_listing_id` and a `source` column; the frozen
snapshot of the car goes in the existing `specification`. The order's photos
are copied to Cloudinary under `imports/<order id>` (private folder, served
through the owner-checked route).

Indexes: (make, model, year), price, mileage, first seen; `pg_trgm` on
make/model/badge text. `fillfactor 90`. Updates are written only when a shown
field changed (`changedFields` plus an `IS DISTINCT FROM` guard).

**A6 — Never grows past what is for sale.** "removed" deletes the row. A
reappeared car is inserted again. The admin panel shows count and table size,
and the worker refuses to insert past a configured ceiling (default 250k
rows) and raises an alert instead.

**A7 — Backups stay the same size.** `ops/backup.sh` adds
`--exclude-table-data='encar_*'`. The tables are rebuilt from one export after
a restore; the restore runbook says so.

**A8 — Photos.** Paths are stored without the host; a server helper builds the
URL for the size a screen needs. Option chosen after the Phase 0 spike (E3):
- (a) the image host serves resized images → cards use small, detail large;
- (b) it does not → cover thumbnails go through Cloudinary *fetch* with
  `f_auto,q_auto,w_400` (only covers that are viewed are ever transformed);
  the gallery loads originals lazily as the user swipes.
Neither stores the 600 GB. If photo views count against the provider's traffic,
we stop and decide the plan (E1) before going further.

**A9 — Landed-cost estimate.** `lib/landed-cost.js`: price ×10,000 KRW →
USD/RWF (`fx.js` gains KRW), + Korean export costs, freight and insurance by
category, + Rwandan duty from `duty-rates.js` using the car's age, + clearance,
+ Sawa's service fee. Cost inputs live in the rate card (`service_rates`),
editable by an admin, with `reviewed_on`. The estimate is computed in batch
(after each sync, and when FX or the inputs change), stored on the row, and
always shown as "estimate".

**A10 — Public API.** All under `/imports/korea`:
- `GET /imports/korea`: filters (make, model, year, price, mileage, fuel,
  transmission, category), sort, **cursor** pagination, 24 per page, about 15
  fields per car. `Cache-Control: public, max-age=300`.
- `GET /imports/korea/facets`: counts per make/model/fuel, cached 10 min.
- `GET /imports/korea/:id`: the row, plus detail/inspection/record from the
  cache (fetched on a miss). Allow-listed: no plate, VIN masked to the last six,
  no dealer name or phone, no seller description containing contact details.
- `POST /imports` accepts `encar_listing_id`; the server builds the snapshot
  itself and never trusts one sent by a client.
- Admin: `POST /admin/encar/:id/refresh`, `GET /admin/encar/status`,
  `PATCH /admin/encar/rules`.
Public routes are rate-limited like the rest of the API.

**A11 — Clients (parity).** Website `/imports` becomes a results grid with
filters in the URL; `/imports/[id]` is the detail page (`noindex`, since
listings expire); indexed landing pages per make/model ("Used Kia Sorento from
Korea") give SEO without indexing perishable pages. The app gets the same two
screens, replacing brand → model; the bundled catalogue copy is deleted. The
app changes are JavaScript only and ship over the air. Six languages.

**A12 — Freshness.** The change feed removes a sold car within ~10 minutes, so
opening a car does not need a live check. Before quoting, an admin presses
Refresh (provider allowance 100/day). The order page shows when the data was
last collected.

**A13 — Kill switches.** `encar_sync_enabled` (worker idles) and
`encar_catalog_public` (routes answer as if empty; clients show the request
form). The website and app work unchanged with both off.

## 6. Storage and traffic budget

| Item | Budget | Guard |
|---|---|---|
| `encar_listings` + indexes | ≤ 300 MB | Row ceiling (A6), admin card |
| `encar_detail_cache` | ≤ 100 MB | 24 h expiry, hourly purge |
| Backups | +0 | Excluded (A7) |
| Server disk for photos | 0 | Never written (A8) |
| Cloudinary | ~5–10 MB per order | Only on order |
| Provider traffic | < 12 GB/month | Logged per run; alert at 70% |
| Provider requests | < 60/min | Shared limiter (A1) |

## 7. Phases

| Phase | Outcome | Exit criteria | Estimate |
|---|---|---|---|
| **0. Decide and verify** | Terms in writing, exporter, costs, spike report | E1–E8 answered; spike numbers recorded in §9 | 2–3 days, mostly yours |
| **1. Data foundation** | Mirror in sync on production, invisible to users | 7 days in sync; drift check finds nothing; size within §6 | 4–5 days |
| **2. API and pricing** | Search, facets, detail, estimate, admin status | p95 search < 150 ms on 150k rows; payload tests green | 2–3 days |
| **3. Website** | `/imports` grid and detail, request from a listing | Playwright: search → detail → request | 3–4 days |
| **4. App** | Same screens, over the air | Device checklist in §10 passed | 3–4 days |
| **5. Orders and admin** | Snapshot, photo copy, refresh, order page | One real order run end to end with the exporter | 2–3 days |
| **6. Retire the old catalogue** | Brand → model, renders, bundled copy removed | Nothing reads `global_import_catalog` except history | 1 day |

Phases 3 and 4 can run in parallel. Each phase is its own PR, merged in order;
Phase 1 merges with `encar_catalog_public` off, so it is safe to deploy early.

## 8. Testing

- **Unit, no network:** normaliser (만원, YYYYMM, Korean → English, fuel and
  category mapping), ingest rules, landed cost, the public allow-list. Fixtures
  are real responses captured during the trial, with plates and contacts
  removed.
- **Sync, against Postgres with a mocked client:** baseline; added, updated,
  reappeared, removed; duplicates skipped; no-op updates write nothing; resume
  from cursor after a crash; ceiling respected; two workers cannot both run.
- **API:** filters, cursor pagination, cache headers, 404 for a removed car,
  key never appears in any response or log line.
- **Load:** 150k synthetic rows; search p95 < 150 ms, facets < 300 ms.
- **E2E:** Playwright on the website; device checklist for the app.
- **Contract check:** a weekly CI job (no secrets in PRs) calls the provider's
  `openapi.json` and fails if a field we read disappears.

## 9. Spike results (fill in during Phase 0)

| Question | Answer |
|---|---|
| Photo host and URL format | |
| Photo views count against provider traffic? | |
| Resized images available? Parameters? | |
| Export file size; rows | |
| Rows left after ingest rules | |
| Typical photos per car | |
| Change-feed events per day | |
| Rate-limit headers returned | |
| Licence: store data / show photos (in writing) | |

## 10. App device checklist (Phase 4)

Search on 3G-throttled Android; scroll 300 results; open a car with 30
photos; airplane mode shows last results; Kinyarwanda end to end; request a
car signed out → sign in → request completes.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Provider is a reseller of scraped data and is cut off | Kill switch (A13); request form keeps working; no data we depend on is only theirs once an order exists (snapshot + photos) |
| Photo traffic counts against the 12 GB | Found in the spike before any build; decide plan or hosting then |
| Listings sell before we quote | Refresh before quote (A12); quote validity stated; exporter confirms availability |
| No Korean exporter, so listings cannot be fulfilled | Phase 0 exit criterion; nothing goes public before |
| Translation quality from Korean | Provider's `lang=en`; our mapping for makes via `vehicle_makes` aliases; unknowns shown in English, not invented |
| Cost estimate wrong | Labelled estimate; inputs in admin with `reviewed_on`; quote is binding |
| Database churn bloats tables | Write-only-on-change, fillfactor, autovacuum settings on the two hot tables |

## 12. Open decisions

| ID | Decision | Recommendation |
|---|---|---|
| E1 | Plan: Business (€199) or Scale (€299) | Business; Scale only if photo traffic counts |
| E2 | Replace all origins, or keep Japan / China / UAE as request-only | Keep them as request-only |
| E3 | Photo delivery: (a) source resized or (b) Cloudinary fetch for covers | Decide from the spike |
| E4 | Age / mileage ceilings for what we show | None at first; filter in the UI, decide from data |
| E5 | Sawa service fee on Korean imports (flat or %) | Flat RWF, shown in the estimate |
| E6 | Add KB Chachacha / K Car later | Not before Encar is stable for a month |
| E7 | Korean exporter partner and its cost sheet | Required before Phase 3 goes public |
| E8 | Show the estimated Kigali price on every card | Yes, labelled "estimate" |

## 13. Definition of done (every task)

Works on the website and the app, or the PR says why not; all six languages;
no new public field without an allow-list entry; tests added; `release:check`
and CI green; storage stays within §6; the to-do list is ticked in the same PR.
