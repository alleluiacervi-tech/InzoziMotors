# Korean imports from Encar: task list

Plan and reasoning: [`ENCAR-IMPORT-PLAN.md`](ENCAR-IMPORT-PLAN.md). How to run it:
[`ENCAR-IMPORT-OPERATIONS.md`](ENCAR-IMPORT-OPERATIONS.md). IDs (A#, E#) refer to the plan.

**Status (1 Oct 2026): all code is written, tested where it can be tested here, and shipped switched
off. What is left needs a person, a key, or a production database** (sections "Needs you" and
"Needs the key / production" below). Nothing is public until `encar_flags.catalog_public` is turned on.

Legend: `[x]` built and checked as far as this machine allows · `[~]` built, but its real check
needs Postgres (runs in CI on a pull request) or live provider data · `[ ]` not done.
**(You)** = only you can do it.

## Needs you (no code can do these)

- [ ] **(You)** Free disk space on the development Mac (it was at 100%; builds and tests need room)
- [ ] **(You)** Buy the 5-day trial (€9.99) / Business plan. Put the key on the VPS as `ENCAR_API_KEY`
      and in a local `backend/.env` (never in chat, never committed)
- [ ] **(You)** Ask encarapi support, in writing: may we store listing data, display photos in our app
      and website, and copy photos of cars a customer orders? Do photo views count against monthly traffic?
- [~] **(You)** Find the Korean exporter partner (research, shortlist, indicative costs and the message to send are in [`KOREAN-EXPORTER-SEARCH.md`](KOREAN-EXPORTER-SEARCH.md); none contacted yet, no written cost sheet): who buys, deregisters and ships; the per-car cost
      sheet (export fee, inland transport, freight to Mombasa/Dar by category, insurance) — **E7**
- [ ] **(You)** Answer E1–E8 (recommendations in the plan, §12)
- [ ] **(You)** Merge the pull request(s); the deploy applies migrations 0052 and 0053
- [ ] **(You)** Run one real order end to end with the exporter
- [ ] **(You)** Turn on sync, then (after a week of watching) turn on `catalog_public`
      (Admin → Korean catalogue; steps in the operations guide)
- [ ] **(You)** Native-speaker review of the new strings (rw, sw especially): web `imports.korea.*`
      in `web/src/lib/i18n/messages/imports.ts`, app `korea.*` in `src/i18n/index.js`

## Needs the key / production (mine, the moment the key exists)

- [ ] Run the spike: `node backend/scripts/encar-spike.js --out report.json --fixtures ./fixtures`
- [ ] Capture redacted fixtures for tests; fill plan §9 with real numbers
- [ ] Confirm or revise the photo option **E3** and the storage budget §6 (is the photo host open
      without a key? can it resize?)
- [ ] Check the export's real columns; if they match, try `ENCAR_BASELINE_SOURCE=export`
- [ ] Tighten the inspection report from "documented summary + scrubbed free-form parts" to a fully
      explicit allow-list, using the fixtures (`backend/src/lib/encar/detail.js`)
- [ ] Load test on ~150k rows: search p95 < 150 ms, facets < 300 ms
- [ ] Production: run the first load, watch 7 days, record size and event volume
- [ ] Go / no-go review with you

## Phase 0: Decide and verify

- [x] Read-only spike script (`backend/scripts/encar-spike.js`): written; **not run, it needs the key**
- [ ] Everything else in this phase is in "Needs you" / "Needs the key" above

## Phase 1: Data foundation (ships with `encar_catalog_public` off)

- [x] **A1** `lib/encar/client.js`: auth header, shared limiter, timeouts, backoff on 429/5xx, size guard
- [x] **A1** `x-api-key` / `api_key` redacted in logs; a test that the key never reaches a log line
- [x] **A5** Migration `0052_encar_mirror.sql`: tables, indexes, `pg_trgm`, fillfactor
- [x] **A4** `encar_ingest_rules` setting: validated, defaults, editable in Admin → Korean catalogue
- [x] Normaliser: man-won kept, YYYYMM → year/month, English values, photo prefix stripping
- [x] Make aliases: brands go through `vehicle_makes` (the same table that collapses "Mercedes"/"benz");
      an unknown brand keeps the provider's spelling. Body category is read when the provider gives
      one; it is not guessed
- [x] **A3** Worker `src/workers/encar-sync.js`: advisory lock, own pool, loop, heartbeat
- [x] Baseline by paging `/api/catalog` (1,000 a page, newest first, resumable)
- [~] Baseline from the CSV export, streamed (`lib/encar/csv.js`, `ENCAR_BASELINE_SOURCE=export`):
      header matched by name, refuses a file it cannot read and falls back to paging. Unit-tested; its
      real columns are confirmed only by the spike
- [x] Change feed every 10 minutes: added / updated (write only on a shown-field change) /
      reappeared / removed (delete); the cursor is saved in the same transaction as the rows
- [~] Weekly drift repair from the export (removes cars the feed missed; refuses to delete if the
      export is under half our size). Unit-tested; real run needs the key
- [x] **A6** Row ceiling with alert; run history kept 30 days
- [x] **A13** `encar_flags`: `sync_enabled`, `catalog_public`, both off
- [x] **A7** `ops/backup.sh` leaves `encar_*` data out; restore note in the operations guide
- [x] `docker-compose.prod.yml` `encar-sync` service; deploy and rollback start it
- [~] Tests: client, normaliser, sync, export, reports, landed cost (93 unit tests pass locally);
      `encar-store.test.js` needs Postgres and runs in CI

## Phase 2: API and pricing

- [x] `fx.js`: KRW per USD with the same fallbacks; per-pair floors (fixed a bug where any pair got the USD→RWF floor)
- [x] **A9** `lib/encar/landed-cost.js`: Korean price + export + inland + freight (by body category) +
      insurance, then Rwanda duty as a range across excise brackets (a single figure once the engine
      size is known). **Off until an admin enters the exporter's real costs** (`encar_cost_inputs`,
      with a `reviewed_on` date); the API answers `estimate: null` until then
