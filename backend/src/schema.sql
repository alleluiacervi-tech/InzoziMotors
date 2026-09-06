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
  -- How identity was established. 'documents' means uploads were reviewed here;
  -- the other three are off-platform and the note IS the evidence, enforced by
  -- users_offline_identity_attested_check below (migration 0029).
  id_verification_method TEXT,   -- documents | in_person | business_document | known_client
  id_verification_note   TEXT,
  id_verification_ref    TEXT,
  id_verified_at         TIMESTAMPTZ,
  id_verified_by         UUID REFERENCES users(id),
  trust_score     INT NOT NULL DEFAULT 0,
  response_rate   INT NOT NULL DEFAULT 100,      -- % messages replied within 24h
  completed_sales INT NOT NULL DEFAULT 0,
  avatar_url      TEXT,
  -- How many cars this seller may hold on the marketplace at once (live or
  -- paused). NULL = no cap, which is what every seller had before migration
  -- 0032. Enforced at PUBLICATION only, in PATCH /cars/:id/status: refusing a
  -- submission would turn away a car we have not yet inspected, and the
  -- inspection is what this business sells. Lowering a cap below a seller's
  -- current count never unpublishes anything — they sit over cap, the Action
  -- Center says so, and the next publish is refused until they are back under.
  max_active_listings INT,
  listing_cap_note    TEXT,
  listing_cap_set_at  TIMESTAMPTZ,
  listing_cap_set_by  UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A cap of 0 is a suspension wearing a quota's clothes; account_status is
  -- where an operator should say that, visibly.
  CONSTRAINT users_max_active_listings_check CHECK (
    max_active_listings IS NULL OR max_active_listings >= 1
  ),
  -- A commercial term with no author is one nobody can defend later. Same
  -- discipline as id_verified_by on an offline identity attestation.
  CONSTRAINT users_listing_cap_attributed_check CHECK (
    max_active_listings IS NULL OR listing_cap_set_by IS NOT NULL
  ),
  CONSTRAINT users_id_verification_method_check CHECK (
    id_verification_method IS NULL
    OR id_verification_method IN ('documents', 'in_person', 'business_document', 'known_client')
  ),
  CONSTRAINT users_offline_identity_attested_check CHECK (
    id_verification_method IS NULL
    OR id_verification_method = 'documents'
    OR (id_verification_note IS NOT NULL AND length(btrim(id_verification_note)) >= 10)
  )
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
  vin_key         TEXT GENERATED ALWAYS AS
    (NULLIF(regexp_replace(upper(vin), '[^A-Z0-9]', '', 'g'), '')) STORED,
  description     TEXT,
  images          TEXT[],               -- array of image URLs / file paths
  inspected       BOOLEAN DEFAULT FALSE,
  inspection_score INT,                 -- canonical 0–150 inspection score
  status          TEXT NOT NULL DEFAULT 'under_review',
  -- draft | under_review | scheduled | inspecting | approved | live | paused | sold | rejected | archived
  views           INT NOT NULL DEFAULT 0,
  saves           INT NOT NULL DEFAULT 0,
  listed_at       TIMESTAMPTZ,
  sold_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Featured placements (the home-screen banner) ────────────────────────────
