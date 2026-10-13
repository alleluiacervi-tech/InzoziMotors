-- Web Push for sawacars.com (G13 in docs/WEB-PARITY-PLAN.md).
--
-- A browser subscription is not an Expo token: it is an endpoint URL at the
-- browser vendor's push service plus two keys the payload is encrypted to, so
-- it gets its own table instead of a `platform = 'web'` row in device_tokens.
--
-- UNIQUE(endpoint): one browser profile is one subscription. If someone else
-- signs in on the same browser and turns notifications on, the row moves to
-- them, never duplicates, so a push can never reach the previous account.
-- Rows are removed when the push service answers 404/410 (the browser dropped
-- the subscription), on sign-out from the toggle, and when the account closes.

CREATE TABLE IF NOT EXISTS web_push_subscriptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint         TEXT NOT NULL,
  p256dh           TEXT NOT NULL,
  auth             TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_success_at  TIMESTAMPTZ,
  UNIQUE (endpoint)
);
CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_user ON web_push_subscriptions(user_id);
