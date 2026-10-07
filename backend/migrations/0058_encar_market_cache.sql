-- The Korea market guide (backend/src/lib/encar/market.js).
--
-- While Sawa is on the provider's free plan (25 requests a day, no photos, no
-- vehicle details) the full mirror in 0052 cannot be filled. What the free
-- plan can answer is how many cars Korea has for sale, by make and model, and
-- what recent listings ask. Each answer is fetched at most once a day, under a
-- hard daily request budget, and kept here; a visitor never triggers more than
-- one provider request, and once the budget is spent everyone is served the
-- last answer we have.
--
-- Keys are a closed set built by market.js ('overview', 'make:<make>',
-- 'model:<make>:<model>'), each validated against the provider's own make and
-- model lists, so this table cannot be grown by arbitrary visitor input.

CREATE TABLE IF NOT EXISTS encar_market_cache (
  key         TEXT PRIMARY KEY,
  payload     JSONB NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
