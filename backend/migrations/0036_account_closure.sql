-- Closing an account, with a reason and a way back.
--
-- What existed was a single irreversible act: DELETE /auth/me re-authenticated,
-- overwrote every identifying field and archived the listings, in one
-- transaction, with no reason recorded and no recovery. It satisfied Apple's
-- Guideline 5.1.1(v) and told the business nothing about why anybody left.
--
-- ── Why not an admin approval step ───────────────────────────────────────────
-- The obvious design — the user asks, an admin confirms, then it happens — is
-- an App Store rejection risk. 5.1.1(v) requires deletion to be initiated AND
-- completed from inside the app; a request that sits in a queue until a human
-- in Kigali gets to it is not that, and "we will delete you when we approve it"
-- is the exact pattern the guideline exists to stop.
--
-- So closure is IMMEDIATE and needs nobody's permission: the session dies on
-- the next request, listings come down, contact goes off, login is refused.
-- The admin queue still sees every closure and its reason — visibility, which
-- is what the business actually wanted — it just cannot block one.
--
-- ── The 30 days ──────────────────────────────────────────────────────────────
-- Between closing and purging, the row is still intact and the person can sign
-- back in and reopen. This is not a way of clinging to a leaving user: it is
-- what a real deletion flow needs when the person who pressed the button was
-- angry, mistaken, or not the account holder at all. After purge_after the
-- anonymisation is exactly what DELETE /auth/me always did, and irreversible.
--
-- Purging is an explicit admin action, surfaced in the Action Center once
-- accounts are due. This backend has no scheduler on purpose — 0009 wrote that
-- down — and inventing one for a job that runs on a handful of rows a month
-- would be the wrong trade.

ALTER TABLE users ADD COLUMN IF NOT EXISTS closed_at      TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS closure_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS closure_note   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS purge_after    TIMESTAMPTZ;

-- 'closed' joins the status set. verifyLiveSession already refuses 'suspended'
-- on every request, so adding the value here is most of the enforcement: a
-- closed account's next request ends its session, wherever it comes from.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_status_check;
ALTER TABLE users ADD CONSTRAINT users_account_status_check
  CHECK (account_status IN ('active', 'suspended', 'closed'));

-- A closure is all four fields or none of them. Without this, a half-written
-- closure — closed with no purge date — would be an account in limbo that no
-- query finds and nobody ever purges.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_closure_complete_check;
ALTER TABLE users ADD CONSTRAINT users_closure_complete_check CHECK (
  (closed_at IS NULL AND closure_reason IS NULL AND purge_after IS NULL)
  OR (closed_at IS NOT NULL AND closure_reason IS NOT NULL AND purge_after IS NOT NULL)
);

-- A fixed vocabulary, because the point of asking is to be able to count the
-- answers. `closure_note` is where free text goes.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_closure_reason_check;
ALTER TABLE users ADD CONSTRAINT users_closure_reason_check CHECK (
  closure_reason IS NULL OR closure_reason IN (
    'found_a_car',        -- got what they came for
    'sold_my_car',        -- ditto, from the other side
    'not_useful',         -- did not find what they wanted
    'too_many_messages',  -- notification fatigue
    'privacy',            -- does not want their details held
    'bad_experience',     -- something went wrong
    'duplicate_account',  -- has another one
    'other'
  )
);

-- The purge predicate, and the queue that surfaces it. Partial, so it indexes
-- only the handful of rows that are actually closed.
CREATE INDEX IF NOT EXISTS idx_users_purge_due
  ON users (purge_after) WHERE closed_at IS NOT NULL AND deleted_at IS NULL;
