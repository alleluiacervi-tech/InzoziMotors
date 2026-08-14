ALTER TABLE users ADD COLUMN IF NOT EXISTS seller_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_created BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_token_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS import_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_ref TEXT UNIQUE NOT NULL,
  buyer_id UUID NOT NULL REFERENCES users(id), assigned_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'enquiry', origin_country TEXT NOT NULL, make TEXT NOT NULL, model TEXT NOT NULL,
  year INT, vin TEXT, supplier_reference TEXT, specification JSONB NOT NULL DEFAULT '{}'::jsonb,
  quoted_total_rwf BIGINT, exchange_rate NUMERIC(14,4), quote_expires_at TIMESTAMPTZ,
  delivery_estimate TEXT, customer_notes TEXT, internal_notes TEXT, agreement_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT import_order_status_check CHECK (status IN ('enquiry','quoted','agreement_pending','deposit_due','deposit_review','ordered','inspected_abroad','shipping_booked','in_transit','arrived','kigali_inspection','balance_due','balance_review','customs_clearance','ready_for_handover','completed','cancelled')),
  CONSTRAINT import_quote_nonnegative CHECK (quoted_total_rwf IS NULL OR quoted_total_rwf >= 0)
);

CREATE TABLE IF NOT EXISTS import_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), import_order_id UUID NOT NULL REFERENCES import_orders(id) ON DELETE CASCADE,
  milestone TEXT NOT NULL CHECK (milestone IN ('initial_50','final_50','adjustment','refund')),
  amount_rwf BIGINT NOT NULL CHECK (amount_rwf > 0),
  status TEXT NOT NULL DEFAULT 'due' CHECK (status IN ('due','submitted','reviewed','verified','rejected','refunded')),
  bank_reference TEXT, proof_url TEXT, submitted_at TIMESTAMPTZ, reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL, verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL, rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), import_order_id UUID NOT NULL REFERENCES import_orders(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, label TEXT NOT NULL, file_url TEXT NOT NULL, customer_visible BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), import_order_id UUID NOT NULL REFERENCES import_orders(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL, event_type TEXT NOT NULL, from_status TEXT, to_status TEXT,
  summary TEXT NOT NULL, metadata JSONB NOT NULL DEFAULT '{}'::jsonb, customer_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), import_order_id UUID NOT NULL REFERENCES import_orders(id) ON DELETE CASCADE,
  version INT NOT NULL, terms_snapshot JSONB NOT NULL, issued_by UUID REFERENCES users(id) ON DELETE SET NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ, acceptance_ip TEXT, superseded_at TIMESTAMPTZ, UNIQUE (import_order_id, version)
);

CREATE TABLE IF NOT EXISTS import_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), import_order_id UUID NOT NULL UNIQUE REFERENCES import_orders(id) ON DELETE CASCADE,
  supplier_name TEXT, supplier_country TEXT, carrier TEXT, booking_reference TEXT, bill_of_lading TEXT,
  vessel_or_flight TEXT, departure_port TEXT, arrival_port TEXT, departed_at TIMESTAMPTZ,
  estimated_arrival TIMESTAMPTZ, arrived_at TIMESTAMPTZ, last_location TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_orders_buyer ON import_orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_orders_status ON import_orders(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_payments_order ON import_payments(import_order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_import_events_order ON import_order_events(import_order_id, created_at);
