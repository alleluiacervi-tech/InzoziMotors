-- Chat safety: user blocking and in-chat reporting.
--
-- Apple guideline 1.2 requires any app with user-generated content (chat is
-- UGC) to offer a way to report offensive content and to block abusive users.
-- These two tables back the minimum compliant set; enforcement lives in
-- routes/messages.js (message writes refuse across a block, the conversation
-- list hides threads with people you've blocked).

CREATE TABLE IF NOT EXISTS blocked_users (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, blocked_id),
  CHECK (user_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

CREATE TABLE IF NOT EXISTS message_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  -- Optional: a specific message. Nullable so "report this conversation"
  -- works even before per-message actions exist in the UI.
  message_id      UUID REFERENCES messages(id) ON DELETE SET NULL,
  reason          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open',   -- open | resolved | dismissed
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_reports_status ON message_reports(status, created_at);
