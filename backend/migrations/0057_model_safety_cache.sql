-- Public safety data for a MODEL (make + model + year), from NHTSA's open APIs:
-- recalls, owner complaints and crash-test ratings (lib/model-safety.js).
--
-- About the model, never the individual car: a recall issued for the 2016 RAV4
-- says nothing about whether this RAV4 was affected or repaired, and the
-- clients say so. NHTSA covers models sold in the United States; a Japan-only
-- model is cached as `not_covered` so nobody asks again for a week.
--
-- One row per model-year, refreshed weekly. A few hundred rows at most for the
-- whole catalogue, so no ceiling is needed.
CREATE TABLE IF NOT EXISTS model_safety_cache (
  make_key    TEXT NOT NULL,
  model_key   TEXT NOT NULL,
  year        INT  NOT NULL,
  payload     JSONB NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (make_key, model_key, year)
);
