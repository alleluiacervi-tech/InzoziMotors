-- ─────────────────────────────────────────────────────────────────────────────
-- 0052_encar_mirror.sql
--
-- A local mirror of the Korean used-car market (Encar, through encarapi.com),
-- for the import service. Plan: docs/ENCAR-IMPORT-PLAN.md (A5, A6).
--
-- What this is: the cars for sale RIGHT NOW, nothing else. A listing that is
-- sold is deleted by the sync the same day (the provider keeps the archive), so
-- the table is bounded by the size of the market, not by time. Roughly 150k
-- rows x ~0.5 KB, 100-300 MB with indexes.
--
-- What it deliberately does not hold:
--   · photographs — only their addresses, host stripped. About 4 million photos
--     exist at any moment; copying them is neither affordable nor needed. A car
--     somebody ORDERS has its photos copied to Cloudinary by the order flow.
--   · inspection reports, insurance accident records, price history — fetched
--     for the one car being opened and cached for 24 hours in
--     encar_detail_cache, which empties itself.
--   · the Korean dealer's name, phone or the licence plate. Never stored.
--
-- Nothing reads these tables until encar_flags.catalog_public is switched on,
-- and nothing writes them until encar_flags.sync_enabled is, so this migration
-- is safe to deploy ahead of everything else.
-- ─────────────────────────────────────────────────────────────────────────────

-- Fuzzy matching for the search box ("sorento", "sorrento"). Ships with
-- Postgres (contrib) and is on its trusted-extension list, so no superuser.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- The listing id is TEXT, not BIGINT, because the provider prefixes other
-- sources (kcar:..., kbc:...). We only ingest Encar today (bare numeric).
CREATE TABLE IF NOT EXISTS encar_listings (
  id              TEXT PRIMARY KEY,
  make            TEXT NOT NULL,
  model           TEXT NOT NULL,
  badge           TEXT,
  fuel            TEXT,
  transmission    TEXT,
  color           TEXT,
  category        TEXT,                 -- body style, when the feed supplies one
  year            SMALLINT NOT NULL,
  month           SMALLINT,
  mileage_km      INTEGER,
  price_man       INTEGER NOT NULL,     -- the provider's unit: 1 = 10,000 KRW
  power_ps        SMALLINT,
  seats           SMALLINT,
  photo_count     SMALLINT NOT NULL DEFAULT 0,
  photos          TEXT[]   NOT NULL DEFAULT '{}',  -- paths, host stripped
  est_landed_rwf  BIGINT,               -- NULL until the batch estimate runs
  est_computed_at TIMESTAMPTZ,
  first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT encar_listings_price_check CHECK (price_man > 0),
  CONSTRAINT encar_listings_year_check  CHECK (year BETWEEN 1980 AND 2100)
)
-- Rows are rewritten often (price changes) and never grow; leaving 10% free in
-- each page lets most updates stay on their page (HOT) instead of bloating
-- every index.
WITH (fillfactor = 90);

-- Newest first is the default order, and the cursor for paging through it.
CREATE INDEX IF NOT EXISTS idx_encar_listings_newest
  ON encar_listings (first_seen_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_encar_listings_make_model_year
  ON encar_listings (lower(make), lower(model), year DESC);
CREATE INDEX IF NOT EXISTS idx_encar_listings_price   ON encar_listings (price_man);
CREATE INDEX IF NOT EXISTS idx_encar_listings_mileage ON encar_listings (mileage_km);
CREATE INDEX IF NOT EXISTS idx_encar_listings_search_trgm
  ON encar_listings USING gin (lower(make || ' ' || model || ' ' || COALESCE(badge, '')) gin_trgm_ops);

-- Detail / inspection / record payloads for the cars people actually open.
-- UNLOGGED: no write-ahead log, so it is fast and light, and it is a cache — if
-- Postgres crashes it comes back empty and refills. Rows expire after 24 hours
-- (the provider's own recommendation) and are purged hourly.
CREATE UNLOGGED TABLE IF NOT EXISTS encar_detail_cache (
  id          TEXT        NOT NULL,
  kind        TEXT        NOT NULL CHECK (kind IN ('detail', 'inspection', 'record')),
  payload     JSONB       NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id, kind)
);
CREATE INDEX IF NOT EXISTS idx_encar_detail_cache_expires ON encar_detail_cache (expires_at);

-- Where the sync is. One row.
CREATE TABLE IF NOT EXISTS encar_sync_state (
  id                     SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  baseline_started_at    TIMESTAMPTZ,
  baseline_completed_at  TIMESTAMPTZ,
  baseline_page          INTEGER NOT NULL DEFAULT 1,
  change_cursor          BIGINT,
  last_success_at        TIMESTAMPTZ,
  last_error             TEXT,
  last_error_at          TIMESTAMPTZ,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO encar_sync_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- One row per run, kept 30 days by the worker. Feeds the admin status card.
CREATE TABLE IF NOT EXISTS encar_sync_runs (
  id           BIGSERIAL PRIMARY KEY,
  kind         TEXT        NOT NULL CHECK (kind IN ('baseline', 'changes')),
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at  TIMESTAMPTZ,
  ok           BOOLEAN,
  added        INTEGER NOT NULL DEFAULT 0,
  updated      INTEGER NOT NULL DEFAULT 0,
  removed      INTEGER NOT NULL DEFAULT 0,
  skipped      INTEGER NOT NULL DEFAULT 0,
  error        TEXT
);
CREATE INDEX IF NOT EXISTS idx_encar_sync_runs_started ON encar_sync_runs (started_at DESC);

-- What we ask the provider, per day: requests and bytes. The Business plan has
-- 12 GB of traffic a month and 60 requests a minute; this is how we notice
-- before the provider does.
CREATE TABLE IF NOT EXISTS encar_usage (
  day       DATE PRIMARY KEY,
  requests  INTEGER NOT NULL DEFAULT 0,
  bytes     BIGINT  NOT NULL DEFAULT 0
);

-- Settings. Both off / conservative: nothing syncs and nothing is public until
-- an admin says so.
INSERT INTO platform_settings (key, value, description, editable) VALUES
  ('encar_flags',
   '{"sync_enabled": false, "catalog_public": false}'::jsonb,
   'Korean import mirror. sync_enabled: the worker fetches from the provider. catalog_public: /imports/korea answers with cars. Both off by default.',
   TRUE),
  ('encar_ingest_rules',
   '{
     "exclude_duplicates": true,
     "require_photos": true,
     "min_price_man": 100,
     "exclude_prices_man": [0, 1],
     "exclude_fuel_tokens": ["lpg", "cng", "hydrogen"],
     "max_age_years": null,
     "max_mileage_km": null,
     "row_ceiling": 250000
   }'::jsonb,
   'What the Korean mirror keeps. A listing that fails a rule is not stored (and is deleted if it was). Prices are in man-won (1 = 10,000 KRW). The ceiling stops the table growing past what is for sale.',
   TRUE)
ON CONFLICT (key) DO NOTHING;
