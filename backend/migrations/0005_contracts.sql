-- Vehicle sale contracts.
--
-- A signed sale agreement is the only artefact in this system with legal weight,
-- so three properties drive the whole design:
--
--   1. IMMUTABLE. `snapshot` stores exactly the values that were printed. If a
--      seller moves house next year the signed contract must still show the
--      address they signed under, and the PDF must be reproducible from its own
--      row without re-reading users/cars.
--   2. GAP-FREE NUMBERING. A Postgres SEQUENCE cannot do this — nextval is
--      non-transactional, so any rollback burns a number permanently. Hence
--      contract_counters: one row per year, incremented under a row lock in the
--      same transaction that inserts the contract.
--   3. NEVER OVERWRITTEN. Once issued, a contract is superseded (new number,
--      old row and file retained), never regenerated in place.
--
-- The durable party/vehicle columns added at the bottom serve a second purpose:
-- they make the NEXT contract for the same person pre-fill itself.

-- ─── the register ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contracts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- SAWA-2026-00042. Unique across all time, gap-free within a year.
  contract_number  TEXT UNIQUE NOT NULL,
  handover_id      UUID NOT NULL REFERENCES handovers(id),

  --  draft      number allocated, PDF not yet written (retryable)
  --  issued     PDF on disk, ready to print and sign
  --  signed     paper copy signed by all three parties — locked
  --  superseded replaced by a later contract; file kept for the record
  --  void       abandoned; the number stays spent so the register has no holes
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','issued','signed','superseded','void')),

  -- Everything that was printed, exactly as printed.
  snapshot         JSONB NOT NULL,

  file_path        TEXT,          -- relative to UPLOAD_DIR, e.g. contracts/SAWA-2026-00042-a1b2c3d4.pdf
  file_sha256      TEXT,          -- integrity: proves the file was not swapped
  page_count       INT,
  draft_watermark  BOOLEAN NOT NULL DEFAULT TRUE,  -- was DRAFT stamped on this copy?

  generated_by     UUID REFERENCES users(id),
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_at        TIMESTAMPTZ,
  signed_at        TIMESTAMPTZ,
  superseded_by    UUID REFERENCES contracts(id),
  void_reason      TEXT
);

CREATE INDEX IF NOT EXISTS idx_contracts_handover ON contracts(handover_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status   ON contracts(status, generated_at DESC);

-- At most ONE live contract per handover. draft/issued/signed all count as live;
-- superseded and void do not, so replacing a contract is possible while
-- accidentally generating a second one is not.
CREATE UNIQUE INDEX IF NOT EXISTS uq_contracts_live_per_handover
  ON contracts(handover_id)
  WHERE status IN ('draft','issued','signed');

-- ─── gap-free numbering ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contract_counters (
  year        INT PRIMARY KEY,
  last_number INT NOT NULL DEFAULT 0 CHECK (last_number >= 0)
);

-- ─── party identity, for the contract and for future pre-fill ────────────────
-- The ID photos were always stored; the NUMBER on them was never transcribed,
-- so no document could cite it. Rwandan domicile is Province → District →
-- Sector → Cell → Village; District/Sector/Cell is the practical minimum for
-- identifying a party.

ALTER TABLE users ADD COLUMN IF NOT EXISTS national_id_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_document_type   TEXT
  CHECK (id_document_type IS NULL OR id_document_type IN ('national_id','passport','driving_licence'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_document_expiry DATE;
-- Names on identity documents differ from display names (order, middle names,
-- diacritics). A contract must cite the document.
ALTER TABLE users ADD COLUMN IF NOT EXISTS name_on_document   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_line       TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS district           TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sector             TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cell               TEXT;

-- ─── vehicle identity ────────────────────────────────────────────────────────
-- The plate did not exist anywhere: only a pass/flag/fail inspection verdict on
-- "Registration / logbook". A sale agreement has to name the vehicle.

ALTER TABLE cars ADD COLUMN IF NOT EXISTS registration_plate TEXT;
-- The A–D grade was computed at inspection time and thrown away.
ALTER TABLE cars ADD COLUMN IF NOT EXISTS condition_grade    TEXT
  CHECK (condition_grade IS NULL OR condition_grade IN ('A','B','C','D'));

-- ─── sale terms ──────────────────────────────────────────────────────────────
-- Money becomes minor units in a NAMED currency. `agreed_price` is a bare USD
-- integer copied from the listing at booking and never updated, and the admin
-- UI multiplies it by a hardcoded 1300 to show RWF — a contract cannot cite a
-- figure derived from a hardcoded rate, and a Rwandan sale is denominated RWF.

ALTER TABLE handovers ADD COLUMN IF NOT EXISTS currency       TEXT NOT NULL DEFAULT 'RWF'
  CHECK (currency IN ('RWF','USD'));
ALTER TABLE handovers ADD COLUMN IF NOT EXISTS price_minor    BIGINT
  CHECK (price_minor IS NULL OR price_minor >= 0);
ALTER TABLE handovers ADD COLUMN IF NOT EXISTS deposit_minor  BIGINT
  CHECK (deposit_minor IS NULL OR deposit_minor >= 0);
ALTER TABLE handovers ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE handovers ADD COLUMN IF NOT EXISTS balance_due_on DATE;

-- When the deal was AGREED. `confirmed_at` is written by /complete, not
-- /confirm, so it has always meant completed_at — there was no record of the
-- moment a deal became binding, which is the date a contract is issued against.
ALTER TABLE handovers ADD COLUMN IF NOT EXISTS agreed_at      TIMESTAMPTZ;

-- Backfill: any handover already past 'pending' was agreed at some point, and
-- booked_at is the only timestamp that certainly precedes it.
UPDATE handovers
   SET agreed_at = COALESCE(confirmed_at, booked_at)
 WHERE agreed_at IS NULL
   AND status IN ('confirmed','complete');

-- The status column has carried its enum in a comment since day one while
-- platform_fees and disputes both use real CHECKs. A contract keys off this
-- value, so it gets the same discipline.
ALTER TABLE handovers DROP CONSTRAINT IF EXISTS handovers_status_check;
ALTER TABLE handovers ADD CONSTRAINT handovers_status_check
  CHECK (status IN ('pending','confirmed','complete','cancelled'));
