-- ─────────────────────────────────────────────────────────────────────────────
-- 0067_rental_photo_plates.sql
--
-- Hiding the registration plate on a rental car's photos, the way sale-car
-- photos already can (car_photos.plate_mask, inspections.js): the team drags
-- the Sawa Cars badge over the plate, the published file is re-encoded with the
-- badge burned in, and the untouched original moves under
-- /uploads/plate-originals/, which server.js refuses to serve.
--
-- Sale photos have a row each (car_photos); rental photos are only URLs in
-- rental_cars.images. So this table holds what masking needs to remember for
-- one published rental photo: its private original (so the badge can be moved
-- or removed later, always re-cut from the original, never stacked) and where
-- the badge sits.
--
--   url           the published, masked URL, as it appears in rental_cars.images
--   original_url  the unmasked original, on the denied path
--   plate_mask    {"points": [{x,y} x 4], "bounds": {x,y,width,height}}, fractions
--
-- A row whose url is no longer in images (the photo was removed) is ignored by
-- every read.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rental_photo_plates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_car_id  UUID NOT NULL REFERENCES rental_cars(id) ON DELETE CASCADE,
  url            TEXT NOT NULL,
  original_url   TEXT NOT NULL,
  plate_mask     JSONB NOT NULL,
  masked_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rental_car_id, url)
);
