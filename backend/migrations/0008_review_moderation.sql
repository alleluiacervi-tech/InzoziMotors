-- Review moderation: reporting and removal for the second UGC surface.
--
-- Chat got the Apple-1.2 treatment in 0004 (blocked_users, message_reports);
-- reviews are equally user-generated and had neither a report path nor any
-- way for an admin to take one down. Same shape as message_reports so the
-- admin queue can treat both kinds of report uniformly.

CREATE TABLE IF NOT EXISTS review_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id   UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',   -- open | resolved | dismissed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One report per person per review: repeat taps must not flood the queue.
  UNIQUE (review_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_review_reports_status ON review_reports(status, created_at);

-- Removal is a soft hide, not a DELETE: the row stays as evidence (and so a
-- re-posted duplicate still trips the one-review-per-handover constraint),
-- but it disappears from every public read and from trust-score maths.
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS removed_reason TEXT;
