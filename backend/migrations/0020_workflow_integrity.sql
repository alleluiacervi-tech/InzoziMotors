-- A completed flag is not evidence by itself. Bind inspections to a versioned,
-- fully evaluated checklist and make rental inventory point at the inspection
-- that supports its public certification claim.

ALTER TABLE inspections ADD COLUMN IF NOT EXISTS checklist_version TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS passed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS critical_failures JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE inspections DROP CONSTRAINT IF EXISTS inspections_score_range;
ALTER TABLE inspections ADD CONSTRAINT inspections_score_range
  CHECK (score IS NULL OR score BETWEEN 0 AND 150);

ALTER TABLE rental_cars ADD COLUMN IF NOT EXISTS inspection_id UUID
  REFERENCES inspections(id) ON DELETE RESTRICT;
ALTER TABLE rental_cars ALTER COLUMN inspected SET DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_rental_cars_inspection
  ON rental_cars(inspection_id) WHERE inspection_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inspections_publication_evidence
  ON inspections(car_id, status, passed, checklist_version, completed_at DESC);

-- Legacy rows used hand-entered scores without a canonical report. Keep their
-- data for review, but fail closed: they cannot remain publicly certified.
UPDATE rental_cars
SET inspected = FALSE,
    status = CASE WHEN status = 'active' THEN 'maintenance' ELSE status END
WHERE inspection_id IS NULL;

UPDATE cars c
SET status = 'under_review',
    review_notes = CONCAT_WS(E'\n', NULLIF(c.review_notes, ''),
      'Workflow integrity hold: complete the versioned 150-point inspection before publication.')
WHERE c.status IN ('live', 'approved')
  AND NOT EXISTS (
    SELECT 1 FROM inspections i
    WHERE i.car_id = c.id
      AND i.status = 'complete'
      AND i.passed = TRUE
      AND i.checklist_version = 'sawa-150-v1'
  );

-- Inspection is a locked marketplace promise, not an operational convenience
-- that can be disabled from a dashboard or by stale data.
INSERT INTO platform_settings (key, value, description, editable)
VALUES ('inspection_required', 'true'::jsonb,
        'A passing, complete versioned inspection is required before publication.', FALSE)
ON CONFLICT (key) DO UPDATE
SET value = 'true'::jsonb,
    editable = FALSE,
    description = EXCLUDED.description,
    updated_at = NOW(),
    updated_by = NULL;
