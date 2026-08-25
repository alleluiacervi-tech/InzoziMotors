-- Standalone inspections: a walk-in customer brings any vehicle, pays for an
-- independent 150-point check, and leaves with a report. The vehicle is not a
-- Sawa listing and may never become one.
--
-- This is the product the business is built on: a buyer about to hand over
-- millions of francs to a stranger is the most motivated customer there is,
-- and Sawa is the only party in that moment with no stake in the sale.
--
-- ── Why the shape is a CHECK constraint and not a WHERE clause ───────────────
-- Every publication, contact and rental gate independently requires BOTH a
-- joined `submissions` row AND a matching `car_id`:
--
--   cars.js validInspectionExists / publicationReadiness,
--   admin.js action-center + listings queue, messages.js conversation gate,
--   rentals.js VALID_RENTAL_INSPECTION.
--
-- Rather than add `AND kind = 'listing'` to seven separate SQL strings — seven
-- chances to typo a safety property — the constraint below makes a standalone
-- inspection incapable of ever holding a submission_id or a car_id. Those
-- gates then cannot match one, in the database, permanently. None of them are
-- modified by this migration, and none of them need to be.

ALTER TABLE inspections ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'listing';
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS customer_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Vehicle identity for a walk-in. A listing inspection reads these from the
-- submission or the car; a standalone one has neither, so it carries its own.
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS vehicle_make TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS vehicle_model TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS vehicle_year INT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS vehicle_vin TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS vehicle_plate TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS vehicle_mileage INT;

ALTER TABLE inspections DROP CONSTRAINT IF EXISTS inspections_kind_check;
ALTER TABLE inspections ADD CONSTRAINT inspections_kind_check
  CHECK (kind IN ('listing', 'standalone'));

-- The safety constraint itself.
--
-- Pre-deploy gate: `SELECT count(*) FROM inspections WHERE submission_id IS NULL`
-- must return 0, or this fails and stalls the deploy. uq_inspections_submission
-- is a plain unique index and Postgres treats NULLs as distinct, so nothing has
-- prevented such rows from existing — check before shipping rather than assume.
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS inspections_kind_shape_check;
ALTER TABLE inspections ADD CONSTRAINT inspections_kind_shape_check CHECK (
  (kind = 'listing' AND submission_id IS NOT NULL)
  OR
  (kind = 'standalone'
     AND submission_id IS NULL
     AND car_id IS NULL
     AND customer_user_id IS NOT NULL
     AND vehicle_make IS NOT NULL
     AND vehicle_model IS NOT NULL
     AND vehicle_year IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_inspections_standalone_customer
  ON inspections(customer_user_id) WHERE kind = 'standalone';
