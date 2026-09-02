-- ─────────────────────────────────────────────────────────────────────────────
-- 0037 — a rental provider can propose their own vehicle, and say when it
-- isn't free, without an admin doing either by hand.
--
-- Two gaps, neither of them a safety property.
--
-- 1. Creating a rental_cars row has always been requireAdmin (routes/rentals.js
--    POST /). That mirrors the sale side on purpose — publication stays an
--    admin act, per invariant 4 in CLAUDE.md — but the sale side also has no
--    equivalent of "an operator with ten vans has to ask staff to type each one
--    in". This migration does not touch who can PUBLISH a rental car (status
--    still only moves via requireAdmin, and 'active' still requires a live
--    subscription — routes/rentals.js:696-709, untouched). It adds a status a
--    provider-created row can start in: 'pending_review'. A row in that status
--    is exactly as invisible to every public read as 'maintenance' already is
--    — ACTIVE_RENTAL_SUBSCRIPTION and the `rc.status = 'active'` predicates in
--    routes/rentals.js do not change — so this cannot leak an unreviewed
--    listing onto the public catalogue.
--
-- 2. There was no way to say "this car is rented out this week" without lying
--    about its status (which would also unpublish it) or leaving the catalogue
--    silently wrong. unavailable_until is informational only: nothing reads it
--    in a WHERE clause. A renter still sees the car and can still inquire about
--    a later date; they just see why the provider might be slow to confirm.
--    Keeping it a soft signal instead of a hard gate avoids inventing a
--    calendar/booking system, which is the one thing this product deliberately
--    does not build (see CLAUDE.md §4, Retired).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE rental_cars DROP CONSTRAINT IF EXISTS rental_cars_status_check;
ALTER TABLE rental_cars ADD CONSTRAINT rental_cars_status_check
  CHECK (status IN ('active', 'maintenance', 'retired', 'pending_review'));

-- The column keeps its 'active' DEFAULT — src/seed-rentals.js relies on it and
-- is unrelated to provider self-serve. Every real code path (the existing
-- admin POST /, and the new provider POST /propose below) already sets status
-- explicitly, so the default is never reached in production.

ALTER TABLE rental_cars ADD COLUMN IF NOT EXISTS unavailable_until DATE;

COMMENT ON COLUMN rental_cars.status IS
  'active | maintenance | retired | pending_review. pending_review is a provider-proposed row an admin has not acted on — exactly as invisible to public reads as maintenance. Only requireAdmin routes change this column.';
COMMENT ON COLUMN rental_cars.unavailable_until IS
  'Provider-set, informational only — no public read filters on it. A future date means the provider expects to be slow to confirm until then; it does not hide the car or block an inquiry, so it cannot be used to fake a booking calendar.';
