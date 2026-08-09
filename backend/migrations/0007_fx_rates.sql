-- ─────────────────────────────────────────────────────────────────────────────
-- Cached foreign-exchange rates.
--
-- The USD⇄RWF rate was a hardcoded constant (1300) copied into three clients,
-- and by August 2026 the real rate is ~1473 — every converted figure on the
-- platform was ~12% wrong, silently. Rates now come from a live provider,
-- and this table is the cache and the last-known-good store:
--
--   · one row per currency pair, upserted on refresh
--   · survives restarts, so a provider outage right after a deploy still
--     serves yesterday's real rate instead of a constant from months ago
--   · fetched_at lets every consumer say HOW fresh the figure is, and lets
--     the conversion script refuse to restate money on a stale rate
--
-- Rates are display aids; money is stored in its own currency (see 0006) and
-- is never silently converted by anything reading this table.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fx_rates (
  base       TEXT        NOT NULL,
  quote      TEXT        NOT NULL,
  rate       NUMERIC(18,8) NOT NULL CHECK (rate > 0),
  -- Which provider produced it (open-er-api | currency-api), for the day one
  -- of them starts returning nonsense and we need to know which.
  source     TEXT        NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (base, quote)
);
