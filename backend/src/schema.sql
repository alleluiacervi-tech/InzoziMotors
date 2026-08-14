-- Sawa — PostgreSQL schema
-- Fresh install: psql -U sawa -d sawa -f src/schema.sql
-- All statements are idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING).

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  phone           TEXT,
  password_hash   TEXT,                          -- NULL for Google OAuth users
  role            TEXT NOT NULL DEFAULT 'buyer', -- buyer | seller | admin
  id_verified     TEXT NOT NULL DEFAULT 'none',  -- none | pending | approved | rejected
  id_front_url    TEXT,
  id_back_url     TEXT,
  selfie_url      TEXT,
  id_submitted_at TIMESTAMPTZ,
  trust_score     INT NOT NULL DEFAULT 0,
  response_rate   INT NOT NULL DEFAULT 100,      -- % messages replied within 24h
  completed_sales INT NOT NULL DEFAULT 0,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Cars ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cars (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  make            TEXT NOT NULL,
  model           TEXT NOT NULL,
  year            INT NOT NULL,
  mileage         INT NOT NULL,          -- km
  fuel_type       TEXT,                  -- Petrol | Diesel | Hybrid | Electric
  transmission    TEXT,                  -- Automatic | Manual
  body_type       TEXT,                  -- SUV | Sedan | Hatchback | etc.
  color           TEXT,
  price           INT NOT NULL,          -- USD
  location        TEXT,                  -- Kigali neighbourhood
  drive_side      TEXT DEFAULT 'RHD',   -- RHD (Japanese imports) | LHD (local)
  vin             TEXT,
  description     TEXT,
  images          TEXT[],               -- array of image URLs / file paths
  inspected       BOOLEAN DEFAULT FALSE,
  inspection_score INT,                 -- 0–100 overall percentage score
  status          TEXT NOT NULL DEFAULT 'under_review',
  -- under_review | scheduled | inspecting | live | reserved | sold | archived
  views           INT NOT NULL DEFAULT 0,
  saves           INT NOT NULL DEFAULT 0,
  listed_at       TIMESTAMPTZ,
  sold_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Submissions (seller pipeline) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id          UUID REFERENCES cars(id) ON DELETE CASCADE,
  seller_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'under_review',
  -- under_review | scheduled | inspecting | inspected | live | rejected
  make            TEXT,
  model           TEXT,
  year            INT,
  mileage         INT,
  condition       TEXT,                  -- Excellent | Good | Fair
  transmission    TEXT,
  body_type       TEXT,
  color           TEXT,
  fuel_type       TEXT,
  asking_price    INT NOT NULL,
  notes           TEXT,                  -- seller notes
  admin_notes     TEXT,                  -- admin rejection/internal notes
  reference_images TEXT[],
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  reviewer_id     UUID REFERENCES users(id)
);

-- ─── Inspections ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id     UUID REFERENCES submissions(id) ON DELETE CASCADE,
  car_id            UUID REFERENCES cars(id) ON DELETE CASCADE,
  inspector_id      UUID REFERENCES users(id),
  center            TEXT NOT NULL,        -- Nyarutarama | Kicukiro | Kimironko
  scheduled_date    TEXT,                 -- e.g. "2026-07-10" (displayed in UI)
  scheduled_time    TEXT,                 -- e.g. "10:00 AM"
  scheduled_at      TIMESTAMPTZ,          -- parsed datetime for ordering
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  checklist_results JSONB,               -- { itemName: 'pass'|'flag'|'fail', ... }
  score             INT,                 -- 0–100 percentage
  notes             TEXT,
  status            TEXT NOT NULL DEFAULT 'scheduled'
  -- scheduled | in_progress | complete
);

