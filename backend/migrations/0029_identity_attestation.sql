-- ─────────────────────────────────────────────────────────────────────────────
-- 0029 — record HOW an identity was verified, so it can be verified offline.
--
-- Until now the only route to id_verified='approved' was reviewing documents a
-- seller had uploaded, and the dashboard only listed users already sitting at
-- 'pending'. A seller who was verified at the counter — national ID in hand,
-- no upload — was unreachable: no queue row, no button, no way forward. The
-- operator's only options were to refuse a real customer or to reach into the
-- database.
--
-- Approving without an upload is a legitimate business act. Approving without a
-- RECORD of who attested and how is not: "staff verify seller identity" is the
-- product's central claim, and a bare boolean cannot support it. So the method
-- and the attestation become columns, and the constraint below makes an
-- unattested off-platform approval an impossible row rather than a discouraged
-- one. Nothing in application code can forget this.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS id_verification_method TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_verification_note   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_verification_ref    TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_verified_at         TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_verified_by         UUID REFERENCES users(id);

-- Every approval that already exists came through document review, because that
-- was the only path that existed. Recording 'documents' for them is a statement
-- of fact, not a backfilled guess.
UPDATE users
   SET id_verification_method = 'documents'
 WHERE id_verified = 'approved'
   AND id_verification_method IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_id_verification_method_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_id_verification_method_check CHECK (
      id_verification_method IS NULL
      OR id_verification_method IN (
        'documents', 'in_person', 'business_document', 'known_client'
      )
    );
  END IF;
END $$;

-- The attestation constraint. 'documents' carries its own evidence — the files
-- are on disk and reviewable. The other three carry none, so the written note
-- IS the evidence, and ten characters is the floor at which a sentence starts
-- to mean something. Anything shorter ("ok", "yes", ".") is refused by the
-- database, which is the only enforcement that survives a future code path.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_offline_identity_attested_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_offline_identity_attested_check CHECK (
      id_verification_method IS NULL
      OR id_verification_method = 'documents'
      OR (id_verification_note IS NOT NULL
          AND length(btrim(id_verification_note)) >= 10)
    );
  END IF;
END $$;

COMMENT ON COLUMN users.id_verification_method IS
  'How identity was established: documents (uploads reviewed in the dashboard) | in_person | business_document | known_client. The last three are off-platform and require id_verification_note by CHECK constraint.';
COMMENT ON COLUMN users.id_verification_note IS
  'The admin''s written attestation for an off-platform verification. This is the evidence of record when no document was uploaded.';
COMMENT ON COLUMN users.id_verification_ref IS
  'Optional reference the admin saw — national ID number, RDB registration, TIN. Free text; never treated as validated.';