- [x] Estimates are computed on read from live rates, so there is nothing to recompute when the rate moves
- [x] **A10** `GET /imports/korea` (filters, five sorts, cursor, 24 a page, cache headers; price in USD)
- [x] **A10** `GET /imports/korea/facets` (cached 10 minutes; makes and fuels, models for one make)
- [x] **A10** `GET /imports/korea/:id`: the row, every photo, the estimate
- [x] **A10** `GET /imports/korea/:id/reports`: Korean inspection report, insurance record, engine size and
      price history; 24 h cache; each part answers ok / none / unavailable; rebuilt from named fields
      (no plate, VIN, certificate number, owner or dealer can pass); per-IP limit; daily fetch budget
- [x] **A8** Photo URL helper for the stored form (`photoUrl`); the final choice of photo option waits on E3
- [x] Hourly purge of expired cache rows (in the worker)
- [x] Admin endpoints: `GET /admin/encar/status`, `POST /admin/encar/listings/:id/refresh` (counts the
      100/day, audit-logged); settings through `PATCH /admin/settings/:key` (validated, audit-logged)
- [ ] Load test on 150k rows (needs production-size data; listed above)
- [~] API tests: filters, pagination, 404 on a sold car, payload allow-list, estimate on/off, reports,
      order snapshot (`imports-korea.test.js`; needs Postgres, runs in CI)

## Phase 3: Website

- [x] `/imports/korea`: results grid, filters as a plain GET form (shareable, works without script),
      first page server-rendered, "Show more" with cursor paging, sold-car duplicates dropped
- [x] `/imports/korea/[id]`: gallery (lazy thumbnails), specs, Korean price labelled as Korean,
      cost estimate with its wording, Korean inspection report and accident record (loaded after the
      page), request button; `noindex`; a sold car is a calm "no longer available"
- [x] Indexable: the list and one make (`?make=`); sitemap lists those only, and only once the
      catalogue is open
- [x] Request: server action sends only the listing id; the server builds the order from our own data;
      a repeat request goes to the existing order
- [x] `/imports` shows the Korean catalogue teaser once it is open, the model catalogue until then
- [x] Wording: "Korean inspection report", "estimate", "Sawa Cars is not the seller"; no escrow or
      guarantee language (the Playwright spec asserts it)
- [x] `imports.korea.*` strings in six languages (rw/sw/fr/ko/zh need native review, see above)
- [~] Playwright: search → detail → request → order (`web/e2e/korea-imports.spec.ts`; runs in CI)

## Phase 4: App (over the air: JavaScript only, no native change)

- [x] `KoreaCars` screen: server search (350 ms debounce), make chips, five sorts, cursor paging with
      infinite scroll, stale responses ignored, `expo-image` disk cache
- [x] `KoreaCarDetail` screen: card data on the first frame, then the full gallery and estimate, then the
      Korean reports; request (sign-in prompt, existing-order and sold-car cases handled)
- [x] Search "Import Direct" tab and the Home rail use the Korean catalogue once it is open (checked
      with a ten-minute cache), and the model catalogue until then
- [x] Six languages (`korea.*`); `release:check`, module-scope, hook-order, undefined-ref and import checks green
- [ ] **(You)** Device checklist (plan §10) on a real phone after the OTA

## Phase 5: Orders and admin

- [x] Migration `0053`: `import_orders.source`, `encar_listing_id`, `listing_snapshot`, `snapshot_at`,
      `snapshot_photos`
- [x] `POST /imports` with `encar_listing_id`: server-built snapshot (the client's make/model/year are
      ignored), one open order per buyer per car, photos copied to Cloudinary in the background
- [x] Admin order page: the snapshot, its age, link to the source listing, "Ask the provider to refresh"
- [x] Admin → Korean catalogue: switches, mirror size and counts, provider allowance, recent runs, rules
      editor, exporter costs editor
- [x] Uptime workflow: `GET /health/encar` is red when the sync is on and an hour stale
- [x] Operating procedure for a Korean order (operations guide)
- [ ] **(You)** One real order with the exporter

## Phase 6: Retire the old catalogue

- [x] Customers and the app prefer the Korean catalogue the moment it is public, and fall back to the
      model catalogue before that, so an unfinished go-live can never leave an empty import page.
      Turning `catalog_public` off restores the old catalogue instantly (the rollback)
- [x] `CLAUDE.md`, operations guide and this task list updated
- [ ] **Deliberately deferred until after go-live:** delete `src/data/importCatalog.js`,
      `useImportCatalog.js`, the brand → model screens, `ImportCarCard`, and the studio-render /
      catalogue-imagery admin; make `global_import_catalog` read-only with writes answering 410.
      Removing them before the Korean catalogue has run in production would delete the fallback.
      Do it in one pull request once `catalog_public` has been on for a couple of weeks
- [ ] Update `IMPORTS-AUDIT.md` and the store privacy answers (no new personal data is collected)
      in the same pull request
