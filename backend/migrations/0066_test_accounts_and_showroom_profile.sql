-- ─────────────────────────────────────────────────────────────────────────────
-- 0066_test_accounts_and_showroom_profile.sql
--
-- Two things the team needs before launch (docs/SHOWROOMS-AND-POLISH.md,
-- "World-class showrooms").
--
-- 1. TEST ACCOUNTS
--
--   users.is_test          the team says this account is ours, for testing
--   users.test_marked_at   when, and by whom (test_marked_by)
--
-- A test account can still sign in (the demo account App Review uses must keep
-- working), but nothing it owns is ever public: every query that decides
-- whether a seller's cars, rentals, profile or inspection reports are public
-- now also requires is_test = FALSE. Marking is a flag, not a cascade, so
-- unmarking restores exactly what was there.
--
-- Only a marked account can be erased by the team (POST /admin/users/:id/erase),
-- with the same anonymisation the thirty-day purge has always used. The flag
-- survives the erasure on purpose: it carries no personal data, and it is what
-- lets reports leave test data out later.
--
-- 2. SHOWROOM PROFILE
--
--   users.business_about       a short description, written by the team
--   users.business_address     where buyers can visit
--   users.business_hours       {"mon": {"open": "08:00", "close": "18:00"}, ..., "sun": null}
--   users.business_cover_url   a photo of the showroom itself (falls back to its newest car)
--
-- Shown only for a showroom (seller_type = 'showroom'), on its storefront in
-- the app and on the website. Never a phone number: contact stays behind the
-- three gates of CLAUDE.md section 3.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_test        BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS test_marked_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS test_marked_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- The admin directory's "Test accounts" filter reads only these rows.
CREATE INDEX IF NOT EXISTS idx_users_test ON users (created_at DESC) WHERE is_test;

ALTER TABLE users ADD COLUMN IF NOT EXISTS business_about     TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_address   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_hours     JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_cover_url TEXT;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_business_about_length_check;
ALTER TABLE users ADD CONSTRAINT users_business_about_length_check
  CHECK (business_about IS NULL OR char_length(business_about) <= 1200);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_business_address_length_check;
ALTER TABLE users ADD CONSTRAINT users_business_address_length_check
  CHECK (business_address IS NULL OR char_length(business_address) <= 240);

-- The day-by-day shape is checked by the API (lib/showroom-profile.js); the
-- database only refuses something that is not an object at all.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_business_hours_shape_check;
ALTER TABLE users ADD CONSTRAINT users_business_hours_shape_check
  CHECK (business_hours IS NULL OR jsonb_typeof(business_hours) = 'object');
