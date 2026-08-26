-- Rental listing subscriptions: a provider pays per vehicle, per period, to
-- keep a car in the public catalogue.
--
-- Collected OFFLINE and recorded, exactly like the inspection fee in 0023.
-- payments_enabled stays false and locked.
--
-- ── A lapse hides a car by FALLING OUT OF A WHERE CLAUSE ─────────────────────
-- This backend deliberately has no scheduler — 0009_rental_payments.sql:41
-- states it outright, and the rental hold it describes expires the same way.
-- So expiry here is a predicate on the three public reads, never a job that
-- sweeps rows. Nothing has to run on time for a lapsed car to disappear, and
-- nothing has to run again for a renewed one to come back.
--
-- rental_cars.status is NOT touched on lapse. Status is what the operator said
-- about the vehicle; the subscription is what the business says about the
-- listing. Conflating them would mean a renewal silently republishing a car
-- somebody had deliberately put into maintenance.

CREATE TABLE IF NOT EXISTS rental_subscriptions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_car_id  UUID NOT NULL REFERENCES rental_cars(id) ON DELETE CASCADE,
  amount_rwf     INT NOT NULL CHECK (amount_rwf >= 0),
  method         TEXT CHECK (method IS NULL OR method IN ('cash', 'mobile_money', 'bank_transfer')),
  reference      TEXT,
  starts_on      DATE NOT NULL,
  ends_on        DATE NOT NULL,
  note           TEXT,
  recorded_by    UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  voided_at      TIMESTAMPTZ,
  voided_by      UUID REFERENCES users(id),
  void_reason    TEXT,
  CONSTRAINT rental_subscriptions_period_check CHECK (ends_on >= starts_on)
);

-- Overlaps are refused by the route with a 409 rather than by an EXCLUDE
-- constraint: btree_gist is a server extension this deployment does not
-- otherwise need, and a clear error beats a constraint violation an operator
-- cannot read.
CREATE INDEX IF NOT EXISTS idx_rental_subscriptions_car
  ON rental_subscriptions(rental_car_id, ends_on DESC) WHERE voided_at IS NULL;

-- ── The missing status CHECK ─────────────────────────────────────────────────
-- rentals.js:441 has always validated this set on write, but the column had no
-- constraint, so anything could be written by hand or by a future route.
--
-- Pre-deploy gate: SELECT DISTINCT status FROM rental_cars must be a subset of
-- these three, or this fails and stalls the deploy rather than breaking reads.
ALTER TABLE rental_cars DROP CONSTRAINT IF EXISTS rental_cars_status_check;
ALTER TABLE rental_cars ADD CONSTRAINT rental_cars_status_check
  CHECK (status IN ('active', 'maintenance', 'retired'));

-- ── Grandfathering ───────────────────────────────────────────────────────────
-- The single biggest risk in this migration: without this, every car already in
-- the catalogue vanishes from the public site the instant the new predicate
-- lands, and the first anyone hears of it is a provider asking where their
-- fleet went.
--
-- So every currently-active car gets 60 days at amount 0, explicitly labelled.
-- Amount 0 is deliberate — it is visibly an artefact rather than a fabricated
-- payment nobody made — and it EXPIRES, which forces a real commercial decision
-- inside two months instead of quietly becoming permanent.
--
-- Deliberately NOT mirrored into src/schema.sql: a fresh database has no
-- catalogue to grandfather, and seeding one would be inventing history.
INSERT INTO rental_subscriptions (rental_car_id, amount_rwf, starts_on, ends_on, note)
SELECT id, 0, CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days',
       'Grandfathered when listing subscriptions were introduced. Record a real payment before this expires.'
  FROM rental_cars
 WHERE status = 'active'
   AND NOT EXISTS (SELECT 1 FROM rental_subscriptions s WHERE s.rental_car_id = rental_cars.id);
