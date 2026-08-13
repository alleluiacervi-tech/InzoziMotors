-- Structured 36-angle listing photography.
-- One row per named slot; uploading the same slot replaces it atomically.

ALTER TABLE car_photos
  ADD COLUMN IF NOT EXISTS is_cover BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Old rows may have no angle. Preserve them, but only named rows participate in
-- the one-photo-per-slot contract.
CREATE UNIQUE INDEX IF NOT EXISTS uq_car_photos_angle
  ON car_photos(car_id, angle_key) WHERE angle_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_car_photos_order
  ON car_photos(car_id, position);

-- At most one explicit cover per car. When none is marked, position 0 wins.
CREATE UNIQUE INDEX IF NOT EXISTS uq_car_photos_cover
  ON car_photos(car_id) WHERE is_cover;
