-- Converge repository-owned demo listings on their canonical RWF fixture values.
-- Exact titles exclude customer inventory; only differing values are audited.
DO $$
BEGIN
  CREATE TEMP TABLE expected_demo_prices
    (title TEXT PRIMARY KEY, price_rwf BIGINT NOT NULL) ON COMMIT DROP;
  INSERT INTO expected_demo_prices VALUES
    ('2022 Tesla Model 3 Long Range',36603000),
    ('2021 BMW 4 Series M Sport',46305000),
    ('2020 Toyota RAV4 XLE AWD',38661000),
    ('2019 Ford F-150 Lariat',49612500),
    ('2023 Hyundai Ioniq 5 SEL',57183000),
    ('2021 Mercedes-Benz GLC 300',60564000),
    ('2022 Honda Civic Sport',32046000),
    ('2020 Jeep Grand Cherokee Laredo',41895000),
    ('2021 Ram 1500 Limited',67473000),
    ('2023 Tesla Model Y Performance',63504000),
    ('2022 Audi A4 Premium Plus',47628000),
    ('2022 Volkswagen Golf GTI',43953000),
    ('2022 Land Rover Defender 110',98490000),
    ('2023 Kia Telluride SX',66444000),
    ('2021 Lexus ES 350 Ultra Luxury',56595000);

  INSERT INTO fx_conversions
    (table_name,row_id,column_name,from_currency,to_currency,
     old_value,new_value,rate,note)
  SELECT 'cars',c.id::text,'price',c.currency,'RWF',
         c.price,e.price_rwf,1470,
         '0014: normalize original Sawa demo listing to canonical RWF value'
  FROM cars c
  JOIN expected_demo_prices e ON e.title=c.title
  WHERE c.price IS DISTINCT FROM e.price_rwf OR c.currency<>'RWF';

  UPDATE cars c
  SET price=e.price_rwf,currency='RWF'
  FROM expected_demo_prices e
  WHERE e.title=c.title
    AND (c.price IS DISTINCT FROM e.price_rwf OR c.currency<>'RWF');
END $$;
