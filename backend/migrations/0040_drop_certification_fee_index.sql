-- The 'certification' platform_fees fee_type was scaffolded in the 0001
-- baseline (a per-submission fee for passing the 150-point inspection) but no
-- code path has ever inserted a row with it — sellers are never billed for a
-- listing inspection. The CHECK constraint still allows the value, harmlessly,
-- for any historical row that predates this repo's history; but the partial
-- unique index built to keep it idempotent protects zero rows and is pure
-- dead weight. Drop it.
DROP INDEX IF EXISTS uq_platform_fees_certification;
