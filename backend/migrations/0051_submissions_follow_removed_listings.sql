-- ─────────────────────────────────────────────────────────────────────────────
-- 0051_submissions_follow_removed_listings.sql
--
-- A submission follows its listing: PATCH /cars/:id/status already moved it
-- to 'archived' with the car, but "Remove from marketplace" (DELETE /cars/:id)
-- did not, and neither matched a submission linked only through its
-- inspection. So a removed listing left its submission 'inspected' or 'live',
-- and once the listing was deleted for good (0 rows left to point at) the
-- submission reappeared on the pipeline board as a car waiting for a listing,
-- with no way to clear it.
--
-- The routes are fixed in the same change. This brings existing rows in line,
-- matching only on facts, never on make/model lookalikes:
--
--   1. the listing still exists and is archived, linked from either side;
--   2. the listing was deleted, proven by the audit trail: 'listing.created'
--      recorded the submission it came from, and 'listing.deleted' the same
--      listing id. Only a submission with no listing left is touched.
--
-- Each repaired row gets an audit entry, so the change is visible in
-- Activity rather than only in this file.
-- ─────────────────────────────────────────────────────────────────────────────

WITH repaired AS (
  UPDATE submissions s
     SET status = 'archived'
   WHERE s.status NOT IN ('rejected', 'archived')
     AND (
       EXISTS (
         SELECT 1 FROM cars c
          WHERE c.status = 'archived'
            AND (c.id = s.car_id
                 OR c.id IN (SELECT i.car_id FROM inspections i WHERE i.submission_id = s.id))
       )
       OR (
         s.car_id IS NULL
         AND NOT EXISTS (SELECT 1 FROM inspections i WHERE i.submission_id = s.id AND i.car_id IS NOT NULL)
         AND EXISTS (
           SELECT 1
             FROM admin_audit_log created
             JOIN admin_audit_log deleted
               ON deleted.action = 'listing.deleted'
              AND deleted.target_id = created.target_id
            WHERE created.action = 'listing.created'
              AND created.metadata->>'submission_id' = s.id::text
         )
       )
     )
  RETURNING s.id, s.year, s.make, s.model
)
INSERT INTO admin_audit_log (actor_id, action, target_type, target_id, summary, metadata)
SELECT NULL, 'submission.archived', 'submission', r.id::text,
       BTRIM(CONCAT_WS(' ', r.year::text, r.make, r.model)) || ' archived with its removed listing',
       jsonb_build_object('source', 'migration 0051')
  FROM repaired r;