-- ─── Handovers ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS handovers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      TEXT UNIQUE NOT NULL,  -- BK-XXXXX shown to users
  car_id          UUID REFERENCES cars(id),
  buyer_id        UUID NOT NULL REFERENCES users(id),
  seller_id       UUID NOT NULL REFERENCES users(id),
  center          TEXT,                  -- null until Sawa arranges the slot
  handover_date   TEXT,                  -- "Jul 3, 2026" (display string from app)
  handover_time   TEXT,                  -- "10:00 AM"
  contact_phone   TEXT,                  -- buyer's WhatsApp number for coordination
  agreed_price    INT,                   -- car price at time of booking (USD)
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | confirmed | complete | cancelled
  confirmed_by    UUID REFERENCES users(id),        -- admin who confirmed
  booked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at    TIMESTAMPTZ
);

-- ─── Conversations & Messages ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id          UUID REFERENCES cars(id) ON DELETE SET NULL,
  buyer_id        UUID NOT NULL REFERENCES users(id),
  seller_id       UUID NOT NULL REFERENCES users(id),
  last_message    TEXT,
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (car_id, buyer_id, seller_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id),
  text            TEXT NOT NULL,
  read            BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Notifications ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,   -- price_drop | new_message | listing_update | handover
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  read            BOOLEAN DEFAULT FALSE,
  meta            JSONB,           -- { carId, bookingId, ... }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Saved Cars ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_cars (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  car_id          UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  saved_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, car_id)
);

-- ─── Saved Searches ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_searches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  filters         JSONB NOT NULL,   -- { make, model, category, maxPrice, maxMileage }
  notify_enabled  BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Reviews ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id     UUID NOT NULL REFERENCES handovers(id),
  reviewer_id     UUID NOT NULL REFERENCES users(id),
  seller_id       UUID NOT NULL REFERENCES users(id),
  rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cars_status       ON cars(status);
CREATE INDEX IF NOT EXISTS idx_cars_seller       ON cars(seller_id);
CREATE INDEX IF NOT EXISTS idx_cars_make_model   ON cars(make, model);
CREATE INDEX IF NOT EXISTS idx_cars_price        ON cars(price);
CREATE INDEX IF NOT EXISTS idx_messages_conv     ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifs_user       ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_handovers_status  ON handovers(status);
CREATE INDEX IF NOT EXISTS idx_submissions_seller ON submissions(seller_id);

-- ─── Migration: add columns to existing installs ──────────────────────────────
-- Safe to run repeatedly; ADD COLUMN IF NOT EXISTS is idempotent.
ALTER TABLE users       ADD COLUMN IF NOT EXISTS phone           TEXT;
ALTER TABLE handovers   ADD COLUMN IF NOT EXISTS contact_phone   TEXT;
ALTER TABLE handovers   ALTER COLUMN center        DROP NOT NULL;
ALTER TABLE handovers   ALTER COLUMN handover_date DROP NOT NULL;
ALTER TABLE handovers   ALTER COLUMN handover_time DROP NOT NULL;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS inspection_center TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS inspection_date   TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS inspection_time   TEXT;
ALTER TABLE users       ADD COLUMN IF NOT EXISTS id_front_url    TEXT;
ALTER TABLE users       ADD COLUMN IF NOT EXISTS id_back_url     TEXT;
ALTER TABLE users       ADD COLUMN IF NOT EXISTS selfie_url      TEXT;
ALTER TABLE users       ADD COLUMN IF NOT EXISTS id_submitted_at TIMESTAMPTZ;

-- Token revocation. JWTs are stateless and long-lived (30d), so without this
-- there is no way to end a session: changing a password, resetting it, or
-- deleting the account all left previously-issued tokens working until they
-- expired on their own. Every token carries the version it was minted at;
-- requireAuth compares it, and bumping this column invalidates every token
-- issued before the bump.
ALTER TABLE users       ADD COLUMN IF NOT EXISTS token_version   INT NOT NULL DEFAULT 0;
-- Admin-managed commercial seller accounts. Showrooms are seller accounts
-- with an explicit business identity; they are never self-declared by a user.
ALTER TABLE users       ADD COLUMN IF NOT EXISTS seller_type       TEXT;
ALTER TABLE users       ADD COLUMN IF NOT EXISTS business_name     TEXT;
ALTER TABLE users       ADD COLUMN IF NOT EXISTS admin_created     BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users       ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users       ADD COLUMN IF NOT EXISTS invite_token_hash TEXT;
ALTER TABLE users       ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;
ALTER TABLE users       ADD COLUMN IF NOT EXISTS invited_by        UUID REFERENCES users(id) ON DELETE SET NULL;

