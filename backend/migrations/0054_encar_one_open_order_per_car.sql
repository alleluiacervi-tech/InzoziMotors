-- One open import order per buyer per Korean car, enforced by the database.
--
-- POST /imports checks for an existing open order first, but that check and the
-- insert are separate statements: two requests in flight together (a double tap,
-- a retry on a slow connection) both pass it. A partial unique index is the only
-- thing that closes that gap; the route turns the violation into the same 409
-- the check gives.
--
-- A cancelled or completed order is history and does not block a new request.
-- encar_listing_id arrived in 0053 and nothing writes it until the Korean
-- catalogue is switched on, so there is nothing to de-duplicate first.
CREATE UNIQUE INDEX IF NOT EXISTS uq_import_orders_open_per_car
  ON import_orders (buyer_id, encar_listing_id)
  WHERE encar_listing_id IS NOT NULL AND status NOT IN ('cancelled', 'completed');
