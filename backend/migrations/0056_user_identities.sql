-- Sign in with Google and Sign in with Apple.
--
-- One row per (provider, provider's user id). The provider's `sub` is the only
-- stable key: an email can change at Google, and Apple may hand out a private
-- relay address, so an identity is never looked up by email once it exists.
-- A user may hold one Google and one Apple identity, plus a password, all
-- reaching the same `users` row.
--
-- apple_refresh_token: Apple requires an app that offers Sign in with Apple to
-- revoke the user's token when they delete their account (App Store Review
-- Guideline 5.1.1(v)). The revoke call needs this token, obtained by exchanging
-- the one-time authorization code at sign-in, and the revoke call must name the
-- client id (the app's bundle id, or the website's Services ID) the token was
-- issued to. It is a credential: never returned by any route, cleared on
-- revocation.
CREATE TABLE IF NOT EXISTS user_identities (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider             TEXT NOT NULL CHECK (provider IN ('google', 'apple')),
  subject              TEXT NOT NULL,
  email                TEXT,
  email_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  apple_refresh_token  TEXT,
  apple_client_id      TEXT,      -- which of our Apple client ids the token belongs to
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, subject),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_identities_user ON user_identities (user_id);
