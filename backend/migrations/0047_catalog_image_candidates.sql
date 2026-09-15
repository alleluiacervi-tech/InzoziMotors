-- ─────────────────────────────────────────────────────────────────────────────
-- 0047_catalog_image_candidates.sql
--
-- The propose/approve queue for catalogue photography.
--
-- The render pipeline (0046) is switched off until a commercial licence
-- exists, and the previous catalogue proved that any AUTOMATIC photo source
-- is sometimes wrong -- 33 image references drawn from 7 recycled stock
-- photos is how a Hilux and a BYD Atto 3 ended up showing the same car. A
-- second automatic source (Wikimedia Commons: real, free, CC-licensed
-- photographs) measured at roughly 86% relevant on this catalogue's own
-- models, which is good, not perfect -- and "not perfect" is exactly the
-- failure mode this catalogue was rebuilt to remove.
--
-- So nothing here publishes on its own. A backend job finds CANDIDATES and
-- stores them; an admin looks at each one and taps Approve or Skip; only an
-- approved candidate ever reaches `global_import_catalog.images`. That is the
-- same shape as the render pipeline's find/store/serve split, with a human
-- inserted at the one point a machine cannot be trusted to get right: knowing
-- that "Isuzu Elf" is the correct photo for "Isuzu NPR" and that "Mazda CX-80"
-- is not the correct photo for "Mazda CX-3".
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS catalog_image_candidates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id    UUID NOT NULL REFERENCES global_import_catalog(id) ON DELETE CASCADE,
  source        VARCHAR(30) NOT NULL DEFAULT 'wikimedia_commons',
  image_url     TEXT NOT NULL,   -- what would be stored in images[] if approved
  thumb_url     TEXT NOT NULL,   -- smaller, for the review grid only
  page_url      TEXT NOT NULL,   -- the Commons file page -- required by the licence
  title         TEXT NOT NULL,   -- "File:2024 Kia Sorento (MQ4) ... .jpg"
  author        TEXT,
  license_name  TEXT,            -- "CC BY-SA 4.0"
  license_url   TEXT,
  width         INT,
  height        INT,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_image_candidates_catalog
  ON catalog_image_candidates (catalog_id, status);

-- Where a model sits in the review queue, and the attribution an approved
-- Commons photo carries once it is live. Attribution columns stay NULL for an
-- operator's own upload or a resolved render -- neither needs crediting -- so
-- their presence is itself the signal that a public-domain-style disclosure
-- is owed on that vehicle screen.
ALTER TABLE global_import_catalog
  ADD COLUMN IF NOT EXISTS image_status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS image_credit_author  TEXT,
  ADD COLUMN IF NOT EXISTS image_credit_license TEXT,
  ADD COLUMN IF NOT EXISTS image_credit_license_url TEXT,
  ADD COLUMN IF NOT EXISTS image_credit_source_url  TEXT;

ALTER TABLE global_import_catalog
  DROP CONSTRAINT IF EXISTS global_import_catalog_image_status_check,
  ADD  CONSTRAINT global_import_catalog_image_status_check
       CHECK (image_status IN ('pending', 'searched', 'skipped', 'approved'));

-- Credit fields only make sense once something is actually credited.
ALTER TABLE global_import_catalog
  DROP CONSTRAINT IF EXISTS global_import_catalog_credit_needs_approval,
  ADD  CONSTRAINT global_import_catalog_credit_needs_approval
       CHECK (image_credit_author IS NULL OR image_status = 'approved');

CREATE INDEX IF NOT EXISTS idx_global_import_catalog_image_status
  ON global_import_catalog (image_status)
  WHERE image_status IN ('pending', 'searched');
