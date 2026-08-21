-- Administrative account control.  Suspension is reversible and keeps the
-- business record intact; it must still immediately invalidate every session.
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_status_check;
ALTER TABLE users ADD CONSTRAINT users_account_status_check
  CHECK (account_status IN ('active', 'suspended'));

CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status)
  WHERE deleted_at IS NULL;
