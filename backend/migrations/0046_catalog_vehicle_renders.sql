-- ─────────────────────────────────────────────────────────────────────────────
-- 0046_catalog_vehicle_renders.sql
--
-- Where a resolved studio render for a catalogue model is kept.
--
-- Separate from `images` on purpose. `images` is what an operator uploaded and
-- owns; this is what a licensed render library resolved for us. Mixing them
-- would mean a backfill could quietly overwrite an operator's photograph of the
-- actual unit, which is the better picture and the one they went to the trouble
-- of taking.
--
-- render_status records WHY there is no URL, because "no picture" has several
-- causes and they need different responses: 'found' has one; 'no_match' means
-- the library genuinely lacks the model and the name may need remapping;
-- 'unreachable'/'timeout' are transient and the row should be retried;
-- 'pending' has simply never been asked. Without this column a re-run cannot
-- tell a real absence from a network blip and would re-query all 233 every time.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE global_import_catalog
  ADD COLUMN IF NOT EXISTS render_url        TEXT,
  ADD COLUMN IF NOT EXISTS render_status     VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS render_checked_at TIMESTAMPTZ;

ALTER TABLE global_import_catalog
  DROP CONSTRAINT IF EXISTS global_import_catalog_render_status_check,
  ADD  CONSTRAINT global_import_catalog_render_status_check
       CHECK (render_status IN ('pending', 'found', 'no_match', 'unreachable', 'timeout', 'not_configured'));

-- A URL only ever accompanies a hit. Any other status must carry no URL, so a
-- stale link cannot outlive the result that justified it and get rendered as
-- though the library still had the model.
ALTER TABLE global_import_catalog
  DROP CONSTRAINT IF EXISTS global_import_catalog_render_url_matches_status,
  ADD  CONSTRAINT global_import_catalog_render_url_matches_status
       CHECK ((render_status = 'found') = (render_url IS NOT NULL));

-- Drives the backfill: ask about what has never been asked, and retry what
-- failed for a transient reason, without re-querying rows already settled.
CREATE INDEX IF NOT EXISTS idx_global_import_catalog_render_pending
  ON global_import_catalog (render_status)
  WHERE render_status IN ('pending', 'unreachable', 'timeout');
