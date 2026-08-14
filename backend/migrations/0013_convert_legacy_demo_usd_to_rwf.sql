-- Restate the repository's original USD demo fixtures in Rwandan francs.
-- The exact-title and currency predicates exclude customer-created RWF records.
-- Every changed value is logged before mutation, making this repair auditable.
DO $$
DECLARE
  seed_rate CONSTANT NUMERIC := 1470;
BEGIN
  INSERT INTO fx_conversions
    (table_name, row_id, column_name, from_currency, to_currency,
     old_value, new_value, rate, note)
  SELECT 'cars', c.id::text, 'price', 'USD', 'RWF',
         c.price, ROUND(c.price * seed_rate), seed_rate,
         '0013: restate original Sawa demo inventory in RWF'
  FROM cars c
  WHERE c.title IN (
    '2022 Tesla Model 3 Long Range', '2021 BMW 4 Series M Sport',
    '2020 Toyota RAV4 XLE AWD', '2019 Ford F-150 Lariat',
    '2023 Hyundai Ioniq 5 SEL', '2021 Mercedes-Benz GLC 300',
    '2022 Honda Civic Sport', '2020 Jeep Grand Cherokee Laredo',
    '2021 Ram 1500 Limited', '2023 Tesla Model Y Performance',
    '2022 Audi A4 Premium Plus', '2022 Volkswagen Golf GTI',
    '2022 Land Rover Defender 110', '2023 Kia Telluride SX',
    '2021 Lexus ES 350 Ultra Luxury'
  )
    AND c.currency = 'USD'
    AND c.price BETWEEN 1000 AND 999999;

  UPDATE cars
  SET price = ROUND(price * seed_rate), currency = 'RWF'
  WHERE title IN (
    '2022 Tesla Model 3 Long Range', '2021 BMW 4 Series M Sport',
    '2020 Toyota RAV4 XLE AWD', '2019 Ford F-150 Lariat',
    '2023 Hyundai Ioniq 5 SEL', '2021 Mercedes-Benz GLC 300',
    '2022 Honda Civic Sport', '2020 Jeep Grand Cherokee Laredo',
    '2021 Ram 1500 Limited', '2023 Tesla Model Y Performance',
    '2022 Audi A4 Premium Plus', '2022 Volkswagen Golf GTI',
    '2022 Land Rover Defender 110', '2023 Kia Telluride SX',
    '2021 Lexus ES 350 Ultra Luxury'
  )
    AND currency = 'USD'
    AND price BETWEEN 1000 AND 999999;

  INSERT INTO fx_conversions
    (table_name, row_id, column_name, from_currency, to_currency,
     old_value, new_value, rate, note)
  SELECT 'price_history', ph.id::text, 'price', 'USD', 'RWF',
         ph.price, ROUND(ph.price * seed_rate), seed_rate,
         '0013: restate original Sawa demo price history in RWF'
  FROM price_history ph
  JOIN cars c ON c.id = ph.car_id
  WHERE c.title IN (
    '2022 Tesla Model 3 Long Range', '2021 BMW 4 Series M Sport',
    '2020 Toyota RAV4 XLE AWD', '2019 Ford F-150 Lariat',
    '2023 Hyundai Ioniq 5 SEL', '2021 Mercedes-Benz GLC 300',
    '2022 Honda Civic Sport', '2020 Jeep Grand Cherokee Laredo',
    '2021 Ram 1500 Limited', '2023 Tesla Model Y Performance',
    '2022 Audi A4 Premium Plus', '2022 Volkswagen Golf GTI',
    '2022 Land Rover Defender 110', '2023 Kia Telluride SX',
    '2021 Lexus ES 350 Ultra Luxury'
  )
    AND ph.currency = 'USD'
    AND ph.price BETWEEN 1000 AND 999999;

  UPDATE price_history ph
  SET price = ROUND(ph.price * seed_rate), currency = 'RWF'
  FROM cars c
  WHERE c.id = ph.car_id
    AND c.title IN (
      '2022 Tesla Model 3 Long Range', '2021 BMW 4 Series M Sport',
      '2020 Toyota RAV4 XLE AWD', '2019 Ford F-150 Lariat',
      '2023 Hyundai Ioniq 5 SEL', '2021 Mercedes-Benz GLC 300',
      '2022 Honda Civic Sport', '2020 Jeep Grand Cherokee Laredo',
      '2021 Ram 1500 Limited', '2023 Tesla Model Y Performance',
      '2022 Audi A4 Premium Plus', '2022 Volkswagen Golf GTI',
      '2022 Land Rover Defender 110', '2023 Kia Telluride SX',
      '2021 Lexus ES 350 Ultra Luxury'
    )
    AND ph.currency = 'USD'
    AND ph.price BETWEEN 1000 AND 999999;

  INSERT INTO fx_conversions
    (table_name, row_id, column_name, from_currency, to_currency,
     old_value, new_value, rate, note)
  SELECT 'rental_cars', rc.id::text, v.column_name, 'USD', 'RWF',
         v.old_value, ROUND(v.old_value * seed_rate), seed_rate,
         '0013: restate original Sawa demo rental fleet in RWF'
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
    AND rc.currency = 'USD'
    AND rc.daily_rate BETWEEN 1 AND 999
    AND v.old_value IS NOT NULL;

  UPDATE rental_cars
  SET daily_rate = ROUND(daily_rate * seed_rate),
      weekly_rate = ROUND(weekly_rate * seed_rate),
      deposit = ROUND(deposit * seed_rate),
      currency = 'RWF'
  WHERE title IN (
    'Toyota RAV4 Hybrid', 'Toyota Land Cruiser Prado', 'Toyota Corolla',
    'Mitsubishi Pajero Sport', 'Toyota Hilux Double Cab', 'Hyundai Tucson',
    'Suzuki Jimny', 'Kia Sportage'
  )
    AND currency = 'USD'
    AND daily_rate BETWEEN 1 AND 999;
END $$;
