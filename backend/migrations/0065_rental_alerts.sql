-- ─────────────────────────────────────────────────────────────────────────────
-- 0065_rental_alerts.sql
--
-- Saved searches can target cars for hire, and the daily summary can say how
-- many came on today (docs/PUSH-NOTIFICATIONS-TODO.md, phase 6).
--
-- A rental car is "public" by PREDICATE (a passing Rental Check, a paid
-- subscription, an eligible provider; see routes/rentals.js), not by a status
-- that flips, so there is no single moment to hook. The scheduler instead looks
-- for public cars it has not announced yet and stamps first_listed_at on each,
-- once. That stamp is what the alert matching and the summary count by.
--
--   rental_cars.first_listed_at     when Sawa first saw the car public
--   rental_search_alert_log         a saved search is told about a rental car once
--
-- Cars already in the table are stamped with their creation date, so deploying
-- this does not announce the whole existing fleet as "new today". (A car that
-- was created before this migration but is still waiting for its first Rental
-- Check is therefore never announced; there are very few, and the alternative
-- was announcing everyone.)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE rental_cars ADD COLUMN IF NOT EXISTS first_listed_at TIMESTAMPTZ;

UPDATE rental_cars SET first_listed_at = created_at WHERE first_listed_at IS NULL;

CREATE TABLE IF NOT EXISTS rental_search_alert_log (
  saved_search_id UUID NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
  rental_car_id   UUID NOT NULL REFERENCES rental_cars(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (saved_search_id, rental_car_id)
);

CREATE INDEX IF NOT EXISTS rental_cars_first_listed_idx ON rental_cars (first_listed_at);
