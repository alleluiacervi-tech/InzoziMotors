-- Immutable registry for every generated operational document.
-- Files stay private under uploads/documents and are streamed only by an
-- authenticated route. A new version creates a new row; issued rows are never
-- overwritten, so a downloaded report remains reproducible years later.

CREATE TABLE IF NOT EXISTS document_counters (
  kind TEXT NOT NULL,
  year INT NOT NULL,
  last_number INT NOT NULL DEFAULT 0 CHECK (last_number >= 0),
  PRIMARY KEY (kind, year)
);

CREATE TABLE IF NOT EXISTS generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number TEXT UNIQUE NOT NULL,
  kind TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id UUID NOT NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1 CHECK (version > 0),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','issued','superseded','void')),
  filename TEXT,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  file_path TEXT,
  file_sha256 TEXT,
  file_size BIGINT CHECK (file_size IS NULL OR file_size >= 0),
  page_count INT CHECK (page_count IS NULL OR page_count > 0),
  snapshot JSONB NOT NULL,
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_at TIMESTAMPTZ,
  superseded_at TIMESTAMPTZ,
  UNIQUE (kind, subject_type, subject_id, version)
);

CREATE INDEX IF NOT EXISTS idx_generated_documents_subject
  ON generated_documents(subject_type, subject_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_documents_owner
  ON generated_documents(owner_user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_documents_kind
  ON generated_documents(kind, generated_at DESC);