-- Admin-controlled merchandising. kind='sponsored' is PAID placement and must
-- be disclosed to buyers as such — the whole product is independent
-- verification, and a paid slot that looks like an editorial pick spends that.
-- amount_rwf is RECORDED, never collected. See migration 0033.
CREATE TABLE IF NOT EXISTS featured_placements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id        UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,

  -- editorial   we chose this car. Our judgement, our reputation.
  -- hot_deal    we think the price is notable. Still our judgement.
  -- sponsored   the seller paid for the placement. Disclosed to the buyer.
  kind          TEXT NOT NULL,

  -- Lower sorts first. Not unique: two cars may share a position and fall back
  -- to the newest placement, which is friendlier than refusing an operator's
  -- edit because a number collided.
  slot          INT NOT NULL DEFAULT 100,

  starts_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at       TIMESTAMPTZ NOT NULL,

  -- An operator's own line, shown on the banner in place of the car's title
  -- when they want to say something specific ("Ex-embassy, one owner").
  headline      TEXT,

  -- What was agreed, in whole RWF, for a sponsored placement. RECORDED, never
  -- collected: there is no gateway here and there is not going to be one. It
  -- exists so the money side is legible, the same way inspection fees are.
  amount_rwf    BIGINT,

  created_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at  TIMESTAMPTZ,
  cancelled_by  UUID REFERENCES users(id),
  cancel_reason TEXT,

  CONSTRAINT featured_placements_kind_check
    CHECK (kind IN ('editorial', 'hot_deal', 'sponsored')),

  CONSTRAINT featured_placements_window_check
    CHECK (ends_at > starts_at),

  CONSTRAINT featured_placements_slot_check
    CHECK (slot >= 1 AND slot <= 999),

  -- Money is only meaningful on a paid placement, and a paid placement with no
  -- amount is a favour nobody wrote down. Both directions are refused.
  CONSTRAINT featured_placements_sponsorship_check CHECK (
    (kind = 'sponsored' AND amount_rwf IS NOT NULL AND amount_rwf >= 0)
    OR (kind <> 'sponsored' AND amount_rwf IS NULL)
  ),

  -- A cancellation with no author or no reason is an unexplained disappearance
  -- from a paid campaign. Same discipline as a listing rejection.
  CONSTRAINT featured_placements_cancellation_check CHECK (
    cancelled_at IS NULL
    OR (cancelled_by IS NOT NULL AND cancel_reason IS NOT NULL
        AND length(btrim(cancel_reason)) >= 3)
  )
);

-- One live placement per car — enforced in POST /cars/:id/feature with a 409,
-- not here.
--
-- The obvious index is `UNIQUE(car_id) WHERE cancelled_at IS NULL AND ends_at >
-- NOW()`, and Postgres refuses it: NOW() is not IMMUTABLE and a partial index
-- predicate has to be. The alternative that WOULD work is an EXCLUDE over a
-- tstzrange, which needs btree_gist — a dependency migration 0025 deliberately
-- declined to take for the same shape of problem in rental subscriptions.
-- Same answer here, for consistency: the route locks the car row and refuses an
-- overlapping placement, and this index makes that check cheap.

-- The banner read: in-window, not cancelled, ordered by slot. Also the index
-- the overlap check above rides on.
CREATE INDEX IF NOT EXISTS idx_featured_placements_window
  ON featured_placements(car_id, starts_at, ends_at, slot)
  WHERE cancelled_at IS NULL;

