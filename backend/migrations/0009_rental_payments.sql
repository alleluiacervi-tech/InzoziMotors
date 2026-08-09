-- Online payment for rentals (Pesapal hosted checkout), and the booking-money
-- hygiene it depends on.
--
-- Scope decision recorded here because the schema encodes it: what is charged
-- online is the RENTAL (subtotal + pickup fee). The deposit stays physical at
-- the center, exactly as the product copy has always promised — collecting a
-- refundable deposit through a gateway would create a refund obligation on
-- every booking through a rail where refunds are slow and fee-lossy.

-- ── payments — one row per charge attempt against the gateway ────────────────
-- Modelled on fx_conversions for auditability: every external interaction
-- leaves a row, raw payloads included, so any amount can be explained later.
CREATE TABLE IF NOT EXISTS payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id         UUID NOT NULL REFERENCES rental_bookings(id) ON DELETE CASCADE,
  -- What we told the gateway. merchant_ref is OUR identifier (unique per
  -- attempt); order_tracking_id is THEIRS, learned from SubmitOrderRequest.
  provider           TEXT NOT NULL DEFAULT 'pesapal',
  merchant_ref       TEXT NOT NULL UNIQUE,
  order_tracking_id  TEXT UNIQUE,
  amount             INT  NOT NULL CHECK (amount > 0),
  currency           TEXT NOT NULL CHECK (currency IN ('RWF', 'USD')),
  -- pending → completed | failed | expired. 'reversed' is reserved for a
  -- future refund flow; nothing writes it yet.
  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'completed', 'failed', 'expired', 'reversed')),
  -- Filled in from GetTransactionStatus on confirmation.
  method             TEXT,
  confirmation_code  TEXT,
  -- Raw gateway responses, for the audit trail. Never rendered to users.
  raw_status         JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status  ON payments(status, created_at);

-- ── Booking states grow a payment leg ─────────────────────────────────────────
-- pending_payment: dates held while the renter is on the gateway page. The
-- hold is TIME-BOXED (35 minutes) and enforced lazily in the availability
-- predicate — this backend deliberately has no scheduler, and a hold that
-- expires by falling out of a WHERE clause needs none.
-- expired: a pending_payment hold that ran out. Terminal, invisible to users.
--
-- The column had no CHECK constraint at all; adding one now both admits the
-- new states and finally rejects garbage.
ALTER TABLE rental_bookings DROP CONSTRAINT IF EXISTS rental_bookings_status_check;
ALTER TABLE rental_bookings ADD CONSTRAINT rental_bookings_status_check
  CHECK (status IN ('pending_payment', 'upcoming', 'active', 'completed', 'cancelled', 'expired'));

-- Cancellation finally leaves a record — required before money is involved,
-- because "who cancelled a paid booking, when" is the first refund question.
ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- What the online charge covers (rental + pickup fee, never the deposit) and
-- whether it has been paid. paid_at doubles as the receipt timestamp.
ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS amount_due_online INT;
ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- The indexes the admin list and the overlap predicate always deserved.
CREATE INDEX IF NOT EXISTS idx_rental_bookings_status ON rental_bookings(status);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_start  ON rental_bookings(start_date);

-- ── Rental revenue joins the ledger ───────────────────────────────────────────
-- platform_fees is the money book; rentals were invisible to it.
ALTER TABLE platform_fees DROP CONSTRAINT IF EXISTS platform_fees_fee_type_check;
ALTER TABLE platform_fees ADD CONSTRAINT platform_fees_fee_type_check
  CHECK (fee_type IN ('commission', 'certification', 'featured', 'rental'));
-- A rental fee has no seller — the fleet is the house's own. Every other
-- fee_type keeps writing a seller_id exactly as before; only the constraint
-- stops pretending one always exists.
ALTER TABLE platform_fees ALTER COLUMN seller_id DROP NOT NULL;
ALTER TABLE platform_fees ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES rental_bookings(id) ON DELETE SET NULL;
-- One ledger row per booking, no matter how many IPN deliveries confirm it —
-- same exactly-once pattern as the certification fee.
CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_fees_rental
  ON platform_fees(booking_id) WHERE fee_type = 'rental';

-- ── Gateway config that must survive restarts ─────────────────────────────────
-- Pesapal's IPN id is minted once by RegisterIPN and then reused; re-registering
-- on every boot would accumulate registrations on their side.
CREATE TABLE IF NOT EXISTS payment_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