-- Account lifecycle (Apple 5.1.1(v) / Google Play deletion requirements).
-- Soft delete: the row survives so completed handovers, reviews and platform
-- fees keep their foreign keys, but every piece of personal data on it is
-- overwritten and the account can never be signed into again.
ALTER TABLE users       ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_active ON users(id) WHERE deleted_at IS NULL;

-- ─── Admin audit history ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON admin_audit_log(actor_id, created_at DESC);

-- ─── Vehicle import orders ──────────────────────────────────────────────────
-- A separate workflow from local marketplace handovers. All money is integer
-- RWF and all changes are appended to import_order_events for a durable trail.
CREATE TABLE IF NOT EXISTS import_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_ref             TEXT UNIQUE NOT NULL,
  buyer_id              UUID NOT NULL REFERENCES users(id),
  assigned_admin_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  status                TEXT NOT NULL DEFAULT 'enquiry',
  origin_country        TEXT NOT NULL,
  make                  TEXT NOT NULL,
  model                 TEXT NOT NULL,
  year                  INT,
  vin                   TEXT,
  supplier_reference    TEXT,
  specification         JSONB NOT NULL DEFAULT '{}'::jsonb,
  quoted_total_rwf      BIGINT,
  exchange_rate         NUMERIC(14,4),
  quote_expires_at      TIMESTAMPTZ,
  delivery_estimate     TEXT,
  customer_notes        TEXT,
  internal_notes        TEXT,
  agreement_accepted_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT import_order_status_check CHECK (status IN (
    'enquiry','quoted','agreement_pending','deposit_due','deposit_review',
    'ordered','inspected_abroad','shipping_booked','in_transit','arrived',
    'kigali_inspection','balance_due','balance_review','customs_clearance',
    'ready_for_handover','completed','cancelled'
  )),
  CONSTRAINT import_quote_nonnegative CHECK (quoted_total_rwf IS NULL OR quoted_total_rwf >= 0)
);

CREATE TABLE IF NOT EXISTS import_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_order_id UUID NOT NULL REFERENCES import_orders(id) ON DELETE CASCADE,
  milestone       TEXT NOT NULL CHECK (milestone IN ('initial_50','final_50','adjustment','refund')),
  amount_rwf      BIGINT NOT NULL CHECK (amount_rwf > 0),
  status          TEXT NOT NULL DEFAULT 'due' CHECK (status IN ('due','submitted','reviewed','verified','rejected','refunded')),
  bank_reference  TEXT,
  proof_url       TEXT,
  submitted_at    TIMESTAMPTZ,
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_at     TIMESTAMPTZ,
  verified_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_order_id UUID NOT NULL REFERENCES import_orders(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL,
  label           TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  customer_visible BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_order_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_order_id UUID NOT NULL REFERENCES import_orders(id) ON DELETE CASCADE,
  actor_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type      TEXT NOT NULL,
  from_status     TEXT,
  to_status       TEXT,
  summary         TEXT NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  customer_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_agreements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_order_id   UUID NOT NULL REFERENCES import_orders(id) ON DELETE CASCADE,
  version           INT NOT NULL,
  terms_snapshot    JSONB NOT NULL,
  issued_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  issued_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  accepted_at       TIMESTAMPTZ,
  acceptance_ip     TEXT,
  superseded_at     TIMESTAMPTZ,
  UNIQUE (import_order_id, version)
);

