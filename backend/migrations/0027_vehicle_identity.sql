-- A stable identity for a vehicle.
--
-- VIN is the anchor every history feature rests on, and it has been free text
-- everywhere: "JTD BZ29 3401 234567", "jtdbz293401234567" and
-- "JTD-BZ29-3401-234567" are the same car and match nothing. Two inspections of
-- one vehicle would never join.
--
-- ── Why a generated column ───────────────────────────────────────────────────
-- Normalising in application code means every write site has to remember, and
-- the one that forgets is invisible until a history silently comes back empty.
-- A STORED generated column cannot be forgotten: there is no way to write the
-- raw value without the normalised one following, in this codebase or any
-- future one.
--
-- ── What is deliberately NOT enforced ────────────────────────────────────────
-- No 17-character rule, and no rejection of anything.
--
-- Rwanda imports overwhelmingly from Japan, where a vehicle carries a chassis
-- number — NZE121-1234567 — not an ISO 17-character VIN. A constraint demanding
-- 17 characters would refuse a large share of the actual national fleet and
-- make this unusable in the only market it is for. Normalise everything, join
-- on what matches, and let lib/vin.js report SEPARATELY whether a value has the
-- ISO shape, as a quality signal rather than a gate.

ALTER TABLE inspections ADD COLUMN IF NOT EXISTS vehicle_vin_key TEXT
  GENERATED ALWAYS AS (NULLIF(regexp_replace(upper(vehicle_vin), '[^A-Z0-9]', '', 'g'), '')) STORED;

ALTER TABLE cars ADD COLUMN IF NOT EXISTS vin_key TEXT
  GENERATED ALWAYS AS (NULLIF(regexp_replace(upper(vin), '[^A-Z0-9]', '', 'g'), '')) STORED;

-- Partial: most rows have no VIN and indexing their NULLs helps nobody.
CREATE INDEX IF NOT EXISTS idx_inspections_vin_key
  ON inspections(vehicle_vin_key) WHERE vehicle_vin_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cars_vin_key
  ON cars(vin_key) WHERE vin_key IS NOT NULL;
