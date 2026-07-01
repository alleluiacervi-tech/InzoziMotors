-- Inzozi Motors — PostgreSQL schema
-- Run: psql -U inzozi -d inzozi_motors -f src/schema.sql

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT,                          -- NULL for Google OAuth users
  role            TEXT NOT NULL DEFAULT 'buyer', -- buyer | seller | admin
  id_verified     TEXT NOT NULL DEFAULT 'none',  -- none | pending | approved | rejected
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
  inspection_score INT,                 -- 0–150 from the 150-pt check
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
  asking_price    INT NOT NULL,
  notes           TEXT,
  reference_images TEXT[],
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  reviewer_id     UUID REFERENCES users(id)
);

-- ─── Inspections ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID REFERENCES submissions(id) ON DELETE CASCADE,
  car_id          UUID REFERENCES cars(id) ON DELETE CASCADE,
  inspector_id    UUID REFERENCES users(id),
  center          TEXT NOT NULL,        -- Nyarutarama | Kicukiro | Kimironko
  scheduled_at    TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  results         JSONB,               -- { categoryName: { itemName: 'pass'|'flag'|'fail' } }
  score           INT,                 -- 0–150
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled'
  -- scheduled | in_progress | complete
);

-- ─── Handovers ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS handovers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      TEXT UNIQUE NOT NULL,  -- BK-XXXXX shown to users
  car_id          UUID REFERENCES cars(id),
  buyer_id        UUID NOT NULL REFERENCES users(id),
  seller_id       UUID NOT NULL REFERENCES users(id),
  center          TEXT NOT NULL,
  scheduled_date  TEXT NOT NULL,        -- e.g. "Jul 3, 2026"
  scheduled_time  TEXT NOT NULL,        -- e.g. "10:00 AM"
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | complete | cancelled
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
  meta            JSONB,           -- { carId, orderId, bookingId, ... }
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
CREATE INDEX IF NOT EXISTS idx_cars_status      ON cars(status);
CREATE INDEX IF NOT EXISTS idx_cars_seller      ON cars(seller_id);
CREATE INDEX IF NOT EXISTS idx_cars_make_model  ON cars(make, model);
CREATE INDEX IF NOT EXISTS idx_cars_price       ON cars(price);
CREATE INDEX IF NOT EXISTS idx_messages_conv    ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifs_user      ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_handovers_status ON handovers(status);
