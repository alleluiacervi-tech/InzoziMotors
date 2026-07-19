-- Inzozi Motors — PostgreSQL schema
-- Fresh install: psql -U inzozi -d inzozi_motors -f src/schema.sql
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
  center          TEXT,                  -- null until Inzozi arranges the slot
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

-- ─── Rentals — Inzozi-owned fleet ─────────────────────────────────────────────

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
  status           TEXT NOT NULL DEFAULT 'active',  -- active | maintenance | retired
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
