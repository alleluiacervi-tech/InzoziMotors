-- ─────────────────────────────────────────────────────────────────────────────
-- 0069_bot_signups_and_ip_history.sql
--
-- Scripted sign-ups (Oct 2026: "margietate.70658@gmail.com" and friends, one a
-- day, Buyer, never anything else). Three parts.
--
-- 1. HOLDING A SUSPECTED BOT
--
--   users.access_hold          'suspected_bot', or NULL for everyone else
--   users.access_hold_reasons  the signals that caused it (lib/signup-risk.js)
--   users.access_hold_at       when
--   users.email_verified_at    the person proved the address is theirs
--
-- A held account can sign in, read its own profile and confirm its email,
-- nothing else (middleware/auth.js). Confirming the address lifts the hold by
-- itself, so a real person caught by a signal is never stuck waiting on the
-- team; the team can also lift or set it (Admin → Users). It is a flag, not a
-- cascade: nothing the account owns is changed.
--
--   email_verification_codes   six-digit codes, hashed, like password_resets
--
-- 2. WHERE ACCOUNTS ARE USED FROM
--
--   user_ip_addresses   one row per account and address: first and last seen,
--                       how often, the country Cloudflare reported, the last
--                       browser or app. Written on sign-up, sign-in and (at most
--                       every few minutes) on signed-in requests, so a change of
--                       network or country shows up as a new row. Read by the
--                       team only; never exported, never shown to other users.
--
-- 3. SIGN-UP SCREENING LOG
--
--   signup_screenings   every sign-up attempt's decision (allowed, held,
--                       blocked) and why. Blocked attempts create no account, so
--                       this is the only record of them; it is also what the
--                       per-address velocity signal counts.
--
-- The backfill holds existing accounts that match the scripted pattern exactly
-- (local part = the account's name, letters only, then 5–6 digits) AND have
-- done nothing: no message, submission, car, rental or rental inquiry. Holding
-- is reversible and a real person lifts it by confirming their email.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS access_hold TEXT
  CHECK (access_hold IN ('suspected_bot'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_hold_reasons TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_hold_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_access_hold ON users (access_hold_at DESC)
  WHERE access_hold IS NOT NULL;

CREATE TABLE IF NOT EXISTS email_verification_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL,
  attempts    INT NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_verification_codes_user
  ON email_verification_codes (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_ip_addresses (
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip             INET NOT NULL,
  country        TEXT,
  first_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  seen_count     INT NOT NULL DEFAULT 1,
  first_source   TEXT NOT NULL,
  last_source    TEXT NOT NULL,
  user_agent     TEXT,
  PRIMARY KEY (user_id, ip)
);
CREATE INDEX IF NOT EXISTS idx_user_ip_addresses_recent ON user_ip_addresses (user_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_ip_addresses_ip ON user_ip_addresses (ip);

CREATE TABLE IF NOT EXISTS signup_screenings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip          INET,
  country     TEXT,
  email       TEXT NOT NULL,
  client      TEXT NOT NULL CHECK (client IN ('web', 'app')),
  decision    TEXT NOT NULL CHECK (decision IN ('allowed', 'held', 'blocked')),
  reasons     TEXT[] NOT NULL DEFAULT '{}',
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_signup_screenings_recent ON signup_screenings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signup_screenings_ip ON signup_screenings (ip, created_at DESC);

UPDATE users u
   SET access_hold = 'suspected_bot',
       access_hold_reasons = ARRAY['generated_email', 'no_activity'],
       access_hold_at = NOW()
 WHERE u.role = 'buyer'
   AND u.deleted_at IS NULL
   AND u.account_status = 'active'
   AND u.access_hold IS NULL
   AND NOT u.admin_created
   AND NOT u.is_test
   AND split_part(u.email, '@', 1) ~ '^[a-z]+[._]?[0-9]{5,6}$'
   AND regexp_replace(split_part(u.email, '@', 1), '[^a-z]', '', 'g')
       = lower(regexp_replace(u.name, '[^A-Za-z]', '', 'g'))
   AND NOT EXISTS (SELECT 1 FROM user_identities i WHERE i.user_id = u.id)
   AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.sender_id = u.id)
   AND NOT EXISTS (SELECT 1 FROM submissions s WHERE s.seller_id = u.id)
   AND NOT EXISTS (SELECT 1 FROM cars c WHERE c.seller_id = u.id)
   AND NOT EXISTS (SELECT 1 FROM rental_cars r WHERE r.provider_id = u.id)
   AND NOT EXISTS (SELECT 1 FROM rental_inquiries q WHERE q.renter_id = u.id);
