# Korean imports from Encar: task list

Plan and reasoning: [`ENCAR-IMPORT-PLAN.md`](ENCAR-IMPORT-PLAN.md). IDs (A#, E#)
refer to that document. Tick items in the PR that ships them.
**(You)** = only you can do it. Everything else is mine.

## Phase 0 — Decide and verify (no production code)

- [ ] **(You)** Free disk space on the development Mac (it is at 100%; builds and tests cannot run)
- [ ] **(You)** Buy the 5-day trial (€9.99); put the key on the VPS as `ENCAR_API_KEY` and give me a trial key for local use through a local `.env`, never in chat
- [ ] **(You)** Ask encarapi support, in writing: may we store listing data, display photos in our app and website, and copy photos of cars a customer orders? Do photo views count against monthly traffic?
- [ ] **(You)** Korean exporter partner: who buys, deregisters and ships; per-car cost sheet (export fee, inland transport, freight to Mombasa/Dar by category, insurance) — **E7**
- [ ] **(You)** Answer E1–E8 (recommendations in the plan, §12)
- [ ] Read-only spike script (`backend/scripts/encar-spike.js`): pulls one export, 200 details, 50 inspections and records, a day of the change feed; stores nothing; prints the §9 numbers
- [ ] Capture redacted fixtures (plates, VINs, contacts removed) for tests
- [ ] Fill in plan §9; confirm or revise the budget in §6 and photo option **E3**
- [ ] Go / no-go review with you

## Phase 1 — Data foundation (deploys with `encar_catalog_public` off)

- [ ] **A1** `lib/encar/client.js`: auth header, shared limiter < 60/min, timeouts, backoff on 429/5xx, size guard
- [ ] **A1** Add `x-api-key` and `api_key` to log redaction; test that the key never reaches a log line
- [ ] **A5** Migration: `encar_listings`, `encar_detail_cache`, `encar_sync_state`, `encar_sync_runs`; indexes; `pg_trgm`; fillfactor; `schema.sql` updated
- [ ] **A4** `encar_ingest_rules` setting (validated, editable) and defaults
- [ ] Normaliser: 만원 → KRW, YYYYMM → year/month, English values (`lang=en`), fuel/category mapping, makes through `vehicle_makes` aliases
- [ ] **A3** Worker `src/workers/encar-sync.js`: advisory lock, own pool, loop
- [ ] Baseline import from `/api/catalog/export`, streamed (never loaded whole into memory), batches of 500
- [ ] Change feed every 10 min: added / updated (write only on shown-field change) / reappeared / removed (delete); cursor saved after each batch
- [ ] Weekly drift repair from the export
- [ ] **A6** Row ceiling with alert; `encar_sync_runs` kept 30 days
- [ ] **A13** `encar_sync_enabled` and `encar_catalog_public` flags
- [ ] **A7** `ops/backup.sh` excludes `encar_*` data; restore runbook note
- [ ] `docker-compose.prod.yml`: `sawa-encar-sync` service; deploy script health-checks it
- [ ] Tests: sync scenarios against Postgres with a mocked client (plan §8)
- [ ] Production: run baseline, watch 7 days, record size and event volume

## Phase 2 — API and pricing

- [ ] `fx.js`: KRW → RWF and KRW → USD with the same provider fallbacks
- [ ] **A9** `lib/landed-cost.js` + cost inputs in `service_rates` (admin-editable, `reviewed_on`)
- [ ] Batch recompute of estimates after sync and on FX / input change
- [ ] **A10** `GET /imports/korea` (filters, sort, cursor, 24/page, cache headers)
- [ ] **A10** `GET /imports/korea/facets` (cached 10 min)
- [ ] **A10** `GET /imports/korea/:id` + 24 h detail/inspection/record cache, allow-listed payload (no plate, masked VIN, no dealer contact)
- [ ] **A8** Photo URL helper for the chosen option (E3)
- [ ] Hourly purge of expired cache rows
- [ ] Admin endpoints: status, refresh (counts the 100/day), rules
- [ ] Load test on 150k rows: search p95 < 150 ms, facets < 300 ms
- [ ] API tests: filters, pagination, 404 on removed, payload allow-list, key absent

## Phase 3 — Website (needs E7 answered before going public)

- [ ] `/imports`: results grid, filters in the URL, server-rendered first page, infinite scroll
- [ ] `/imports/[id]`: gallery (lazy), specs, Korean inspection report, accident record, cost breakdown, Request this car; `noindex`
- [ ] Indexed make/model landing pages; sitemap entries for those only
- [ ] Request form prefilled from a listing; origins other than Korea stay request-only (E2)
- [ ] Wording: "Korean inspection report", "estimate", no Sawa certification, no escrow or guarantee language
- [ ] `imports` i18n namespace, six languages
- [ ] Playwright: search → detail → request

## Phase 4 — App (over the air)

- [ ] Korea results screen: server search, filters, cursor paging with prefetch, debounced input, cancel stale requests, `expo-image` caching
- [ ] Korea detail screen: shows card data instantly, then detail; full gallery; request
- [ ] Search "Import Direct" tab and Home rail use the server
- [ ] Delete `src/data/importCatalog.js`, `useImportCatalog.js`, brand → model screens
- [ ] Six languages; `release:check`, module-scope, hook-order checks green
- [ ] Device checklist (plan §10)

## Phase 5 — Orders and admin

- [ ] Migration: `import_orders.encar_listing_id`, `source`
- [ ] `POST /imports` with `encar_listing_id`: server-built snapshot; photos copied to Cloudinary `imports/<order>`
- [ ] Admin order page: snapshot, data age, Refresh, link to the source listing
- [ ] Admin Encar page: sync status, counts, size, traffic used, rules editor, flags
- [ ] Uptime workflow alerts when the last successful sync is older than 1 hour
- [ ] Operating procedure for a Korean order (refresh → exporter confirms → quote within an agreed time)
- [ ] **(You)** Run one real order end to end with the exporter

## Phase 6 — Retire the old catalogue

- [ ] Remove brand → model browsing, studio-render and catalogue-imagery admin
- [ ] `global_import_catalog` kept read-only for past orders; its routes answer 410 for writes
- [ ] Update `CLAUDE.md`, `IMPORTS-AUDIT.md`, store privacy answers (no new personal data is collected)
- [ ] **(You)** Turn on `encar_catalog_public`
