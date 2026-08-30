-- ─────────────────────────────────────────────────────────────────────────────
-- The home-screen banner: which cars, in what order, and on whose behalf.
--
-- Featuring already existed as `cars.featured_until` — one timestamp, set by
-- PATCH /cars/:id/feature, read by an ORDER BY that floats featured cars to the
-- top of the browse list. What it could not express is everything an operator
-- actually needs:
--
--   · WHY a car is featured. Editorial judgement and a seller who paid for
--     visibility are not the same claim, and a platform whose entire product is
--     INDEPENDENT verification cannot afford to let them look identical. This
--     is the column that exists so the app can say "Sponsored" out loud.
--   · WHERE it sits. An unbounded set with no ranking is not a banner; three
--     slots in a chosen order is.
--   · WHEN it starts. featured_until has an end and no beginning, so nothing
--     could be scheduled — only switched on by hand at the right moment.
--
-- ── Why a table and not more columns on cars ─────────────────────────────────
-- A campaign has a life of its own: it starts, it ends, it gets cancelled, and
-- afterwards somebody asks what ran last month and who paid for it. Columns on
-- `cars` keep only the current state and forget every previous placement.
-- Rows keep the history, which is what makes this auditable.
--
-- ── The invariant that matters ───────────────────────────────────────────────
-- A car in the banner must be a car anybody can actually open. Publication is
-- already gated on a valid inspection, so the placement predicate requires
-- status='live' rather than re-deriving any of that — and a car that leaves
-- live (sold, paused, demoted by a failed re-inspection, or whose seller's ID
-- was revoked) falls out of the banner by that same predicate, with no job to
-- run and nothing to remember to clean up.
-- ─────────────────────────────────────────────────────────────────────────────

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
