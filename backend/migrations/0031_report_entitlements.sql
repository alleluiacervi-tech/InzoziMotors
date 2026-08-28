-- ─────────────────────────────────────────────────────────────────────────────
-- 0031 — a report is an asset, not a receipt for one transaction.
--
-- Access to an inspection report was `inspections.customer_user_id = me`. One
-- inspection, one reader, forever. That is the wrong shape for the business:
-- independent verification is what Sawa sells, and the thing being sold could
-- only ever be sold once. Concretely, none of these was possible —
--
--   • the seller of an inspected car asking for a copy of the report on it;
--   • a second buyer, looking at the same car a week later, buying the same
--     report instead of paying for a duplicate inspection of a car that was
--     already inspected;
--   • the customer's own future buyer receiving the history when the car
--     changes hands.
--
-- Each of those is revenue on work already done, and each was refused by a
-- column comparison.
--
-- An entitlement is the fix: a row saying this person may read this report, why,
-- and what was paid. Access becomes "does a live entitlement exist", which is a
-- question with more than one possible answer.
--
-- Two shapes are made impossible rather than discouraged, on the reasoning that
-- has held everywhere else in this schema: a SALE must point at the money, and
-- a free grant must carry a written reason. Neither can be forgotten by a future
-- code path, because neither is enforced by code.
-- ─────────────────────────────────────────────────────────────────────────────

-- A report sale is its own fee type. It cannot reuse 'inspection': that one is
-- covered by uq_platform_fees_inspection, which permits exactly one live row per
-- inspection, and selling a second copy of a report is the entire point here.
ALTER TABLE platform_fees DROP CONSTRAINT IF EXISTS platform_fees_fee_type_check;
ALTER TABLE platform_fees ADD CONSTRAINT platform_fees_fee_type_check
  CHECK (fee_type IN ('commission', 'certification', 'featured', 'rental', 'inspection', 'report'));

-- A report fee has a payer and no seller, like an inspection fee.
ALTER TABLE platform_fees DROP CONSTRAINT IF EXISTS platform_fees_seller_shape_check;
ALTER TABLE platform_fees ADD CONSTRAINT platform_fees_seller_shape_check
  CHECK (fee_type IN ('inspection', 'report') OR seller_id IS NOT NULL);

ALTER TABLE platform_fees DROP CONSTRAINT IF EXISTS platform_fees_report_shape_check;
ALTER TABLE platform_fees ADD CONSTRAINT platform_fees_report_shape_check
  CHECK (fee_type <> 'report'
         OR (inspection_id IS NOT NULL AND payer_user_id IS NOT NULL AND seller_id IS NULL));

CREATE TABLE IF NOT EXISTS report_entitlements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id  UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- paid_customer : the walk-in customer who commissioned the inspection
  -- purchased     : bought a copy of an existing report
  -- seller_copy   : given to the vehicle's seller as part of listing it
  -- admin_grant   : a decision, with a written reason
  source         TEXT NOT NULL,
  fee_id         UUID REFERENCES platform_fees(id),
  note           TEXT,
  granted_by     UUID REFERENCES users(id),
  granted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at     TIMESTAMPTZ,
  revoked_by     UUID REFERENCES users(id),
  revoke_reason  TEXT,
  CONSTRAINT report_entitlements_source_check
    CHECK (source IN ('paid_customer', 'purchased', 'seller_copy', 'admin_grant')),
  -- A sale that names no payment is indistinguishable from a giveaway, and the
  -- difference is the whole revenue model.
  CONSTRAINT report_entitlements_purchase_check
    CHECK (source <> 'purchased' OR fee_id IS NOT NULL),
  -- The one source with neither a payment nor a structural reason behind it, so
  -- the sentence IS the reason. Ten characters is where a sentence starts.
  CONSTRAINT report_entitlements_grant_attested_check
    CHECK (source <> 'admin_grant'
           OR (note IS NOT NULL AND length(btrim(note)) >= 10))
);

-- One live entitlement per person per report. Revoked rows stay — a record that
-- can be quietly removed is not a record — and excluding them from the index is
-- what lets a revoked entitlement be re-granted later.
CREATE UNIQUE INDEX IF NOT EXISTS uq_report_entitlements_live
  ON report_entitlements(inspection_id, user_id) WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_report_entitlements_user
  ON report_entitlements(user_id) WHERE revoked_at IS NULL;

-- Nobody loses access. Every walk-in customer who already had a report keeps it,
-- as the entitlement they always effectively held, linked to the fee they paid
-- where one was recorded.
INSERT INTO report_entitlements (inspection_id, user_id, source, fee_id, granted_at)
SELECT i.id, i.customer_user_id, 'paid_customer',
       (SELECT f.id FROM platform_fees f
         WHERE f.inspection_id = i.id AND f.fee_type = 'inspection' AND f.status <> 'waived'
         LIMIT 1),
       COALESCE(i.completed_at, i.scheduled_at, NOW())
  FROM inspections i
 WHERE i.kind = 'standalone' AND i.customer_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

COMMENT ON TABLE report_entitlements IS
  'Who may read an inspection report, and on what basis. Access is the existence of a live row here, not a column on the inspection — so the same report can be sold to a second buyer, given to the seller, or passed on when the vehicle changes hands.';
