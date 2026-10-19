-- ─────────────────────────────────────────────────────────────────────────────
-- 0062_alert_preferences.sql
--
-- Per-user switches for the two alerts Sawa sends on its own initiative:
-- a new match for a saved search, and a price drop on a saved car. Off means
-- the alert is not created at all (no notification row, no push, no web
-- push), the same as a saved search with notify_enabled = FALSE.
--
-- Messages, listing and inspection updates, rental inquiries and account
-- notices are replies to something the user did and are not covered here;
-- the device's push toggle governs those.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS alert_search_matches BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS alert_price_drops BOOLEAN NOT NULL DEFAULT TRUE;
