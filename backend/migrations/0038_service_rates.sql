-- 0038 — a rate card the business can actually charge.
--
-- The business-model reassessment found five monetizable lines already built
-- (walk-in inspection fee, report resale, rental listing subscription,
-- sponsored placement, import order) and not one of them had a price. Every
-- amount was typed by hand per transaction by whichever admin happened to be
-- recording it -- no default, nothing a customer could see before showing up,
-- nothing the website could quote.
--
-- Mirrors 0024_duty_rate_settings.sql: one platform_settings row, editable,
-- read through a short-TTL cached loader (backend/src/lib/service-rates.js),
-- surfaced publicly at GET /settings/rate-card. Sponsored-placement pricing is
-- deliberately NOT here -- the reassessment recommends holding that line until
-- there is an audience worth selling, so there is nothing to price yet.
--
-- These are starting numbers, not researched ones. `reviewed_on` says so
-- honestly in both the admin editor and the public page -- the same
-- "reviewed_on" pattern 0024 established for duty rates -- so an unverified
-- price is visibly unverified rather than confidently wrong.

INSERT INTO platform_settings (key, value, description, editable) VALUES
  ('service_rates',
   '{
     "inspection_fee_rwf": 15000,
     "report_resale_fee_rwf": 5000,
     "rental_subscription_monthly_rwf": 10000,
     "reviewed_on": "2026-09-02"
   }'::jsonb,
   'Prices for walk-in inspections, report resale and rental listing subscriptions. Starting numbers -- review before relying on them.',
   TRUE)
ON CONFLICT (key) DO NOTHING;
