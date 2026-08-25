-- Record what a walk-in inspection was paid for, and let its customer collect
-- the report they bought.
--
-- Money is COLLECTED OFFLINE — cash, mobile money or a bank transfer at the
-- office — and merely RECORDED here. payments_enabled stays false and locked;
-- nothing in this migration moves a franc or talks to a provider.
--
-- ⚠️  This table is one file away from live commission code.
--     backend/src/routes/handovers.js still computes and accrues commission
--     against platform_fees, and is unreachable ONLY because server.js wraps
--     its mount in transactionFeatureRetired. Widening the fee_type vocabulary
--     here does not change that; remounting /handovers without the middleware
--     would. Do not tidy that away as a side effect of anything.

-- ── Repair pre-existing drift ────────────────────────────────────────────────
-- Migration 0009 widened this CHECK to admit 'rental' but src/schema.sql was
-- never updated, so a database built from schema.sql has a narrower constraint
-- than one built from migrations — the two sources of truth already disagree.
-- Restate the whole vocabulary here and mirror it there in the same commit.
ALTER TABLE platform_fees DROP CONSTRAINT IF EXISTS platform_fees_fee_type_check;
ALTER TABLE platform_fees ADD CONSTRAINT platform_fees_fee_type_check
  CHECK (fee_type IN ('commission', 'certification', 'featured', 'rental', 'inspection'));

-- ── An inspection fee has a customer, not a seller ───────────────────────────
-- seller_id was NOT NULL, which is right for every fee that existed before this
-- one and wrong for a walk-in: the person paying owns the car and is not
-- selling it through Sawa. Dropping the NOT NULL would silently relax the rule
-- for the other four kinds too, so it is immediately restated as a shape check
-- that still requires a seller everywhere it used to.
ALTER TABLE platform_fees ALTER COLUMN seller_id DROP NOT NULL;

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
  CHECK (fee_type = 'inspection' OR seller_id IS NOT NULL);

ALTER TABLE platform_fees DROP CONSTRAINT IF EXISTS platform_fees_method_check;
ALTER TABLE platform_fees ADD CONSTRAINT platform_fees_method_check
  CHECK (method IS NULL OR method IN ('cash', 'mobile_money', 'bank_transfer'));

-- An inspection fee must name its inspection and its payer, and must not claim
-- a seller. Same reasoning as inspections_kind_shape_check in 0022: the shape
-- belongs in the database, not in whichever route happens to write the row.
ALTER TABLE platform_fees DROP CONSTRAINT IF EXISTS platform_fees_inspection_shape_check;
ALTER TABLE platform_fees ADD CONSTRAINT platform_fees_inspection_shape_check
  CHECK (fee_type <> 'inspection'
         OR (inspection_id IS NOT NULL AND payer_user_id IS NOT NULL AND seller_id IS NULL));

-- Exactly once per inspection — unless it was voided.
--
-- A correction is void-and-re-record rather than an edit, so the original entry
-- and the reason it was wrong both survive. 'waived' is the voided state, and
-- excluding it from the index is what frees the slot for the replacement.
CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_fees_inspection
  ON platform_fees(inspection_id) WHERE fee_type = 'inspection' AND status <> 'waived';

CREATE INDEX IF NOT EXISTS idx_platform_fees_payer ON platform_fees(payer_user_id);