COMMENT ON TABLE featured_placements IS
  'Admin-controlled home-screen banner. kind=sponsored is paid placement and MUST be disclosed to buyers; amount_rwf is recorded, never collected.';

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
  reviewer_id     UUID REFERENCES users(id),
  -- What the vehicle is being listed for (migration 0030). Affects no gate:
  -- publication and rental visibility read the inspection evidence, not this.
  -- It exists so a rental intake is not described everywhere as a car awaiting
  -- sale, and so a provider does not have to file a sale submission for a van
  -- they never intend to sell.
  purpose         TEXT NOT NULL DEFAULT 'sale',
  created_by      UUID REFERENCES users(id),   -- the admin who filed it, if any
  CONSTRAINT submissions_purpose_check CHECK (purpose IN ('sale', 'rental', 'both'))
);
CREATE INDEX IF NOT EXISTS idx_submissions_purpose
  ON submissions(purpose) WHERE purpose <> 'sale';

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
  checklist_results JSONB,               -- canonical item id -> pass|flag|fail
  -- Which categories were answered by a single attestation rather than item by
  -- item, and by whom (migration 0042). Only NON-critical items can ever be
  -- filled this way; the server decides which, from inspection-policy.js.
  checklist_attestations JSONB NOT NULL DEFAULT '{}'::jsonb,
  checklist_version TEXT,
  score             INT CHECK (score IS NULL OR score BETWEEN 0 AND 150),
  passed            BOOLEAN NOT NULL DEFAULT FALSE,
  critical_failures JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes             TEXT,
  status            TEXT NOT NULL DEFAULT 'scheduled',
  -- scheduled | in_progress | complete

  -- 'listing'    — evidence for a Sawa listing, always tied to a submission.
  -- 'standalone' — a paid walk-in check on a vehicle Sawa does not list.
  kind              TEXT NOT NULL DEFAULT 'listing',
  customer_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  -- A walk-in carries its own vehicle identity; a listing inspection reads
  -- these from its submission or its car.
  vehicle_make      TEXT,
  vehicle_model     TEXT,
  vehicle_year      INT,
  vehicle_vin       TEXT,
  -- Normalised by the database so no write path can forget (migration 0027).
  -- Deliberately no 17-character rule: Rwanda's fleet is largely Japanese
  -- imports carrying a chassis number, not an ISO VIN. See src/lib/vin.js.
  vehicle_vin_key   TEXT GENERATED ALWAYS AS
    (NULLIF(regexp_replace(upper(vehicle_vin), '[^A-Z0-9]', '', 'g'), '')) STORED,
  vehicle_plate     TEXT,
  vehicle_mileage   INT,

  CONSTRAINT inspections_kind_check CHECK (kind IN ('listing', 'standalone')),
  -- The safety property, in the database rather than in seven gate queries: a
  -- standalone inspection can never hold a submission_id or a car_id, and
  -- every publication/contact/rental gate requires both. See migration 0022.
  CONSTRAINT inspections_kind_shape_check CHECK (
    (kind = 'listing' AND submission_id IS NOT NULL)
    OR
    (kind = 'standalone'
       AND submission_id IS NULL AND car_id IS NULL
       AND customer_user_id IS NOT NULL AND vehicle_make IS NOT NULL
       AND vehicle_model IS NOT NULL AND vehicle_year IS NOT NULL)
  )
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
-- One private 1:1 thread per buyer<->seller pair (Instagram-style DMs), keyed
-- on the person pair, not the car. car_id is the "first discussed" listing
-- context only. Direction is meaningful: buyer = the one who reached out,
-- seller = the car's owner (migration 0041 re-keyed this from per-car).
CREATE TABLE IF NOT EXISTS conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id          UUID REFERENCES cars(id) ON DELETE SET NULL,
  buyer_id        UUID NOT NULL REFERENCES users(id),
  seller_id       UUID NOT NULL REFERENCES users(id),
  last_message    TEXT,
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conversations_buyer_id_seller_id_key UNIQUE (buyer_id, seller_id)
);
CREATE INDEX IF NOT EXISTS idx_conversations_buyer  ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller ON conversations(seller_id);

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
-- Counting a seller's occupied marketplace slots runs on every publish.
CREATE INDEX IF NOT EXISTS idx_cars_seller_active
  ON cars(seller_id) WHERE status IN ('live', 'paused');
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
ALTER TABLE users       ADD COLUMN IF NOT EXISTS whatsapp_phone    TEXT;
ALTER TABLE users       ADD COLUMN IF NOT EXISTS phone_visible     BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users       ADD COLUMN IF NOT EXISTS whatsapp_visible  BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users       ADD COLUMN IF NOT EXISTS business_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users       ADD COLUMN IF NOT EXISTS contact_consent_at TIMESTAMPTZ;
ALTER TABLE users       ADD COLUMN IF NOT EXISTS marketplace_terms_accepted_at TIMESTAMPTZ;
ALTER TABLE users       ADD COLUMN IF NOT EXISTS marketplace_terms_version TEXT;

