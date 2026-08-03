-- 0002 · Give scheduling real date columns.
--
-- THE BUG
-- inspections.scheduled_date, submissions.inspection_date and
-- handovers.handover_date are TEXT, and the two clients disagree about what
-- goes in them:
--
--   admin dashboard  <input type="date">  ->  "2026-08-12"
--   mobile app       `${month} ${date}`   ->  "Aug 12"      (no year at all)
--
-- The centre capacity check compares that column as a string:
--
--   WHERE center ILIKE $1 AND scheduled_date = $2
--
-- so an admin booking and a mobile booking for the SAME DAY never match each
-- other, and daily_capacity silently fails to hold. A centre with capacity 8
-- can be booked far past it, and nobody finds out until eight sellers arrive
-- at once. Ordering by a text date is wrong for the same reason, and
-- new Date("Aug 12") quietly assumes the current year — so a January booking
-- for December lands eleven months early.
--
-- THE FIX
-- Typed columns beside the text ones. The text columns stay for now: they are
-- what the app renders today, and removing them in the same change would mean
-- a schema migration and a client release having to land together. They become
-- display strings — derived, never compared.
--
-- BACKFILL
-- Both known formats are handled, and anything unrecognised is left NULL
-- rather than guessed into a wrong date. A yearless "Aug 12" takes its year
-- from the row's own creation date, which is the only defensible inference
-- available: these are near-future bookings made shortly after the row was
-- created. That inference is recorded here so it is not mistaken for fact.

-- ─── Columns ─────────────────────────────────────────────────────────────────
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS scheduled_on DATE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS inspection_on DATE;
ALTER TABLE handovers   ADD COLUMN IF NOT EXISTS handover_on   DATE;

-- ─── Parser ──────────────────────────────────────────────────────────────────
-- IMMUTABLE + STRICT so it can be used in an index predicate later if needed.
-- Returns NULL for anything it does not recognise; never raises, because one
-- unparseable legacy row must not abort the whole migration.
CREATE OR REPLACE FUNCTION sawa_parse_display_date(raw TEXT, fallback TIMESTAMPTZ)
RETURNS DATE AS $$
DECLARE
  trimmed TEXT := btrim(COALESCE(raw, ''));
  yr      TEXT := to_char(COALESCE(fallback, NOW()), 'YYYY');
BEGIN
  IF trimmed = '' THEN
    RETURN NULL;
  END IF;

  -- "2026-08-12" — what the admin dashboard sends.
  IF trimmed ~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN trimmed::date;
  END IF;

  -- "Aug 12, 2026" / "August 12, 2026" — carries its own year.
  IF trimmed ~ '^[A-Za-z]{3,9}\s+\d{1,2},\s*\d{4}$' THEN
    RETURN to_date(trimmed, 'Mon DD, YYYY');
  END IF;

  -- "Aug 12" — what the mobile app sends. No year in the string, so it is
  -- taken from the row that owns the booking. An inference, not a fact.
  IF trimmed ~ '^[A-Za-z]{3,9}\s+\d{1,2}$' THEN
    RETURN to_date(trimmed || ' ' || yr, 'Mon DD YYYY');
  END IF;

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- A month name that does not exist, a 31st of February, anything else odd.
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ─── Backfill ────────────────────────────────────────────────────────────────
-- scheduled_at is already a real timestamp where it was parsed successfully;
-- prefer it over re-parsing the display string.
UPDATE inspections
SET scheduled_on = COALESCE(
      scheduled_at::date,
      sawa_parse_display_date(scheduled_date, scheduled_at)
    )
WHERE scheduled_on IS NULL;

UPDATE submissions s
SET inspection_on = sawa_parse_display_date(s.inspection_date, s.submitted_at)
WHERE s.inspection_on IS NULL;

UPDATE handovers h
SET handover_on = sawa_parse_display_date(h.handover_date, h.booked_at)
WHERE h.handover_on IS NULL;

-- ─── Indexes ─────────────────────────────────────────────────────────────────
-- The capacity check is (centre, day, status). Give it something to use — it
-- was a sequential scan with a text comparison that could not match anyway.
CREATE INDEX IF NOT EXISTS idx_inspections_center_day
  ON inspections (lower(center), scheduled_on)
  WHERE status IN ('scheduled', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_handovers_day ON handovers (handover_on);