CREATE INDEX IF NOT EXISTS idx_import_orders_buyer ON import_orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_orders_status ON import_orders(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_payments_order ON import_payments(import_order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_import_events_order ON import_order_events(import_order_id, created_at);

CREATE TABLE IF NOT EXISTS import_shipments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_order_id   UUID NOT NULL UNIQUE REFERENCES import_orders(id) ON DELETE CASCADE,
  supplier_name     TEXT,
  supplier_country  TEXT,
  carrier           TEXT,
  booking_reference TEXT,
  bill_of_lading    TEXT,
  vessel_or_flight  TEXT,
  departure_port    TEXT,
  arrival_port      TEXT,
  departed_at       TIMESTAMPTZ,
  estimated_arrival TIMESTAMPTZ,
  arrived_at        TIMESTAMPTZ,
  last_location     TEXT,
  updated_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS make            TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS model           TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS year            INT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS mileage         INT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS condition       TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS transmission    TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS body_type       TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS color           TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS fuel_type       TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS admin_notes     TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS reference_images TEXT[];

-- One inspection per submission — rescheduling updates, never duplicates.
-- Clean historical duplicates first so the index can build on old installs.
DELETE FROM inspections a USING inspections b
  WHERE a.submission_id = b.submission_id AND a.ctid < b.ctid;
CREATE UNIQUE INDEX IF NOT EXISTS uq_inspections_submission ON inspections(submission_id);
-- One review per completed handover
DELETE FROM reviews a USING reviews b
  WHERE a.handover_id = b.handover_id AND a.ctid < b.ctid;
CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_handover ON reviews(handover_id);

ALTER TABLE inspections ADD COLUMN IF NOT EXISTS scheduled_date  TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS scheduled_time  TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS checklist_results JSONB;
-- Rename old 'results' column if it exists (run manually if upgrading from earlier schema)
-- ALTER TABLE inspections RENAME COLUMN results TO checklist_results;

ALTER TABLE handovers   ADD COLUMN IF NOT EXISTS handover_date   TEXT;
ALTER TABLE handovers   ADD COLUMN IF NOT EXISTS handover_time   TEXT;
ALTER TABLE handovers   ADD COLUMN IF NOT EXISTS agreed_price    INT;
-- Migrate old column names if upgrading from earlier schema:
-- UPDATE handovers SET handover_date = scheduled_date, handover_time = scheduled_time
--   WHERE handover_date IS NULL AND scheduled_date IS NOT NULL;

-- ─── Rentals — Sawa-owned fleet ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rental_cars (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  make             TEXT,
  model            TEXT,
  year             INT,
  category         TEXT,
  seats            INT DEFAULT 5,
  fuel             TEXT,
  transmission     TEXT,
  mileage          INT,
  daily_rate       INT NOT NULL,
  weekly_rate      INT,
  deposit          INT NOT NULL DEFAULT 0,
  min_days         INT NOT NULL DEFAULT 1,
  inspected        BOOLEAN NOT NULL DEFAULT TRUE,
  inspection_score INT,
  rating           NUMERIC(2,1),
  trips            INT NOT NULL DEFAULT 0,
  location         TEXT,                 -- neighbourhood the car is kept in
  images           TEXT[],
  safari_ready     BOOLEAN NOT NULL DEFAULT FALSE,  -- 4x4 fit for park trips
  status           TEXT NOT NULL DEFAULT 'active',  -- active | maintenance | retired
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE rental_cars ADD COLUMN IF NOT EXISTS safari_ready BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS rental_bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref     TEXT UNIQUE NOT NULL,             -- RB-XXXXX shown to users
  rental_car_id   UUID NOT NULL REFERENCES rental_cars(id) ON DELETE CASCADE,
  renter_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date      DATE NOT NULL,
  days            INT NOT NULL,
  pickup_window   TEXT,                 -- "Morning · 8AM–12PM"
  center          TEXT,                 -- home center, or airport meet & greet
  airport_pickup  BOOLEAN NOT NULL DEFAULT FALSE,
  subtotal        INT NOT NULL,
  deposit         INT NOT NULL,
  pickup_fee      INT NOT NULL DEFAULT 0,
  total           INT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'upcoming', -- upcoming | active | completed | cancelled
  pickup_record   JSONB,               -- staff condition record + renter agreement at pickup
  return_record   JSONB,               -- same at return
  booked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rental_bookings_car    ON rental_bookings(rental_car_id);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_renter ON rental_bookings(renter_id);

-- ─── Price history — one row per price change on a listing ───────────────────
CREATE TABLE IF NOT EXISTS price_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id      UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  price       INT NOT NULL,
  changed_by  UUID REFERENCES users(id),
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_price_history_car ON price_history(car_id);

-- ─── Revenue — fees recorded at business events (collection is offline) ───────
CREATE TABLE IF NOT EXISTS platform_fees (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id  UUID REFERENCES handovers(id),
  seller_id    UUID NOT NULL REFERENCES users(id),
  fee_type     TEXT NOT NULL CHECK (fee_type IN ('commission', 'certification', 'featured')),
  amount       INT NOT NULL CHECK (amount >= 0),
  status       TEXT NOT NULL DEFAULT 'due' CHECK (status IN ('due', 'paid', 'waived')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_platform_fees_seller ON platform_fees(seller_id);

-- Certification is billed per SUBMISSION (the car that was inspected), not per
-- handover — it is earned when the 150-point check completes, whether or not
-- the car ever sells. The partial unique index makes re-inspection after
-- remedial work idempotent: one certification fee per car, ever.
ALTER TABLE platform_fees ADD COLUMN IF NOT EXISTS submission_id UUID REFERENCES submissions(id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_fees_certification
  ON platform_fees(submission_id) WHERE fee_type = 'certification';

ALTER TABLE cars ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;

-- ─── Inspection centers — capacity-aware scheduling ──────────────────────────
CREATE TABLE IF NOT EXISTS inspection_centers (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  area           TEXT,
  address        TEXT,
  daily_capacity INT NOT NULL DEFAULT 8,
  active         BOOLEAN NOT NULL DEFAULT TRUE
);
INSERT INTO inspection_centers (id, name, area, address, daily_capacity) VALUES
  ('nyarutarama', 'Nyarutarama Center', 'Nyarutarama', 'KG 9 Ave, Nyarutarama', 12),
  ('kicukiro',    'Kicukiro Center',    'Kicukiro',    'KN 5 Rd, Kicukiro',      8),
  ('kimironko',   'Kimironko Center',   'Kimironko',   'KG 28 St, Kimironko',    5)
ON CONFLICT (id) DO NOTHING;

-- ─── Structured listing photos (36-angle standard) ───────────────────────────
-- cars.images TEXT[] stays for compatibility; this table adds angle + order.
CREATE TABLE IF NOT EXISTS car_photos (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id    UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  angle_key TEXT,                      -- e.g. front, rear_left_45, wheel_fl
  url       TEXT NOT NULL,
  position  INT NOT NULL DEFAULT 0,
  UNIQUE (car_id, position)
);

-- ─── Referrals ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  code        TEXT UNIQUE NOT NULL,
  uses        INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS referral_redemptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT NOT NULL REFERENCES referrals(code),
  redeemed_by  UUID NOT NULL REFERENCES users(id),
  redeemed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at  TIMESTAMPTZ,             -- set when the discount is applied to a commission
  UNIQUE (code, redeemed_by)
);
ALTER TABLE referral_redemptions ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ;

-- ─── Password resets — 6-digit codes, hashed like passwords ──────────────────
-- No mail/SMS provider exists yet; the code is logged server-side until Phase 8.
CREATE TABLE IF NOT EXISTS password_resets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  attempts    INT NOT NULL DEFAULT 0,     -- 5 wrong guesses burns the code
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0;

-- ─── Device tokens — Expo push targets ───────────────────────────────────────
-- UNIQUE(token): a phone re-used by another account moves, never duplicates.
CREATE TABLE IF NOT EXISTS device_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  platform    TEXT,                       -- ios | android | web
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (token)
);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);

-- ─── Disputes — post-handover mediation (7-day return window) ────────────────
CREATE TABLE IF NOT EXISTS disputes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id  UUID NOT NULL REFERENCES handovers(id),
  raised_by    UUID NOT NULL REFERENCES users(id),
  reason       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'rejected')),
  resolution   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ
);
