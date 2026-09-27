-- ─────────────────────────────────────────────────────────────────────────────
-- 0049_id_capture_source.sql
--
-- How a seller's ID photos were captured (P2-D2 in docs/WEB-PARITY-PLAN.md):
--   live  every photo came straight from a camera — the app's "Take a photo",
--         or the website's in-page webcam view
--   file  at least one was chosen from the device's files or photo library
--   NULL  sent by a client that predates this column
-- Reviewers see it as a badge in the ID queue; a file is not refused, it just
-- deserves a closer look. Rewritten on every resubmission, like the photos.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS id_capture_source VARCHAR(10);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_id_capture_source_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_id_capture_source_check
      CHECK (id_capture_source IS NULL OR id_capture_source IN ('live', 'file'));
  END IF;
END $$;
