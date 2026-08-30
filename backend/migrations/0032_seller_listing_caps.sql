-- ─────────────────────────────────────────────────────────────────────────────
-- How many cars a seller may have live at once.
--
-- There was no answer to this question anywhere in the codebase. No cap, no
-- quota, no counter — a verified showroom could publish without limit. What
-- gated a showroom was quality (business_verified, an approved identity, and a
-- passing 150-point inspection per car), never quantity, so the inspection
-- capacity of the business was acting as the de-facto ceiling. That is a
-- defensible place to have been, but it limits by our own capacity rather than
-- by commercial terms, and it gives the business nothing to sell.
--
-- ── Why a nullable column and not a plans table ──────────────────────────────
-- A plans table implies tiers, prices and renewals, none of which exist and
-- none of which anyone has decided on. What exists today is one operator
-- agreeing a number with one showroom. NULL means "no cap", which is what
-- every seller has now, so this migration changes nobody's behaviour on the
-- day it lands.
--
-- ── Why enforced at publication ──────────────────────────────────────────────
-- Not at submission: refusing a submission turns away a car we have not yet
-- inspected, and the inspection is the thing this business actually sells. Let
-- them submit, inspect and pay; refuse only the final publish, so a dealer at
-- their cap must either upgrade or retire a listing. The enforcement lives in
-- PATCH /cars/:id/status, beside the readiness gate.
--
-- ── Why nothing is ever auto-unpublished ─────────────────────────────────────
-- Lowering a cap below a showroom's current live count must NOT pull their
-- cars down: that silently deletes a paying customer's shopfront, in bulk,
-- from a form field. They sit over cap, the Action Center says so, and only
-- the NEXT publish is refused. The count drains as they sell.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS max_active_listings INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS listing_cap_note TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS listing_cap_set_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS listing_cap_set_by UUID REFERENCES users(id);

-- A cap of zero is a suspension wearing a quota's clothes, and there is already
-- account_status for that — an operator who means "stop this showroom" should
-- say so where it is visible, not leave a 0 in a number field. A negative cap
-- is meaningless. NULL stays "no cap".
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_max_active_listings_check;
ALTER TABLE users ADD CONSTRAINT users_max_active_listings_check
  CHECK (max_active_listings IS NULL OR max_active_listings >= 1);

-- A cap is a commercial term someone agreed to. Recording who set it and when
-- is the same discipline as id_verified_by on an offline identity attestation:
-- a number that appeared with no author is a number nobody can defend later.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_listing_cap_attributed_check;
ALTER TABLE users ADD CONSTRAINT users_listing_cap_attributed_check
  CHECK (max_active_listings IS NULL OR listing_cap_set_by IS NOT NULL);

-- The count this cap is measured against is "cars occupying a slot on the
-- marketplace". live and paused both do — a paused car is still the seller's
-- listing, held back for a day, and letting paused be free would make the cap
-- trivially avoidable. sold and archived do not.
COMMENT ON COLUMN users.max_active_listings IS
  'Maximum cars this seller may have in live or paused status at once. NULL = no cap. Enforced at publication only; never auto-unpublishes.';

-- Counting a seller's occupied slots is the hot path for every publish.
CREATE INDEX IF NOT EXISTS idx_cars_seller_active
  ON cars(seller_id) WHERE status IN ('live', 'paused');