-- Account lifecycle (Apple 5.1.1(v) / Google Play deletion requirements).
-- Soft delete: the row survives so completed handovers, reviews and platform
-- fees keep their foreign keys, but every piece of personal data on it is
-- overwritten and the account can never be signed into again.
ALTER TABLE users       ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMPTZ;
ALTER TABLE users       ADD COLUMN IF NOT EXISTS account_status  TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users       ADD COLUMN IF NOT EXISTS suspended_at    TIMESTAMPTZ;
ALTER TABLE users       ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_status_check;
ALTER TABLE users ADD CONSTRAINT users_account_status_check
  CHECK (account_status IN ('active', 'suspended', 'closed'));
CREATE INDEX IF NOT EXISTS idx_users_active ON users(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status) WHERE deleted_at IS NULL;

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

-- Verified-classifieds policy (migration 0018).
ALTER TABLE cars ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS archive_reason TEXT;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS review_notes TEXT;

CREATE TABLE IF NOT EXISTS listing_contact_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('phone','whatsapp','in_app')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT NOT NULL,
  editable BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Generated-document registry. Production is migrated by
-- migrations/0016_document_registry.sql; this mirror keeps fresh schema users
-- and editor tooling aware of the current model.
CREATE TABLE IF NOT EXISTS document_counters (
  kind TEXT NOT NULL, year INT NOT NULL, last_number INT NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, year)
);
CREATE TABLE IF NOT EXISTS generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), document_number TEXT UNIQUE NOT NULL,
  kind TEXT NOT NULL, subject_type TEXT NOT NULL, subject_id UUID NOT NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL, title TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'draft',
  filename TEXT, mime_type TEXT NOT NULL DEFAULT 'application/pdf', file_path TEXT,
  file_sha256 TEXT, file_size BIGINT, page_count INT, snapshot JSONB NOT NULL,
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), issued_at TIMESTAMPTZ,
  superseded_at TIMESTAMPTZ, UNIQUE (kind, subject_type, subject_id, version)
);

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
  -- Sawa's own cost, kept apart from quoted_total_rwf so margin is visible.
  -- One admin-editable figure, not a line-item ledger — see migration 0039.
  actual_cost_rwf       BIGINT,
  cost_note             TEXT,
  cost_recorded_at      TIMESTAMPTZ,
  cost_recorded_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT import_order_status_check CHECK (status IN (
    'enquiry','quoted','agreement_pending','deposit_due','deposit_review',
    'ordered','inspected_abroad','shipping_booked','in_transit','arrived',
    'kigali_inspection','balance_due','balance_review','customs_clearance',
    'ready_for_handover','completed','cancelled'
  )),
  CONSTRAINT import_quote_nonnegative CHECK (quoted_total_rwf IS NULL OR quoted_total_rwf >= 0),
  CONSTRAINT import_cost_nonnegative CHECK (actual_cost_rwf IS NULL OR actual_cost_rwf >= 0)
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
  inspected        BOOLEAN NOT NULL DEFAULT FALSE,
  inspection_score INT,
  inspection_id    UUID REFERENCES inspections(id) ON DELETE RESTRICT,
  rating           NUMERIC(2,1),
  trips            INT NOT NULL DEFAULT 0,
  location         TEXT,                 -- neighbourhood the car is kept in
  images           TEXT[],
  safari_ready     BOOLEAN NOT NULL DEFAULT FALSE,  -- 4x4 fit for park trips
  -- rentals.js validated this set on write; migration 0025 finally constrains it.
  -- 'pending_review' (0037): a provider-proposed row, exactly as invisible to
  -- public reads as 'maintenance' — only requireAdmin routes move it further.
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'maintenance', 'retired', 'pending_review')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE rental_cars ADD COLUMN IF NOT EXISTS safari_ready BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE rental_cars ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE rental_cars ADD COLUMN IF NOT EXISTS retired_at TIMESTAMPTZ;
ALTER TABLE rental_cars ADD COLUMN IF NOT EXISTS retirement_reason TEXT;
-- Provider-set, informational only (0037) — no public read filters on it.
ALTER TABLE rental_cars ADD COLUMN IF NOT EXISTS unavailable_until DATE;
-- Partial on retired_at (migration 0030): one inspection may back a sale
-- listing and a rental car at once — the evidence says the vehicle passed, which
-- is true either way — and retiring a rental frees its evidence for a
-- replacement row instead of burning it permanently.
CREATE UNIQUE INDEX IF NOT EXISTS uq_rental_cars_inspection
  ON rental_cars(inspection_id) WHERE inspection_id IS NOT NULL AND retired_at IS NULL;

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
  preferred_channel TEXT NOT NULL DEFAULT 'in_app' CHECK (preferred_channel IN ('in_app','phone','whatsapp')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','closed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

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
  -- Nullable only for 'inspection': a walk-in customer is not a seller.
  -- platform_fees_seller_shape_check (0023) still requires it everywhere else.
  seller_id    UUID REFERENCES users(id),
  -- 'rental' was added by migration 0009 and never mirrored here, so a database
  -- built from this file disagreed with one built from migrations. Repaired in
  -- 0023 along with 'inspection'.
  fee_type     TEXT NOT NULL CHECK (fee_type IN ('commission', 'certification', 'featured', 'rental', 'inspection', 'report')),
  amount       INT NOT NULL CHECK (amount >= 0),
  status       TEXT NOT NULL DEFAULT 'due' CHECK (status IN ('due', 'paid', 'waived')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_platform_fees_seller ON platform_fees(seller_id);

-- Vehicle identity lookups (migration 0027). Partial: most rows carry no VIN
-- and indexing their NULLs helps nobody.
CREATE INDEX IF NOT EXISTS idx_inspections_vin_key
  ON inspections(vehicle_vin_key) WHERE vehicle_vin_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cars_vin_key
  ON cars(vin_key) WHERE vin_key IS NOT NULL;

-- submission_id was added for a per-submission 'certification' fee that was
-- scaffolded in 0001 but never billed by any code path — sellers pay nothing
-- for a listing inspection. Migration 0040 drops the partial unique index
-- that existed only to make that fee idempotent; the column stays, unused.
ALTER TABLE platform_fees ADD COLUMN IF NOT EXISTS submission_id UUID REFERENCES submissions(id);

-- ── Walk-in inspection fees (migration 0023) ─────────────────────────────────
-- Collected offline and recorded here. A correction is void-and-re-record, so
-- the original row and the reason it was wrong both survive; 'waived' is the
-- voided state, and excluding it from the unique index frees the slot.
ALTER TABLE platform_fees ADD COLUMN IF NOT EXISTS inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE;
ALTER TABLE platform_fees ADD COLUMN IF NOT EXISTS payer_user_id UUID REFERENCES users(id);
ALTER TABLE platform_fees ADD COLUMN IF NOT EXISTS method       TEXT;
ALTER TABLE platform_fees ADD COLUMN IF NOT EXISTS reference    TEXT;
ALTER TABLE platform_fees ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ;
ALTER TABLE platform_fees ADD COLUMN IF NOT EXISTS recorded_by  UUID REFERENCES users(id);
ALTER TABLE platform_fees ADD COLUMN IF NOT EXISTS voided_at    TIMESTAMPTZ;
ALTER TABLE platform_fees ADD COLUMN IF NOT EXISTS voided_by    UUID REFERENCES users(id);
ALTER TABLE platform_fees ADD COLUMN IF NOT EXISTS void_reason  TEXT;

ALTER TABLE platform_fees DROP CONSTRAINT IF EXISTS platform_fees_seller_shape_check;
ALTER TABLE platform_fees ADD CONSTRAINT platform_fees_seller_shape_check
  CHECK (fee_type IN ('inspection', 'report') OR seller_id IS NOT NULL);

-- A report sale names its inspection and its payer, and claims no seller
-- (migration 0031). Deliberately NOT covered by uq_platform_fees_inspection:
-- that index permits one live row per inspection, and selling a second copy of
-- a report to a second buyer is the point of the entitlement model.
ALTER TABLE platform_fees DROP CONSTRAINT IF EXISTS platform_fees_report_shape_check;
ALTER TABLE platform_fees ADD CONSTRAINT platform_fees_report_shape_check
  CHECK (fee_type <> 'report'
         OR (inspection_id IS NOT NULL AND payer_user_id IS NOT NULL AND seller_id IS NULL));
ALTER TABLE platform_fees DROP CONSTRAINT IF EXISTS platform_fees_method_check;
ALTER TABLE platform_fees ADD CONSTRAINT platform_fees_method_check
  CHECK (method IS NULL OR method IN ('cash', 'mobile_money', 'bank_transfer'));
ALTER TABLE platform_fees DROP CONSTRAINT IF EXISTS platform_fees_inspection_shape_check;
ALTER TABLE platform_fees ADD CONSTRAINT platform_fees_inspection_shape_check
  CHECK (fee_type <> 'inspection'
         OR (inspection_id IS NOT NULL AND payer_user_id IS NOT NULL AND seller_id IS NULL));

CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_fees_inspection
  ON platform_fees(inspection_id) WHERE fee_type = 'inspection' AND status <> 'waived';

-- ─── Report entitlements ─────────────────────────────────────────────────────
-- Who may read an inspection report, and on what basis (migration 0031).
-- Access is the existence of a live row here, not a column on the inspection —
-- so the same report can be sold to a second buyer, given to the seller, or
-- passed on when the vehicle changes hands. A sale must point at the money and
-- a free grant must carry a written reason; both are CHECK constraints rather
-- than rules a future route could forget.
CREATE TABLE IF NOT EXISTS report_entitlements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id  UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source         TEXT NOT NULL,   -- paid_customer | purchased | seller_copy | admin_grant
  fee_id         UUID REFERENCES platform_fees(id),
  note           TEXT,
  granted_by     UUID REFERENCES users(id),
  granted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at     TIMESTAMPTZ,
  revoked_by     UUID REFERENCES users(id),
  revoke_reason  TEXT,
  CONSTRAINT report_entitlements_source_check
    CHECK (source IN ('paid_customer', 'purchased', 'seller_copy', 'admin_grant')),
  CONSTRAINT report_entitlements_purchase_check
    CHECK (source <> 'purchased' OR fee_id IS NOT NULL),
  CONSTRAINT report_entitlements_grant_attested_check
    CHECK (source <> 'admin_grant'
           OR (note IS NOT NULL AND length(btrim(note)) >= 10))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_report_entitlements_live
  ON report_entitlements(inspection_id, user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_report_entitlements_user
  ON report_entitlements(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_platform_fees_payer ON platform_fees(payer_user_id);

ALTER TABLE cars ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;

-- ─── Rental listing subscriptions (migration 0025) ───────────────────────────
-- A provider pays per vehicle to keep a car in the public catalogue. Collected
-- offline and recorded here. A lapse hides the car by falling out of the three
-- public predicates in routes/rentals.js — this backend has no scheduler, and
-- expiry that needs one is expiry that eventually does not happen.
--
-- rental_cars.status is never touched on lapse: status is what the operator
-- said about the vehicle, the subscription is what the business says about the
-- listing, and a renewal must not republish a car somebody parked.
CREATE TABLE IF NOT EXISTS rental_subscriptions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_car_id  UUID NOT NULL REFERENCES rental_cars(id) ON DELETE CASCADE,
  amount_rwf     INT NOT NULL CHECK (amount_rwf >= 0),
  method         TEXT CHECK (method IS NULL OR method IN ('cash', 'mobile_money', 'bank_transfer')),
  reference      TEXT,
  starts_on      DATE NOT NULL,
  ends_on        DATE NOT NULL,
  note           TEXT,
  recorded_by    UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  voided_at      TIMESTAMPTZ,
  voided_by      UUID REFERENCES users(id),
  void_reason    TEXT,
  CONSTRAINT rental_subscriptions_period_check CHECK (ends_on >= starts_on)
);
CREATE INDEX IF NOT EXISTS idx_rental_subscriptions_car
  ON rental_subscriptions(rental_car_id, ends_on DESC) WHERE voided_at IS NULL;

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
  -- Plate masking (migration 0028). `url` is the PUBLIC file with the badge
  -- burned in; `original_url` is the untouched photo on a path server.js
  -- denies. Four corners as image fractions, so a perspective fit later needs
  -- no migration and the geometry survives a resize.
  original_url TEXT,
  plate_mask   JSONB,
  plate_state  TEXT NOT NULL DEFAULT 'unreviewed',
  UNIQUE (car_id, position),
  CONSTRAINT car_photos_plate_state_check CHECK (plate_state IN ('unreviewed', 'masked', 'none')),
  -- A masked photo needs the geometry and the original, or it can never be
  -- re-rendered when the badge design changes.
  CONSTRAINT car_photos_mask_shape_check
    CHECK (plate_state <> 'masked' OR (plate_mask IS NOT NULL AND original_url IS NOT NULL))
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

-- ─── Vehicle makes — one brand list, served rather than bundled (0035) ───────
-- The seller-facing list used to be twenty names inside a mobile screen, so
-- widening it needed an App Store release — and it carried no Chinese marque
-- while the catalogue already held Dongfeng, BYD and Denza.
--
-- `aliases` is the working part: "Mercedes", "Mercedes-Benz", "benz" and "VW"
-- are two companies written four ways, and without a canonical spelling a make
-- filter splits one brand's stock across several buckets. `logo_url` is
-- nullable and normally null — no brand mark is committed to this repository,
-- because they are third-party trademarks and every client draws a lettermark
-- until an operator uploads one.
CREATE TABLE IF NOT EXISTS vehicle_makes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  aliases       TEXT[] NOT NULL DEFAULT '{}',
  logo_url      TEXT,
  display_order INT NOT NULL DEFAULT 500,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vehicle_makes_name_check CHECK (length(btrim(name)) BETWEEN 1 AND 60),
  CONSTRAINT vehicle_makes_slug_check CHECK (slug ~ '^[a-z0-9-]{1,60}$'),
  CONSTRAINT vehicle_makes_order_check CHECK (display_order BETWEEN 0 AND 9999)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_makes_name ON vehicle_makes (lower(name));
CREATE INDEX IF NOT EXISTS idx_vehicle_makes_active ON vehicle_makes (display_order, name) WHERE active;

-- ─── Account closure — leave now, erased in thirty days (0036) ──────────────
-- Deletion used to be one irreversible transaction with no reason recorded.
-- Closing is now immediate and needs nobody's approval — Guideline 5.1.1(v)
-- requires deletion to COMPLETE inside the app, so a request waiting in an
-- operator's queue would fail review — and the row survives for thirty days so
-- somebody who closed by mistake, or in anger, has a way back.
--
-- The reason vocabulary is a CHECK rather than free text because the entire
-- point of asking is to be able to count the answers; closure_note is where
-- prose goes, and it does not survive the purge.
ALTER TABLE users ADD COLUMN IF NOT EXISTS closed_at      TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS closure_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS closure_note   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS purge_after    TIMESTAMPTZ;

-- All four fields or none: a half-written closure is an account in limbo that
-- no query finds and nobody ever purges.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_closure_complete_check;
ALTER TABLE users ADD CONSTRAINT users_closure_complete_check CHECK (
  (closed_at IS NULL AND closure_reason IS NULL AND purge_after IS NULL)
  OR (closed_at IS NOT NULL AND closure_reason IS NOT NULL AND purge_after IS NOT NULL)
);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_closure_reason_check;
ALTER TABLE users ADD CONSTRAINT users_closure_reason_check CHECK (
  closure_reason IS NULL OR closure_reason IN (
    'found_a_car', 'sold_my_car', 'not_useful', 'too_many_messages',
    'privacy', 'bad_experience', 'duplicate_account', 'other'
  )
);

CREATE INDEX IF NOT EXISTS idx_users_purge_due
  ON users (purge_after) WHERE closed_at IS NOT NULL AND deleted_at IS NULL;
