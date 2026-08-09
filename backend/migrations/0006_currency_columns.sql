-- ─────────────────────────────────────────────────────────────────────────────
-- Make the currency of every stored amount explicit.
--
-- Sawa Cars is a Rwandan business and RWF is becoming the canonical currency.
-- Every money column is a bare INT today, with the unit recorded only in a
-- comment (`price INT, -- USD`) and a hardcoded RWF_RATE = 1300 in two client
-- files doing the conversion at render time. That arrangement has three
-- problems, in increasing order of seriousness:
--
--   1. The displayed RWF figure drifts from reality as the rate moves, silently.
--   2. Two clients hold their own copy of the rate, so they can disagree.
--   3. Nothing in the database can tell you what a number MEANS. A row is only
--      interpretable by knowing when it was written and which comment applied.
--
-- This migration fixes (3), which is the prerequisite for the other two. It is
-- deliberately SCHEMA ONLY and converts no values.
--
-- ── Why no conversion here ───────────────────────────────────────────────────
-- src/migrate.js applies migrations automatically on deploy and records a
-- checksum, so an applied file can never be edited. An exchange rate written
-- into a migration would therefore be baked in permanently, unreviewable, and
-- applied to production by a deploy rather than by a decision. These amounts
-- include platform_fees.amount — money actually owed by sellers — so the rate
-- is a business input, not an implementation detail.
--
-- The conversion lives in backend/scripts/convert-to-rwf.js, which refuses to
-- run without an explicit --rate, records what it did in fx_conversions, and is
-- run by a human when the rate is agreed.
--
-- ── The two-step default ─────────────────────────────────────────────────────
-- Note the order below: the column is added with DEFAULT 'USD' so EXISTING rows
-- are labelled truthfully, and only then is the default changed to 'RWF' so new
-- rows are RWF. Adding it as `DEFAULT 'RWF'` in one step would relabel every
-- historical USD amount as francs — a 1300x understatement of every price on
-- the platform, with no record that it happened.
--
-- handovers already carries currency + price_minor from 0005_contracts.sql and
-- is deliberately untouched here. A contract's snapshot is an immutable legal
-- record and must never be re-denominated.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Audit trail for any conversion, so a restated amount is never a mystery ──
CREATE TABLE IF NOT EXISTS fx_conversions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- What was changed, precisely enough to reverse it.
  table_name    TEXT   NOT NULL,
  row_id        TEXT   NOT NULL,
  column_name   TEXT   NOT NULL,
  from_currency TEXT   NOT NULL,
  to_currency   TEXT   NOT NULL,
  old_value     BIGINT NOT NULL,
  new_value     BIGINT NOT NULL,
  -- Minor units of `to` per major unit of `from`, as a decimal so a rate like
  -- 1447.50 is not silently truncated.
  rate          NUMERIC(14,4) NOT NULL CHECK (rate > 0),
  -- Who decided, and when. Free text: this is filled by an operator running a
  -- script, not by application code.
  note          TEXT,
  converted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fx_conversions_row
  ON fx_conversions (table_name, row_id);

-- ── cars.price ───────────────────────────────────────────────────────────────
ALTER TABLE cars ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE cars ALTER COLUMN currency SET DEFAULT 'RWF';
DO $$ BEGIN
  ALTER TABLE cars ADD CONSTRAINT cars_currency_check CHECK (currency IN ('RWF','USD'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── submissions.asking_price ─────────────────────────────────────────────────
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE submissions ALTER COLUMN currency SET DEFAULT 'RWF';
DO $$ BEGIN
  ALTER TABLE submissions ADD CONSTRAINT submissions_currency_check CHECK (currency IN ('RWF','USD'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── platform_fees.amount — real money owed, so the label matters most here ───
ALTER TABLE platform_fees ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE platform_fees ALTER COLUMN currency SET DEFAULT 'RWF';
DO $$ BEGIN
  ALTER TABLE platform_fees ADD CONSTRAINT platform_fees_currency_check CHECK (currency IN ('RWF','USD'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── price_history.price ──────────────────────────────────────────────────────
-- A price history whose rows are in mixed currencies would draw a nonsense
-- sparkline, so the column is per-row and the chart must read it.
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE price_history ALTER COLUMN currency SET DEFAULT 'RWF';
DO $$ BEGIN
  ALTER TABLE price_history ADD CONSTRAINT price_history_currency_check CHECK (currency IN ('RWF','USD'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── rental_cars: daily_rate, weekly_rate, deposit ───────────────────────────
ALTER TABLE rental_cars ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE rental_cars ALTER COLUMN currency SET DEFAULT 'RWF';
DO $$ BEGIN
  ALTER TABLE rental_cars ADD CONSTRAINT rental_cars_currency_check CHECK (currency IN ('RWF','USD'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── rental_bookings: deposit, pickup_fee ────────────────────────────────────
ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE rental_bookings ALTER COLUMN currency SET DEFAULT 'RWF';
DO $$ BEGIN
  ALTER TABLE rental_bookings ADD CONSTRAINT rental_bookings_currency_check CHECK (currency IN ('RWF','USD'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
