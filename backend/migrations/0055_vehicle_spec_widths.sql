-- Room for the specification labels decoders actually return.
--
-- 0043 sized these for short words ("SUV", "AWD"), but NHTSA vPIC describes an
-- SUV as "Sport Utility Vehicle [SUV]/Multipurpose Vehicle [MPV]" (54
-- characters) and a 4x4 as "4WD/4-Wheel Drive/4x4" (21). Either overflowed the
-- column and failed the whole VIN lookup with a 500. The orchestrator also cuts
-- every value to these widths now, so a longer label degrades instead of
-- failing.
--
-- Widening a varchar is a catalogue-only change in Postgres: no table rewrite,
-- no lock beyond the brief ALTER.
ALTER TABLE vehicles
  ALTER COLUMN body_type    TYPE VARCHAR(120),
  ALTER COLUMN transmission TYPE VARCHAR(120),
  ALTER COLUMN drivetrain   TYPE VARCHAR(120),
  ALTER COLUMN fuel_type    TYPE VARCHAR(120);
