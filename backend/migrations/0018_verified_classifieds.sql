-- Sawa Cars marketplace policy: verified classifieds and direct communication.
--
-- This migration deliberately preserves historical handovers, contracts,
-- disputes, rental bookings and payment rows. They are business records and
-- must not be destroyed when the product stops creating new transactions.

ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_visible BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_visible BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_consent_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketplace_terms_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketplace_terms_version TEXT;

-- Showrooms created by an administrator have already supplied their business
-- identity. Existing rows retain that operational decision without exposing
-- their contact details until a separate visibility consent is recorded.
UPDATE users
SET business_verified = TRUE
WHERE seller_type = 'showroom' AND admin_created = TRUE;

ALTER TABLE cars ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS archive_reason TEXT;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- A reservation previously implied that Sawa controlled a buyer/seller deal.
-- The new model does not reserve vehicles, so existing reserved listings return
-- to the public catalogue without changing their ownership or price records.
UPDATE cars SET status = 'live' WHERE status = 'reserved';

ALTER TABLE cars DROP CONSTRAINT IF EXISTS cars_status_check;
ALTER TABLE cars ADD CONSTRAINT cars_status_check CHECK (status IN (
  'draft', 'under_review', 'scheduled', 'inspecting', 'approved',
  'live', 'paused', 'sold', 'rejected', 'archived'
));

-- Auditable disclosure of a seller's contact information. The event contains
-- no phone number; it records who requested which channel and for which
-- listing, keeping sensitive data out of analytics and logs.
CREATE TABLE IF NOT EXISTS listing_contact_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('phone', 'whatsapp', 'in_app')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_listing_contact_events_car
  ON listing_contact_events(car_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_contact_events_seller
  ON listing_contact_events(seller_id, created_at DESC);

-- Rental companies own the commercial relationship. Rental cars may retain a
-- NULL provider for legacy Sawa-owned fleet records; new partner inventory is
-- tied to a verified seller account.
ALTER TABLE rental_cars ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE rental_cars ADD COLUMN IF NOT EXISTS retired_at TIMESTAMPTZ;
ALTER TABLE rental_cars ADD COLUMN IF NOT EXISTS retirement_reason TEXT;

CREATE TABLE IF NOT EXISTS rental_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_ref TEXT UNIQUE NOT NULL,
  rental_car_id UUID NOT NULL REFERENCES rental_cars(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES users(id) ON DELETE SET NULL,
  start_date DATE,
  days INT CHECK (days IS NULL OR days BETWEEN 1 AND 365),
  pickup_location TEXT,
  message TEXT,
  preferred_channel TEXT NOT NULL DEFAULT 'in_app'
    CHECK (preferred_channel IN ('in_app', 'phone', 'whatsapp')),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'closed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_rental_inquiries_renter
  ON rental_inquiries(renter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rental_inquiries_provider
  ON rental_inquiries(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rental_inquiries_status
  ON rental_inquiries(status, created_at DESC);

-- Pending gateway sessions are never allowed to become bookings after this
-- migration. Completed historical bookings remain untouched.
UPDATE rental_bookings SET status = 'expired' WHERE status = 'pending_payment';

-- Operational settings are data, not environment-specific source edits. The
-- policy-defining values are intentionally visible to admins but locked by the
-- API: payments and guarantees cannot be re-enabled without a reviewed release.
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT NOT NULL,
  editable BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO platform_settings (key, value, description, editable) VALUES
  ('marketplace_mode', '"verified_classifieds"'::jsonb, 'Buyer and seller transact independently.', FALSE),
  ('payments_enabled', 'false'::jsonb, 'Payment gateways are disabled platform-wide.', FALSE),
  ('guarantees_enabled', 'false'::jsonb, 'Sawa does not provide a transaction or return guarantee.', FALSE),
  ('rental_mode', '"inquiry_only"'::jsonb, 'Rental companies confirm availability and terms directly.', FALSE),
  ('inspection_required', 'true'::jsonb, 'A completed inspection is required before a new sale listing is published.', TRUE),
  ('listing_min_photos', '1'::jsonb, 'Minimum valid gallery images required to publish.', TRUE),
  ('listing_recommended_photos', '6'::jsonb, 'Recommended gallery size shown to operators and sellers.', TRUE),
  ('marketplace_terms_version', '"2026-08-23"'::jsonb, 'Current direct-deal acknowledgement version.', FALSE)
ON CONFLICT (key) DO NOTHING;
