# Korean imports (Encar): operating guide

For whoever runs the platform. The design and its reasons are in
[`ENCAR-IMPORT-PLAN.md`](ENCAR-IMPORT-PLAN.md); status is in
[`ENCAR-IMPORT-TODO.md`](ENCAR-IMPORT-TODO.md).

## What runs where

| Piece | Where | Does |
|---|---|---|
| `encar-sync` worker | its own container (`docker-compose.prod.yml`) | Downloads the Korean catalogue, then applies the provider's change feed every 10 minutes. Weekly cross-check against the daily export. Idle until a key and `sync_enabled` exist. |
| `GET /imports/korea…` | API container | Search, filters, one car with every photo, cost estimate, Korean reports. Reads our database only, except the reports (fetched once, kept 24 h). |
| Admin → Korean catalogue | admin site | Switches, status, rules, exporter costs, refresh one car. |
| `/imports/korea`, `/imports/korea/[id]` | website | Search and car page. |
| `KoreaCars`, `KoreaCarDetail` screens | app (OTA) | Same, with infinite scroll. |

Everything ships **off**. Two switches live in `platform_settings.encar_flags`:
`sync_enabled` (the worker fetches) and `catalog_public` (customers see cars).

## Going live, in order

1. **Provider plan.** Buy it (the 5-day trial first). Get written answers on storing data and
   showing photos (plan E1/E3).
2. **Key.** Put `ENCAR_API_KEY` in the server's `.env` (never in chat or git). Optionally
   `ENCAR_PHOTO_PREFIX` once the photo host is known.
3. **Spike.** From `backend/`: `node scripts/encar-spike.js --out report.json --fixtures ./fixtures`.
   Fill plan §9 with its numbers. Confirm the photo host loads in a browser without the key
   (if it does not, photos need the proxy option, plan E3). If the export's columns look right
   you may set `ENCAR_BASELINE_SOURCE=export` for the worker.
4. **Deploy** (normal merge to `main`). The migrations create the tables; nothing syncs yet.
5. **Admin → Korean catalogue → Sync: On.** The first load takes minutes to an hour. Watch
   "Mirror" for the car count and "Recent runs" for errors.
6. **Watch for a week:** size, request count, traffic against the 12 GB allowance.
7. **Exporter costs.** Enter the exporter's real cost sheet and tick "Show the landed-cost
   estimate". Until then customers see the Korean price only.
8. **Catalogue is public: On.** Website and app switch from the model catalogue to Korean cars
   within minutes (the app caches the answer for ten minutes).

Switching `catalog_public` off puts the old model catalogue back instantly. That is the rollback.

## Handling a Korean order

A customer taps **Request this car**. The server freezes what they asked for into the order
(make, model, year, mileage, Korean price, photos) and copies the photos to our storage.

1. Open the order in Admin → Vehicle imports. The "Korean listing (as requested)" panel shows it.
2. **Ask the provider to refresh** (counts against 100/day), then ask the exporter to confirm the
   car is still available and its price. Open the source listing if needed.
3. Quote within the agreed time (set one with the exporter). The normal flow takes over:
   quote → agreement → 50% deposit by bank transfer with proof → purchase and shipping → Kigali
   inspection → 50% balance → customs → handover.
4. If the car sold, cancel the order with a note; the customer is told.

Sawa is not the seller and never holds money; the wording on every surface says so.

## Backups and restore

`ops/backup.sh` leaves out the data of every `encar_*` table (it is a mirror of the provider and is
rebuilt, never precious). After restoring a backup the tables exist and are empty. Then:

```sql
UPDATE encar_sync_state SET baseline_started_at = NULL, baseline_completed_at = NULL,
  baseline_page = 1, change_cursor = NULL, last_repair_at = NULL WHERE id = 1;
```

and the worker (if `sync_enabled` is on) downloads the catalogue again. Orders keep their frozen
snapshot, so nothing a customer ordered depends on the mirror.

## Storage and speed guardrails (why this cannot grow without bound)

- Only cars for sale **now**; sold cars are deleted as the feed reports them.
- Photos are addresses, never files. Reports are cached 24 h in an unlogged table that purges itself.
- Row ceiling (default 250,000): the sync stops and alerts rather than filling the disk. Only a page that would add cars past it is refused (and rolled back whole); updates and removals always go through, and a page's removals count towards its room.
- Rows are rewritten only when something we show changed (`IS DISTINCT FROM`), so the table does not bloat.
- Search is indexed (trigram for typos); paging is by cursor, so deep pages cost the same as the first.

## Alerts

- `uptime.yml` checks `GET /health/encar` every 15 minutes: red if the sync is on and has not
  succeeded for an hour.
- The worker logs an error when monthly traffic passes 70% of the plan.
- Container healthcheck: the worker touches a heartbeat file every pass.

## Settings reference (`platform_settings`)

| Key | Meaning |
|---|---|
| `encar_flags` | `sync_enabled`, `catalog_public` |
| `encar_ingest_rules` | which cars are kept (duplicates, photos, min price, fuels, age, mileage, row ceiling) |
| `encar_cost_inputs` | the exporter's costs; the estimate is off until `configured` is true |

Environment: `ENCAR_API_KEY`, `ENCAR_PHOTO_PREFIX`, `ENCAR_SYNC_INTERVAL_SEC` (600),
`ENCAR_BASELINE_SOURCE` (`catalog` | `export`), `ENCAR_RATE_PER_MIN` (API 20, worker 35: together
under the plan's 60), `ENCAR_DETAIL_DAILY_MAX` (3000 report fetches a day),
`ENCAR_REFRESH_DAILY_LIMIT` (100).
