-- ─────────────────────────────────────────────────────────────────────────────
-- 0048_message_email_notifications.sql
--
-- D3 in docs/WEB-PARITY-PLAN.md: a user who isn't connected (no live socket)
-- gets an email nudge when someone messages them — no message text in it,
-- capped at one per conversation per hour. On by default (it's transactional,
-- not marketing) with a per-user opt-out.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS message_email_notifications BOOLEAN NOT NULL DEFAULT TRUE;

-- Rate-limit anchor. One column per conversation, not per (conversation,
-- recipient): a thread has exactly two participants, so at any moment only
-- the non-sender is a candidate recipient, and this is simpler than a side
-- table for a limit whose whole point is "don't email again within the hour".
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_offline_email_at TIMESTAMPTZ;
