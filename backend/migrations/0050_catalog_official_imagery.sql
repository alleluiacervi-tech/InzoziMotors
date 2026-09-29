-- ─────────────────────────────────────────────────────────────────────────────
-- 0050_catalog_official_imagery.sql
--
-- The import catalogue's pictures, rebuilt around official imagery.
--
-- 1. The Wikimedia Commons photographs are withdrawn. An audit of the 232
--    approved on 30 Sep 2026 found at least 78 that showed the wrong vehicle
--    or the wrong generation — a car accident for the Honda Fit, a 1920
--    newspaper collage for the Geely Geometry C, a Renault Twingo for the
--    Suzuki Alto, a rally car for the Hyundai i20 — and the rest were street
--    photographs of used cars with European plates. For a brand-new,
--    zero-kilometre import that is a misrepresentation, so none stays public.
--    The approved candidate rows are kept (catalog_image_candidates), so the
--    withdrawal can be reviewed or reversed from the database.
--
-- 2. A studio render (0046) no longer goes public on the vendor's word. The
--    render library answers "found" for an unknown model of a known brand and
--    returns a different car of that brand, so each render now waits for a
--    person to confirm it is the right vehicle: render_review.
--
-- 3. An operator can upload an official photograph for a model — from the
--    exporter, the distributor or the manufacturer's dealer media kit — and
--    must record where it came from and on what permission: image_source.
--    That note is internal; it is never served publicly.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE global_import_catalog
  ADD COLUMN IF NOT EXISTS render_review        VARCHAR(20) NOT NULL DEFAULT 'unreviewed',
  ADD COLUMN IF NOT EXISTS render_reviewed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS render_reviewed_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_source         TEXT,
  ADD COLUMN IF NOT EXISTS image_uploaded_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS image_uploaded_by    UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE global_import_catalog
  DROP CONSTRAINT IF EXISTS global_import_catalog_render_review_check,
  ADD  CONSTRAINT global_import_catalog_render_review_check
       CHECK (render_review IN ('unreviewed', 'approved', 'rejected'));

-- 'official' = an operator-uploaded photograph with its source recorded;
-- 'withdrawn' = a Commons photograph taken down by this migration or later.
ALTER TABLE global_import_catalog
  DROP CONSTRAINT IF EXISTS global_import_catalog_image_status_check,
  ADD  CONSTRAINT global_import_catalog_image_status_check
       CHECK (image_status IN ('pending', 'searched', 'skipped', 'approved', 'withdrawn', 'official'));

-- An official photograph always says where it came from.
ALTER TABLE global_import_catalog
  DROP CONSTRAINT IF EXISTS global_import_catalog_official_needs_source,
  ADD  CONSTRAINT global_import_catalog_official_needs_source
       CHECK (image_status <> 'official' OR NULLIF(BTRIM(image_source), '') IS NOT NULL);

UPDATE global_import_catalog
   SET images = '{}',
       image_status = 'withdrawn',
       image_credit_author = NULL,
       image_credit_license = NULL,
       image_credit_license_url = NULL,
       image_credit_source_url = NULL,
       updated_at = NOW()
 WHERE EXISTS (SELECT 1 FROM unnest(images) AS u(url) WHERE u.url ILIKE '%wikimedia.org%');

-- Anything still waiting in the Commons queue is closed too.
UPDATE catalog_image_candidates SET status = 'rejected' WHERE status = 'pending';
UPDATE global_import_catalog SET image_status = 'withdrawn', updated_at = NOW()
 WHERE image_status = 'searched';

CREATE INDEX IF NOT EXISTS idx_global_import_catalog_render_review
  ON global_import_catalog (render_review)
  WHERE render_status = 'found' AND render_review = 'unreviewed';
