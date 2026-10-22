---
name: postgres-migration-review
description: Use when writing or reviewing a Postgres migration, schema change, or SQL query in backend/ — new migration files, column or index changes, backfills, and queries that decide what is public.
---

# Postgres migration and query review (Sawa Cars)

The backend is the only thing that talks to Postgres, and one change reaches the
API, web, admin and app at once. Review against this list before writing or approving.

## Migration files (`backend/migrations/NNNN_name.sql`)
- Next number after the highest existing file; never reuse or renumber.
- **Never edit an applied migration.** `src/migrate.js` stores a checksum and errors on change. Fix forward with a new file.
- Each file runs in one transaction. Do not add `BEGIN/COMMIT`, and avoid `CREATE INDEX CONCURRENTLY` (not allowed in a transaction); keep indexes small or note the lock.
- Idempotent where cheap: `IF NOT EXISTS` on columns, tables and indexes.
- Open with a header comment saying what and why, like 0066.
- Adding a NOT NULL column to a big table: add nullable, backfill, then set NOT NULL, or give a constant DEFAULT.
- Destructive changes (DROP, column type change, deleting rows) need the user's explicit OK first. `ops/deploy.sh` backs up the DB when migrations are present, but say so.
- `src/schema.sql` is documentation only, never executed. `test/schema-drift.test.js` fails if it names a column no migration creates, so keep it from lying.
- Check constraints that already allow historical values (`platform_fees.fee_type` still allows `commission`) stay as they are.

## Data rules
- Money is RWF whole francs in the database: integer or bigint, never float or numeric-with-decimals, never converted in SQL for display.
- Timestamps are `timestamptz`. Days and months for reporting are **Kigali calendar days** (see `lib/insights-range.js`), not UTC.
- Public reads must go through the existing visibility predicates (`publiclyVisibleSql`, `RENTAL_EVIDENCE_OK`) and require `is_test = FALSE`. Never invent a parallel "is public" condition.
- Public car payloads use the `PUBLIC_CAR_COLUMNS` allow-list, never `c.*`, and never a raw VIN.
- Contact events (`listing_contact_events`) never store the number.
- Do not add columns or tables that reintroduce checkout, escrow, held funds, handover, guarantee or commission. `rental_busy_periods` has no renter, inquiry or price column on purpose.

## Queries
- Parameterised only (`$1`), no string interpolation of user input.
- Anything that claims a row before sending (push, email, digest) must claim it in the statement that selects it (`UPDATE ... WHERE ... RETURNING`, or `FOR UPDATE SKIP LOCKED`), so a restart or second server cannot double-send.
- Check the plan for new list queries: an index for the WHERE and ORDER BY, no unbounded result sets, pagination on lists.
- `encar_*` tables are a mirror with a row ceiling; do not add per-request provider calls or unbounded growth.

## Before saying done
Run `cd backend && node src/db-init.js && npm test` against a real Postgres, and show the output. If Postgres is unavailable, say the migration is untested.
