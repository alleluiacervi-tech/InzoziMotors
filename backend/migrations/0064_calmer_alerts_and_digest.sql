-- ─────────────────────────────────────────────────────────────────────────────
-- 0064_calmer_alerts_and_digest.sql
--
-- What the alerts need to be calm and the daily summary needs to exist.
-- See docs/PUSH-NOTIFICATIONS-TODO.md, phases 4 and 5.
--
--   search_alert_log   a saved search is told about a car once. A listing that
--                      goes live, is pulled for review and goes live again must
--                      not alert the same person twice.
--   price_alert_log    a saved car's price-drop alert is sent at most once a day.
--   saved_searches.alert_mode
--                      'instant' (default, today's behaviour) or 'daily': a
--                      match is held for the person's daily summary instead.
--   notifications.push_after / push_copy
--                      quiet hours: the row and the in-app bell are immediate,
--                      the push waits until push_after and is then rendered from
--                      push_copy in the person's language.
--   cars.first_live_at the moment a car first became live, set by a trigger so
--                      every path that publishes a car is covered. The daily
--                      summary counts cars by it.
--   users.alert_daily_digest / last_digest_on
--                      the opt-in (OFF by default: promotional push needs
--                      explicit consent, App Store guideline 4.5.4) and the
--                      Kigali date it was last sent, so a restart or a second
--                      server can never send it twice.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS search_alert_log (
  saved_search_id UUID NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
  car_id          UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (saved_search_id, car_id)
);

CREATE TABLE IF NOT EXISTS price_alert_log (
  car_id          UUID PRIMARY KEY REFERENCES cars(id) ON DELETE CASCADE,
  last_alerted_at TIMESTAMPTZ NOT NULL,
  last_price      NUMERIC
);

ALTER TABLE saved_searches ADD COLUMN IF NOT EXISTS alert_mode TEXT NOT NULL DEFAULT 'instant';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'saved_searches_alert_mode_check') THEN
    ALTER TABLE saved_searches ADD CONSTRAINT saved_searches_alert_mode_check
      CHECK (alert_mode IN ('instant', 'daily'));
  END IF;
END $$;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS push_after TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS push_copy JSONB;
CREATE INDEX IF NOT EXISTS notifications_push_due_idx
  ON notifications (push_after) WHERE push_after IS NOT NULL;

ALTER TABLE cars ADD COLUMN IF NOT EXISTS first_live_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION set_car_first_live_at() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'live' AND NEW.first_live_at IS NULL THEN
    NEW.first_live_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cars_first_live_at ON cars;
CREATE TRIGGER cars_first_live_at
  BEFORE INSERT OR UPDATE OF status ON cars
  FOR EACH ROW EXECUTE FUNCTION set_car_first_live_at();

-- Cars already live keep the best date we have, so the first summary does not
-- announce the whole catalogue as new.
UPDATE cars SET first_live_at = COALESCE(listed_at, approved_at, created_at)
 WHERE status = 'live' AND first_live_at IS NULL;

CREATE INDEX IF NOT EXISTS cars_first_live_at_idx ON cars (first_live_at) WHERE status = 'live';

ALTER TABLE users ADD COLUMN IF NOT EXISTS alert_daily_digest BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_digest_on DATE;
