-- 0039 — an import order's actual cost, kept apart from its quote.
--
-- `import_orders.quoted_total_rwf` is the customer-facing landed price.
-- Nothing anywhere recorded what the vehicle, shipping and duty actually
-- cost Sawa to deliver, so this repo's highest-ticket revenue line had
-- invisible unit economics — quoted_total_rwf minus nothing is not a margin.
--
-- One admin-editable figure, not a line-item ledger: cost information
-- arrives piecemeal as an order moves through the pipeline (a deposit is
-- paid, shipping is booked, customs assesses duty), and an admin correcting
-- an earlier estimate is a normal part of that, not an error needing a
-- void-and-reissue. The trail lives in import_order_events (cost_recorded),
-- the same audit table the quote route already writes to.

ALTER TABLE import_orders ADD COLUMN IF NOT EXISTS actual_cost_rwf BIGINT;
ALTER TABLE import_orders ADD COLUMN IF NOT EXISTS cost_note TEXT;
ALTER TABLE import_orders ADD COLUMN IF NOT EXISTS cost_recorded_at TIMESTAMPTZ;
ALTER TABLE import_orders ADD COLUMN IF NOT EXISTS cost_recorded_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE import_orders DROP CONSTRAINT IF EXISTS import_cost_nonnegative;
ALTER TABLE import_orders ADD CONSTRAINT import_cost_nonnegative
  CHECK (actual_cost_rwf IS NULL OR actual_cost_rwf >= 0);
