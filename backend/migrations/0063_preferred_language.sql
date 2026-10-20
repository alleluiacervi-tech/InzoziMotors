-- ─────────────────────────────────────────────────────────────────────────────
-- 0063_preferred_language.sql
--
-- The language a person reads Sawa in, so a push notification (which the server
-- writes, not the app) arrives in that language. The app and the website send
-- it when someone signs in and whenever they change it; NULL means "never told
-- us" and is rendered in English, exactly as before.
--
-- Codes match the clients: en, rw, fr, sw, ko, zh.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_preferred_language_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_preferred_language_check
      CHECK (preferred_language IS NULL OR preferred_language IN ('en', 'rw', 'fr', 'sw', 'ko', 'zh'));
  END IF;
END $$;
