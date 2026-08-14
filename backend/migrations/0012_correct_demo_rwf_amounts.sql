-- Correct legacy demo inventory that was originally authored in USD-sized
-- numbers and later labelled RWF without being restated. The predicates are
-- deliberately narrow: known demo seller/fleet titles + implausibly small RWF
-- values. Customer-entered inventory cannot match by price alone.
--
-- 1470 is the same explicit seed conversion used by seed-cars.js. This is a
-- one-time data repair, not a live FX policy. Every changed cell is recorded in
-- fx_conversions before it is updated.

DO $$
DECLARE
  seed_rate CONSTANT NUMERIC := 1470;
BEGIN
  INSERT INTO fx_conversions
    (table_name, row_id, column_name, from_currency, to_currency,
     old_value, new_value, rate, note)
  SELECT 'cars', c.id::text, 'price', 'USD-sized RWF', 'RWF',
         c.price, ROUND(c.price * seed_rate), seed_rate,
         '0012: repair legacy Sawa demo seed'
  FROM cars c
  JOIN users u ON u.id = c.seller_id
  WHERE u.email = 'seller@sawacars.com'
    AND c.currency = 'RWF'
    AND c.price BETWEEN 1000 AND 999999;

  UPDATE cars c
  SET price = ROUND(c.price * seed_rate)
  FROM users u
  WHERE u.id = c.seller_id
    AND u.email = 'seller@sawacars.com'
    AND c.currency = 'RWF'
    AND c.price BETWEEN 1000 AND 999999;

  INSERT INTO fx_conversions
    (table_name, row_id, column_name, from_currency, to_currency,
     old_value, new_value, rate, note)
  SELECT 'price_history', ph.id::text, 'price', 'USD-sized RWF', 'RWF',
         ph.price, ROUND(ph.price * seed_rate), seed_rate,
         '0012: repair legacy Sawa demo seed'
  FROM price_history ph
  JOIN cars c ON c.id = ph.car_id
  JOIN users u ON u.id = c.seller_id
  WHERE u.email = 'seller@sawacars.com'
    AND ph.currency = 'RWF'
    AND ph.price BETWEEN 1000 AND 999999;

  UPDATE price_history ph
  SET price = ROUND(ph.price * seed_rate)
  FROM cars c, users u
  WHERE c.id = ph.car_id
    AND u.id = c.seller_id
    AND u.email = 'seller@sawacars.com'
    AND ph.currency = 'RWF'
    AND ph.price BETWEEN 1000 AND 999999;

  INSERT INTO fx_conversions
    (table_name, row_id, column_name, from_currency, to_currency,
     old_value, new_value, rate, note)
  SELECT 'rental_cars', rc.id::text, v.column_name, 'USD-sized RWF', 'RWF',
         v.old_value, ROUND(v.old_value * seed_rate), seed_rate,
         '0012: repair legacy Sawa demo fleet'
  FROM rental_cars rc
  CROSS JOIN LATERAL (VALUES
    ('daily_rate', rc.daily_rate::BIGINT),
    ('weekly_rate', rc.weekly_rate::BIGINT),
    ('deposit', rc.deposit::BIGINT)
  ) AS v(column_name, old_value)
  WHERE rc.title IN (
    'Toyota RAV4 Hybrid', 'Toyota Land Cruiser Prado', 'Toyota Corolla',
    'Mitsubishi Pajero Sport', 'Toyota Hilux Double Cab', 'Hyundai Tucson',
    'Suzuki Jimny', 'Kia Sportage'
  )
    AND rc.currency = 'RWF'
    AND rc.daily_rate BETWEEN 1 AND 999
    AND v.old_value IS NOT NULL;

  UPDATE rental_cars
  SET daily_rate = ROUND(daily_rate * seed_rate),
      weekly_rate = ROUND(weekly_rate * seed_rate),
      deposit = ROUND(deposit * seed_rate)
  WHERE title IN (
    'Toyota RAV4 Hybrid', 'Toyota Land Cruiser Prado', 'Toyota Corolla',
    'Mitsubishi Pajero Sport', 'Toyota Hilux Double Cab', 'Hyundai Tucson',
    'Suzuki Jimny', 'Kia Sportage'
  )
    AND currency = 'RWF'
    AND daily_rate BETWEEN 1 AND 999;
END $$;
