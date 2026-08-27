-- ─────────────────────────────────────────────────────────────────────────────
-- 0030 — make renting a vehicle out something the platform can actually do.
--
-- Two structural obstacles, neither of them protecting anything.
--
-- 1. uq_rental_cars_inspection was unconditional, so a completed inspection
--    could back exactly ONE rental row, for the lifetime of the database. Two
--    consequences followed. A vehicle offered both for sale and for rent needed
--    two inspections of the same physical car, because the rental side consumed
--    one exclusively while the sale side (inspections.car_id) has no such rule.
--    And retiring a rental permanently burned its evidence: the row stays, the
--    index still counts it, and no replacement can ever be created for that
--    vehicle.
--
--    Nothing about the invariant requires exclusivity. The evidence means "this
--    vehicle passed 150 points for this provider", and that stays true whether
--    the car is sold, rented, or both. The gate in routes/rentals.js still
--    matches provider, make, model and year on every read; only the accidental
--    one-row-per-inspection rule goes. The new index is strictly weaker than
--    the old one, so it cannot fail on existing data.
--
-- 2. There was no rental intake. The only route to an inspection is
--    POST /submissions, which is requireAuth and means "I want to sell this
--    car". A rental operator with ten vans had to sign in and file ten sale
--    submissions for vehicles never intended for sale, and every dashboard then
--    described them as vehicles awaiting publication as listings.
--
--    A submission is the right record — the rental gate requires one, and that
--    is a genuine safety property worth keeping. What it lacked was the ability
--    to say what it is FOR. That is this column. The gate is untouched.
-- ─────────────────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS uq_rental_cars_inspection;
CREATE UNIQUE INDEX IF NOT EXISTS uq_rental_cars_inspection
  ON rental_cars(inspection_id)
  WHERE inspection_id IS NOT NULL AND retired_at IS NULL;

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'sale';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'submissions_purpose_check'
  ) THEN
    ALTER TABLE submissions ADD CONSTRAINT submissions_purpose_check
      CHECK (purpose IN ('sale', 'rental', 'both'));
  END IF;
END $$;

-- Who filed it, when the team filed it on someone's behalf. Distinguishes an
-- intake the operator typed at the counter from one the seller submitted, which
-- the audit log otherwise cannot tell apart.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_submissions_purpose
  ON submissions(purpose) WHERE purpose <> 'sale';

COMMENT ON COLUMN submissions.purpose IS
  'What this vehicle is being listed for: sale | rental | both. Does not affect any publication or rental gate — those read the inspection evidence. It exists so a rental intake is not described as a car awaiting sale.';
COMMENT ON COLUMN submissions.created_by IS
  'The admin who filed this submission on a provider''s behalf, or NULL when the seller submitted it themselves.';
