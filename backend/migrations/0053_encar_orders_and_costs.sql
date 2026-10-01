-- ─────────────────────────────────────────────────────────────────────────────
-- Korean imports, part two (docs/ENCAR-IMPORT-PLAN.md, A9, A11, A12).
--
--   · import_orders learn which Korean listing they came from, and keep a
--     SNAPSHOT of it. The mirror forgets a car the moment it sells, but an order
--     must remember exactly what the customer asked for: the make, the year, the
--     mileage, the Korean price and the photos as they were that day.
--   · the weekly cross-check against the provider's export is a third kind of
--     sync run.
--   · the exporter's costs get a home in platform_settings. They ship UNSET:
--     until an admin enters real numbers from the exporter's cost sheet, the
--     API answers `estimate: null` and no landed-cost figure is ever shown.
--
-- Additive and forward-only; nothing here changes an existing row.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE import_orders ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'request';
ALTER TABLE import_orders ADD COLUMN IF NOT EXISTS encar_listing_id TEXT;
ALTER TABLE import_orders ADD COLUMN IF NOT EXISTS listing_snapshot JSONB;
ALTER TABLE import_orders ADD COLUMN IF NOT EXISTS snapshot_at TIMESTAMPTZ;
-- Photos copied to our own storage when the order is placed (plan A8, "copy on
-- order"): the Korean listing is gone within days of the car selling.
ALTER TABLE import_orders ADD COLUMN IF NOT EXISTS snapshot_photos JSONB;

ALTER TABLE import_orders DROP CONSTRAINT IF EXISTS import_orders_source_check;
ALTER TABLE import_orders ADD CONSTRAINT import_orders_source_check
  CHECK (source IN ('request', 'korea_catalog'));

CREATE INDEX IF NOT EXISTS idx_import_orders_encar_listing
  ON import_orders (encar_listing_id) WHERE encar_listing_id IS NOT NULL;

ALTER TABLE encar_sync_state ADD COLUMN IF NOT EXISTS last_repair_at TIMESTAMPTZ;

ALTER TABLE encar_sync_runs DROP CONSTRAINT IF EXISTS encar_sync_runs_kind_check;
ALTER TABLE encar_sync_runs ADD CONSTRAINT encar_sync_runs_kind_check
  CHECK (kind IN ('baseline', 'changes', 'repair'));

-- Costs from the Korean exporter's cost sheet (plan E7), all in whole USD except
-- insurance, which is a percentage of the car's price. `configured` stays false
-- until an admin has typed real numbers in: while it is false nothing shows a
-- landed-cost estimate anywhere.
INSERT INTO platform_settings (key, value, description, editable) VALUES
  ('encar_cost_inputs',
   '{
     "configured": false,
     "export_fee_usd": 0,
     "inland_transport_usd": 0,
     "freight_usd": { "default": 0, "sedan": null, "suv": null, "van": null },
     "insurance_pct": 0,
     "reviewed_on": null
   }'::jsonb,
   'What the Korean exporter charges to get a car to Mombasa/Dar es Salaam. Until configured is true, no landed-cost estimate is shown.',
   TRUE)
ON CONFLICT (key) DO NOTHING;
