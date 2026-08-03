-- 0003 · Make the market-comparable lookups indexable.
--
-- GET /cars enriches each returned row with a market average, via two LATERAL
-- subqueries whose predicates are:
--
--   x.make ILIKE c.make AND x.model ILIKE c.model AND x.year BETWEEN ...
--
-- Neither ILIKE argument contains a wildcard, so this was always plain
-- case-insensitive equality — but written as ILIKE, which a btree index cannot
-- serve. idx_cars_make_model existed and could never be used. EXPLAIN on a
-- 5,000-row catalogue:
--
--   Seq Scan on cars x  (actual rows=433 loops=20)
--   Execution Time: 257 ms
--
-- Twenty sequential scans of the whole table for one page of twenty cars, and
-- it grows with the catalogue. The paginate-first CTE saved this from being far
-- worse, but the laterals are the ceiling.
--
-- The route now compares lower(...) = lower(...), which these indexes serve.
-- Both are partial: comparables are only ever drawn from live and sold cars
-- with a real price, so the index carries nothing else.

-- Exact make+model within a year window — the preferred comparable set.
CREATE INDEX IF NOT EXISTS idx_cars_comparable_model
  ON cars (lower(make), lower(model), year)
  WHERE status IN ('live', 'sold') AND price > 0;

-- The fallback when the exact model pool is too thin: make + body type.
CREATE INDEX IF NOT EXISTS idx_cars_comparable_body
  ON cars (lower(make), lower(body_type), year)
  WHERE status IN ('live', 'sold') AND price > 0;

-- Browse: narrows the live set. Note this does NOT remove the sort — GET /cars
-- orders by (featured_until > NOW()) first, and NOW() is not immutable so that
-- expression cannot be indexed. The planner will still sort a page. It earns
-- its place as the catalogue accumulates sold and archived rows and the live
-- fraction drops; today, with almost everything live, a sequential scan is
-- genuinely the cheaper plan and Postgres correctly picks it.
CREATE INDEX IF NOT EXISTS idx_cars_live_listed
  ON cars (listed_at DESC)
  WHERE status = 'live';

-- idx_cars_make_model is superseded by idx_cars_comparable_model: same leading
-- columns, but usable by the query that needs it. Dropping it frees the write
-- cost of maintaining an index nothing reads.
DROP INDEX IF EXISTS idx_cars_make_model;
