-- The Sawa Rental Check (backend/src/lib/rental-check-policy.js).
--
-- Rental cars used to need the full 150-point sale inspection, reached through
-- the sale submission flow, before they could be listed. That is the wrong
-- question for a rental and too slow for a fleet: about two hours and a sale
-- form per car. A Rental Check is ten points, done at the provider's yard.
--
-- A car is publicly listed when its LATEST non-voided check passed, is less
-- than 12 months old, and both recorded document dates are today or later.
-- Expiry by predicate, like rental_subscriptions: nothing sweeps rows, and the
-- listing hides itself the day the insurance or technical control runs out.
--
-- Cars listed on a 150-point inspection before this keep that evidence until
-- their first Rental Check is recorded; from then on the check decides.

CREATE TABLE IF NOT EXISTS rental_checks (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_car_id                 UUID NOT NULL REFERENCES rental_cars(id) ON DELETE CASCADE,
  checklist_version             TEXT NOT NULL,
  results                       JSONB NOT NULL,
  passed                        BOOLEAN NOT NULL,
  passed_count                  INT NOT NULL CHECK (passed_count BETWEEN 0 AND 10),
  insurance_expires_on          DATE NOT NULL,
  technical_control_expires_on  DATE NOT NULL,
  odometer_km                   INT CHECK (odometer_km IS NULL OR odometer_km >= 0),
  notes                         TEXT,
  checked_by                    UUID REFERENCES users(id) ON DELETE SET NULL,
  checked_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  voided_at                     TIMESTAMPTZ,
  voided_by                     UUID REFERENCES users(id) ON DELETE SET NULL,
  void_reason                   TEXT
);
CREATE INDEX IF NOT EXISTS idx_rental_checks_car
  ON rental_checks(rental_car_id, checked_at DESC) WHERE voided_at IS NULL;

-- A provider asking Sawa to come and check a car. Cleared when a check is
-- recorded; the admin fleet view lists the open requests.
ALTER TABLE rental_cars ADD COLUMN IF NOT EXISTS check_requested_at TIMESTAMPTZ;

COMMENT ON TABLE rental_checks IS
  'Sawa Rental Check results. Documents are sighted originals with recorded expiry dates, not registry checks. The latest non-voided row decides whether a rental car may be listed.';

-- The check has a price on the rate card (lib/service-rates.js). Added to the
-- stored card only where missing, so rates an admin already edited are kept.
UPDATE platform_settings
   SET value = value || '{"rental_check_fee_rwf": 5000}'::jsonb
 WHERE key = 'service_rates' AND NOT (value ? 'rental_check_fee_rwf');
