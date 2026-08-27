-- Hide the registration plate on published listing photos.
--
-- A plate identifies a vehicle and, through the registry, a person. It is
-- personal data and it does not belong on a public listing.
--
-- ── The masking is DESTRUCTIVE, and that is the point ────────────────────────
-- The tempting build is to draw a badge over the photo in the browser at
-- display time. That is cosmetic: the original URL is one dev-tools click away.
-- Worse than useless, because it CLAIMS a protection it does not provide —
-- exactly the kind of promise nothing in this codebase is allowed to make.
--
-- So the published file is re-encoded with the badge burned in, and the file
-- containing the plate moves to a path server.js denies outright, beside
-- id-docs, contracts and documents.
--
-- ── Why the original is kept at all ─────────────────────────────────────────
-- Deleting it would lose real evidence. The 150-point checklist has an item
-- reading "Registration plate matches the registration record", and plate
-- alongside VIN across years is a genuine history signal. Private, not gone.
--
-- ── Why four corners rather than x/y/width/height ───────────────────────────
-- Plates in photographs are not axis-aligned rectangles. Four points stored as
-- fractions of the image cover a rectangle, a rotated rectangle and a full
-- perspective fit — so improving the editor later needs no migration, and the
-- geometry survives any resize of the source photo.

ALTER TABLE car_photos ADD COLUMN IF NOT EXISTS original_url TEXT;
ALTER TABLE car_photos ADD COLUMN IF NOT EXISTS plate_mask JSONB;

-- unreviewed — nobody has looked at this photo yet
-- masked     — a plate was found and the badge is burned into `url`
-- none       — an operator confirmed there is no plate visible
--
-- 'unreviewed' is the default on purpose: a photo nobody has checked must not
-- silently claim to be clear. The publication gate can require a decision later
-- without a second migration.
ALTER TABLE car_photos ADD COLUMN IF NOT EXISTS plate_state TEXT NOT NULL DEFAULT 'unreviewed';
ALTER TABLE car_photos DROP CONSTRAINT IF EXISTS car_photos_plate_state_check;
ALTER TABLE car_photos ADD CONSTRAINT car_photos_plate_state_check
  CHECK (plate_state IN ('unreviewed', 'masked', 'none'));

-- A masked photo must carry both the geometry and the original it was made
-- from, or it cannot be re-rendered when the badge design changes.
ALTER TABLE car_photos DROP CONSTRAINT IF EXISTS car_photos_mask_shape_check;
ALTER TABLE car_photos ADD CONSTRAINT car_photos_mask_shape_check
  CHECK (plate_state <> 'masked' OR (plate_mask IS NOT NULL AND original_url IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_car_photos_plate_state
  ON car_photos(car_id) WHERE plate_state = 'unreviewed';
