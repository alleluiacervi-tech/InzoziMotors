-- Rentals: how renters reach a provider, and which dates a car is taken.
--
-- 1. An availability request opens a real conversation.
--    "In-app message" used to create no thread: the renter could not follow
--    up and the provider had no way to answer inside Sawa. Now an inquiry
--    opens (or continues) the renter-provider thread, and the thread's pinned
--    card can point at a rental car as well as a sale car.
--
-- 2. The renter's number is shared only with the renter's consent.
--    The provider inbox used to show every renter's phone and WhatsApp,
--    whatever channel they chose. A renter who asks to be called or messaged
--    on WhatsApp has consented; one who chose in-app has not. Earlier rows
--    were made under the old rule and their numbers were already shown, so
--    they keep it.
--
-- 3. Response time is measured, not self-reported.
--    first_response_at is set by the provider's first message in the thread,
--    or their first status change, whichever comes first.
--
-- 4. Taken dates (rental_busy_periods).
--    The provider says which days a car is out. Only the provider writes them;
--    an inquiry never creates, holds or releases one, and nothing here hides a
--    car or refuses an inquiry. There is no renter, price or inquiry on a row,
--    so it cannot describe a deal — it is not a booking system (CLAUDE.md §4).
--    Past periods stop showing by predicate; each write prunes periods that
--    ended more than 90 days ago. calendar_updated_at tells renters how fresh
--    the provider's calendar is.

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS rental_car_id UUID
  REFERENCES rental_cars(id) ON DELETE SET NULL;

ALTER TABLE rental_inquiries ADD COLUMN IF NOT EXISTS renter_shares_contact BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE rental_inquiries ADD COLUMN IF NOT EXISTS conversation_id UUID
  REFERENCES conversations(id) ON DELETE SET NULL;
ALTER TABLE rental_inquiries ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;
-- Every row that exists now was shown to its provider with numbers already.
-- (Migrations run once, so this touches only rows from before the change.)
UPDATE rental_inquiries SET renter_shares_contact = TRUE;

CREATE TABLE IF NOT EXISTS rental_busy_periods (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_car_id  UUID NOT NULL REFERENCES rental_cars(id) ON DELETE CASCADE,
  starts_on      DATE NOT NULL,
  ends_on        DATE NOT NULL,           -- inclusive: the last day the car is out
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rental_busy_periods_order CHECK (ends_on >= starts_on),
  CONSTRAINT rental_busy_periods_span CHECK (ends_on - starts_on <= 365)
);
CREATE INDEX IF NOT EXISTS idx_rental_busy_periods_car
  ON rental_busy_periods(rental_car_id, ends_on);

ALTER TABLE rental_cars ADD COLUMN IF NOT EXISTS calendar_updated_at TIMESTAMPTZ;

-- The single "unavailable until" date becomes a period: out from today until
-- the day before that date. The column stays for old app builds, derived
-- from the periods from now on.
INSERT INTO rental_busy_periods (rental_car_id, starts_on, ends_on, created_by)
SELECT id, (NOW() AT TIME ZONE 'Africa/Kigali')::date, unavailable_until - 1, provider_id
  FROM rental_cars
 WHERE unavailable_until IS NOT NULL
   AND unavailable_until - 1 >= (NOW() AT TIME ZONE 'Africa/Kigali')::date
   AND unavailable_until - 1 - (NOW() AT TIME ZONE 'Africa/Kigali')::date <= 365
   AND NOT EXISTS (SELECT 1 FROM rental_busy_periods b WHERE b.rental_car_id = rental_cars.id);
UPDATE rental_cars SET calendar_updated_at = NOW()
 WHERE unavailable_until IS NOT NULL AND calendar_updated_at IS NULL;
