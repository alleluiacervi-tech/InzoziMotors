-- ─────────────────────────────────────────────────────────────────────────────
-- 0045_import_catalog_brand_new.sql
--
-- Rebuilds the import catalogue around brand-new (0 km) vehicles, browsed
-- brand -> model, and removes data that was never true.
--
-- 0044 seeded 29 rows of invented content: hand-typed FOB and freight figures
-- attributed to no exporter, and 33 image references drawn from just 7 generic
-- Unsplash stock photographs, so a BYD Atto 3, a Kia Carnival and a Toyota
-- Hilux all rendered the same picture. It also described used stock ("verified
-- mileage and full maintenance records") across 2019-2024 year ranges.
--
-- What replaces it asserts only what is verifiable: which models a marque
-- currently builds, the body style, the fuels it is offered in, and where it
-- ships from. Price, engine displacement and photographs are NULL/empty by
-- construction and are filled in by an admin per model. A buyer sees the full
-- model list and asks for details; nothing quotes a number nobody stands
-- behind. backend/data/import-catalog.json is the source this was generated
-- from and stays the place to edit the model list.
-- ─────────────────────────────────────────────────────────────────────────────

-- Brand-new stock has one model year, not a range, and no mileage history.
ALTER TABLE global_import_catalog
  ADD COLUMN IF NOT EXISTS fuel_types  TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS condition   VARCHAR(20) NOT NULL DEFAULT 'new';

-- fuel_type (singular) replaced by fuel_types (plural), and dropped rather
-- than left alongside it. A new model is sold in several fuels at once -- a
-- Tucson is petrol, diesel AND hybrid -- so the single column could only ever
-- hold one of them, and a buyer filtering for a hybrid would not find it.
-- Keeping both would mean two columns answering one question, free to drift.
ALTER TABLE global_import_catalog DROP COLUMN IF EXISTS fuel_type;

-- Price, freight and engine become optional. They were NOT NULL, which is what
-- forced 0044 to invent a number for every row: the schema left no way to say
-- "not known yet", so guesses were entered instead. Saying nothing must be
-- representable, or the data is dishonest by design.
ALTER TABLE global_import_catalog
  ALTER COLUMN typical_fob_usd     DROP NOT NULL,
  ALTER COLUMN typical_freight_usd DROP NOT NULL,
  ALTER COLUMN engine_cc           DROP NOT NULL,
  ALTER COLUMN year_start          DROP NOT NULL,
  ALTER COLUMN year_end            DROP NOT NULL;

ALTER TABLE global_import_catalog
  ALTER COLUMN typical_fob_usd     DROP DEFAULT,
  ALTER COLUMN typical_freight_usd DROP DEFAULT;

-- A price of zero is not a price. Nothing writes 0 today; this stops a future
-- form that submits an empty field as 0 from presenting it as free.
ALTER TABLE global_import_catalog
  DROP CONSTRAINT IF EXISTS global_import_catalog_fob_positive,
  ADD  CONSTRAINT global_import_catalog_fob_positive
       CHECK (typical_fob_usd IS NULL OR typical_fob_usd > 0),
  DROP CONSTRAINT IF EXISTS global_import_catalog_freight_positive,
  ADD  CONSTRAINT global_import_catalog_freight_positive
       CHECK (typical_freight_usd IS NULL OR typical_freight_usd > 0);

-- One row per brand+model. Browsing is brand -> model, so a duplicate model
-- is a visible bug rather than a harmless one.
CREATE UNIQUE INDEX IF NOT EXISTS idx_global_import_catalog_make_model_unique
  ON global_import_catalog (lower(make), lower(model));

-- Out with the invented rows. This is a full replacement, not a merge: every
-- 0044 row carries a fabricated price and a stock photograph, so there is
-- nothing in one worth keeping. Any row an admin has since priced is kept --
-- that is real work by a real person, and it is matched back by make+model.
CREATE TEMP TABLE kept_catalog_edits AS
  SELECT lower(make) AS make_key, lower(model) AS model_key,
         typical_fob_usd, typical_freight_usd, engine_cc, images
    FROM global_import_catalog
   WHERE typical_fob_usd IS NOT NULL
     AND updated_at > created_at;

DELETE FROM global_import_catalog;

INSERT INTO global_import_catalog
  (make, model, body_type, origin_country, origin_port, fuel_types, display_order,
   condition, transmission, drive_side, estimated_transit_days,
   typical_fob_usd, typical_freight_usd, engine_cc, images, highlights, description, active)
SELECT v.make, v.model, v.body_type, v.origin_country, v.origin_port, v.fuel_types, v.display_order,
       'new', 'Automatic', 'LHD', 35,
       NULL, NULL, NULL, '{}', '{}', NULL, TRUE
  FROM (VALUES
  ('Toyota', 'Vitz', 'Hatchback', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 1),
  ('Toyota', 'Yaris', 'Hatchback', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 2),
  ('Toyota', 'Yaris Cross', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 3),
  ('Toyota', 'Corolla', 'Sedan', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 4),
  ('Toyota', 'Corolla Cross', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 5),
  ('Toyota', 'Camry', 'Sedan', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 6),
  ('Toyota', 'Raize', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 7),
  ('Toyota', 'Rush', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 8),
  ('Toyota', 'C-HR', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 9),
  ('Toyota', 'RAV4', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 10),
  ('Toyota', 'Harrier', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 11),
  ('Toyota', 'Fortuner', 'SUV', 'Japan', 'Yokohama', ARRAY['Diesel', 'Petrol']::TEXT[], 12),
  ('Toyota', 'Land Cruiser Prado', 'SUV', 'Japan', 'Yokohama', ARRAY['Diesel', 'Petrol']::TEXT[], 13),
  ('Toyota', 'Land Cruiser 300', 'SUV', 'Japan', 'Yokohama', ARRAY['Diesel', 'Petrol']::TEXT[], 14),
  ('Toyota', 'Land Cruiser 70', 'SUV', 'Japan', 'Yokohama', ARRAY['Diesel']::TEXT[], 15),
  ('Toyota', 'Hilux', 'Pickup', 'Japan', 'Yokohama', ARRAY['Diesel', 'Petrol']::TEXT[], 16),
  ('Toyota', 'Hiace', 'Van', 'Japan', 'Yokohama', ARRAY['Diesel', 'Petrol']::TEXT[], 17),
  ('Toyota', 'Coaster', 'Bus', 'Japan', 'Yokohama', ARRAY['Diesel']::TEXT[], 18),
  ('Toyota', 'Avanza', 'MPV', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 19),
  ('Toyota', 'Noah', 'MPV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 20),
  ('Toyota', 'Alphard', 'MPV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 21),
  ('Toyota', 'Dyna', 'Truck', 'Japan', 'Yokohama', ARRAY['Diesel']::TEXT[], 22),
  ('Toyota', 'bZ4X', 'SUV', 'Japan', 'Yokohama', ARRAY['Electric']::TEXT[], 23),
  ('Lexus', 'UX', 'SUV', 'Japan', 'Yokohama', ARRAY['Hybrid', 'Electric']::TEXT[], 1),
  ('Lexus', 'NX', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 2),
  ('Lexus', 'RX', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 3),
  ('Lexus', 'GX', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 4),
  ('Lexus', 'LX', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Diesel']::TEXT[], 5),
  ('Lexus', 'TX', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 6),
  ('Lexus', 'ES', 'Sedan', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 7),
  ('Lexus', 'LS', 'Sedan', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 8),
  ('Lexus', 'LM', 'MPV', 'Japan', 'Yokohama', ARRAY['Hybrid']::TEXT[], 9),
  ('Lexus', 'RZ', 'SUV', 'Japan', 'Yokohama', ARRAY['Electric']::TEXT[], 10),
  ('Nissan', 'March', 'Hatchback', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 1),
  ('Nissan', 'Note', 'Hatchback', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 2),
  ('Nissan', 'Sunny', 'Sedan', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 3),
  ('Nissan', 'Sentra', 'Sedan', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 4),
  ('Nissan', 'Altima', 'Sedan', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 5),
  ('Nissan', 'Juke', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 6),
  ('Nissan', 'Kicks', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 7),
  ('Nissan', 'Qashqai', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 8),
  ('Nissan', 'X-Trail', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 9),
  ('Nissan', 'Pathfinder', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 10),
  ('Nissan', 'Patrol', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Diesel']::TEXT[], 11),
  ('Nissan', 'Navara', 'Pickup', 'Japan', 'Yokohama', ARRAY['Diesel']::TEXT[], 12),
  ('Nissan', 'NV350 Urvan', 'Van', 'Japan', 'Yokohama', ARRAY['Diesel', 'Petrol']::TEXT[], 13),
  ('Nissan', 'Leaf', 'Hatchback', 'Japan', 'Yokohama', ARRAY['Electric']::TEXT[], 14),
  ('Nissan', 'Ariya', 'SUV', 'Japan', 'Yokohama', ARRAY['Electric']::TEXT[], 15),
  ('Honda', 'Fit', 'Hatchback', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 1),
  ('Honda', 'Civic', 'Sedan', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 2),
  ('Honda', 'Accord', 'Sedan', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 3),
  ('Honda', 'WR-V', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 4),
  ('Honda', 'HR-V', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 5),
  ('Honda', 'CR-V', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 6),
  ('Honda', 'Pilot', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 7),
  ('Honda', 'Odyssey', 'MPV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 8),
  ('Honda', 'Freed', 'MPV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 9),
  ('Honda', 'e:Ny1', 'SUV', 'Japan', 'Yokohama', ARRAY['Electric']::TEXT[], 10),
  ('Mazda', 'Mazda2', 'Hatchback', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 1),
  ('Mazda', 'Mazda3', 'Sedan', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 2),
  ('Mazda', 'Mazda6', 'Sedan', 'Japan', 'Yokohama', ARRAY['Petrol', 'Diesel']::TEXT[], 3),
  ('Mazda', 'CX-3', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 4),
  ('Mazda', 'CX-30', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 5),
  ('Mazda', 'CX-5', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Diesel']::TEXT[], 6),
  ('Mazda', 'CX-60', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Diesel', 'Hybrid']::TEXT[], 7),
  ('Mazda', 'CX-8', 'SUV', 'Japan', 'Yokohama', ARRAY['Diesel']::TEXT[], 8),
  ('Mazda', 'CX-9', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 9),
  ('Mazda', 'BT-50', 'Pickup', 'Japan', 'Yokohama', ARRAY['Diesel']::TEXT[], 10),
  ('Mitsubishi', 'Mirage', 'Hatchback', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 1),
  ('Mitsubishi', 'Attrage', 'Sedan', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 2),
  ('Mitsubishi', 'Xpander', 'MPV', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 3),
  ('Mitsubishi', 'ASX', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 4),
  ('Mitsubishi', 'Eclipse Cross', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 5),
  ('Mitsubishi', 'Outlander', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 6),
  ('Mitsubishi', 'Montero Sport', 'SUV', 'Japan', 'Yokohama', ARRAY['Diesel']::TEXT[], 7),
  ('Mitsubishi', 'Pajero Sport', 'SUV', 'Japan', 'Yokohama', ARRAY['Diesel']::TEXT[], 8),
  ('Mitsubishi', 'L200 Triton', 'Pickup', 'Japan', 'Yokohama', ARRAY['Diesel']::TEXT[], 9),
  ('Mitsubishi', 'Canter', 'Truck', 'Japan', 'Yokohama', ARRAY['Diesel']::TEXT[], 10),
  ('Suzuki', 'Alto', 'Hatchback', 'Japan', 'Kobe', ARRAY['Petrol']::TEXT[], 1),
  ('Suzuki', 'Wagon R', 'Hatchback', 'Japan', 'Kobe', ARRAY['Petrol', 'Hybrid']::TEXT[], 2),
  ('Suzuki', 'Swift', 'Hatchback', 'Japan', 'Kobe', ARRAY['Petrol', 'Hybrid']::TEXT[], 3),
  ('Suzuki', 'Baleno', 'Hatchback', 'Japan', 'Kobe', ARRAY['Petrol']::TEXT[], 4),
  ('Suzuki', 'Dzire', 'Sedan', 'Japan', 'Kobe', ARRAY['Petrol']::TEXT[], 5),
  ('Suzuki', 'Ciaz', 'Sedan', 'Japan', 'Kobe', ARRAY['Petrol']::TEXT[], 6),
  ('Suzuki', 'Ignis', 'SUV', 'Japan', 'Kobe', ARRAY['Petrol']::TEXT[], 7),
  ('Suzuki', 'Jimny', 'SUV', 'Japan', 'Kobe', ARRAY['Petrol']::TEXT[], 8),
  ('Suzuki', 'Vitara', 'SUV', 'Japan', 'Kobe', ARRAY['Petrol', 'Hybrid']::TEXT[], 9),
  ('Suzuki', 'Grand Vitara', 'SUV', 'Japan', 'Kobe', ARRAY['Petrol', 'Hybrid']::TEXT[], 10),
  ('Suzuki', 'Ertiga', 'MPV', 'Japan', 'Kobe', ARRAY['Petrol']::TEXT[], 11),
  ('Suzuki', 'APV', 'Van', 'Japan', 'Kobe', ARRAY['Petrol']::TEXT[], 12),
  ('Suzuki', 'Carry', 'Truck', 'Japan', 'Kobe', ARRAY['Petrol']::TEXT[], 13),
  ('Subaru', 'Impreza', 'Hatchback', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 1),
  ('Subaru', 'Crosstrek', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 2),
  ('Subaru', 'Forester', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol', 'Hybrid']::TEXT[], 3),
  ('Subaru', 'Outback', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 4),
  ('Subaru', 'Legacy', 'Sedan', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 5),
  ('Subaru', 'Ascent', 'SUV', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 6),
  ('Subaru', 'WRX', 'Sedan', 'Japan', 'Yokohama', ARRAY['Petrol']::TEXT[], 7),
  ('Subaru', 'Solterra', 'SUV', 'Japan', 'Yokohama', ARRAY['Electric']::TEXT[], 8),
  ('Isuzu', 'D-Max', 'Pickup', 'Japan', 'Yokohama', ARRAY['Diesel']::TEXT[], 1),
  ('Isuzu', 'MU-X', 'SUV', 'Japan', 'Yokohama', ARRAY['Diesel']::TEXT[], 2),
  ('Isuzu', 'NPR', 'Truck', 'Japan', 'Yokohama', ARRAY['Diesel']::TEXT[], 3),
  ('Isuzu', 'NQR', 'Truck', 'Japan', 'Yokohama', ARRAY['Diesel']::TEXT[], 4),
  ('Isuzu', 'FVR', 'Truck', 'Japan', 'Yokohama', ARRAY['Diesel']::TEXT[], 5),
  ('Isuzu', 'FRR', 'Truck', 'Japan', 'Yokohama', ARRAY['Diesel']::TEXT[], 6),
  ('Hyundai', 'Grand i10', 'Hatchback', 'South Korea', 'Incheon', ARRAY['Petrol']::TEXT[], 1),
  ('Hyundai', 'i20', 'Hatchback', 'South Korea', 'Incheon', ARRAY['Petrol']::TEXT[], 2),
  ('Hyundai', 'i30', 'Hatchback', 'South Korea', 'Incheon', ARRAY['Petrol']::TEXT[], 3),
  ('Hyundai', 'Accent', 'Sedan', 'South Korea', 'Incheon', ARRAY['Petrol']::TEXT[], 4),
  ('Hyundai', 'Avante', 'Sedan', 'South Korea', 'Incheon', ARRAY['Petrol', 'Hybrid']::TEXT[], 5),
  ('Hyundai', 'Elantra', 'Sedan', 'South Korea', 'Incheon', ARRAY['Petrol', 'Hybrid']::TEXT[], 6),
  ('Hyundai', 'Sonata', 'Sedan', 'South Korea', 'Incheon', ARRAY['Petrol', 'Hybrid']::TEXT[], 7),
  ('Hyundai', 'Grandeur', 'Sedan', 'South Korea', 'Incheon', ARRAY['Petrol', 'Hybrid']::TEXT[], 8),
  ('Hyundai', 'Venue', 'SUV', 'South Korea', 'Incheon', ARRAY['Petrol']::TEXT[], 9),
  ('Hyundai', 'Bayon', 'SUV', 'South Korea', 'Incheon', ARRAY['Petrol']::TEXT[], 10),
  ('Hyundai', 'Kona', 'SUV', 'South Korea', 'Incheon', ARRAY['Petrol', 'Hybrid', 'Electric']::TEXT[], 11),
  ('Hyundai', 'Creta', 'SUV', 'South Korea', 'Incheon', ARRAY['Petrol', 'Diesel']::TEXT[], 12),
  ('Hyundai', 'Tucson', 'SUV', 'South Korea', 'Incheon', ARRAY['Petrol', 'Diesel', 'Hybrid']::TEXT[], 13),
  ('Hyundai', 'Santa Fe', 'SUV', 'South Korea', 'Incheon', ARRAY['Petrol', 'Diesel', 'Hybrid']::TEXT[], 14),
  ('Hyundai', 'Palisade', 'SUV', 'South Korea', 'Incheon', ARRAY['Petrol', 'Diesel']::TEXT[], 15),
  ('Hyundai', 'Staria', 'Van', 'South Korea', 'Incheon', ARRAY['Diesel']::TEXT[], 16),
  ('Hyundai', 'H-1 Starex', 'Van', 'South Korea', 'Incheon', ARRAY['Diesel']::TEXT[], 17),
  ('Hyundai', 'Porter', 'Truck', 'South Korea', 'Incheon', ARRAY['Diesel']::TEXT[], 18),
  ('Hyundai', 'Mighty', 'Truck', 'South Korea', 'Incheon', ARRAY['Diesel']::TEXT[], 19),
  ('Hyundai', 'Ioniq 5', 'SUV', 'South Korea', 'Incheon', ARRAY['Electric']::TEXT[], 20),
  ('Hyundai', 'Ioniq 6', 'Sedan', 'South Korea', 'Incheon', ARRAY['Electric']::TEXT[], 21),
  ('Hyundai', 'Ioniq 9', 'SUV', 'South Korea', 'Incheon', ARRAY['Electric']::TEXT[], 22),
  ('Kia', 'Picanto', 'Hatchback', 'South Korea', 'Incheon', ARRAY['Petrol']::TEXT[], 1),
  ('Kia', 'Rio', 'Hatchback', 'South Korea', 'Incheon', ARRAY['Petrol']::TEXT[], 2),
  ('Kia', 'K3', 'Sedan', 'South Korea', 'Incheon', ARRAY['Petrol']::TEXT[], 3),
  ('Kia', 'K5', 'Sedan', 'South Korea', 'Incheon', ARRAY['Petrol', 'Hybrid']::TEXT[], 4),
  ('Kia', 'K8', 'Sedan', 'South Korea', 'Incheon', ARRAY['Petrol', 'Hybrid']::TEXT[], 5),
  ('Kia', 'Soul', 'Hatchback', 'South Korea', 'Incheon', ARRAY['Petrol']::TEXT[], 6),
  ('Kia', 'Stonic', 'SUV', 'South Korea', 'Incheon', ARRAY['Petrol']::TEXT[], 7),
  ('Kia', 'Seltos', 'SUV', 'South Korea', 'Incheon', ARRAY['Petrol', 'Diesel']::TEXT[], 8),
  ('Kia', 'Niro', 'SUV', 'South Korea', 'Incheon', ARRAY['Hybrid', 'Electric']::TEXT[], 9),
  ('Kia', 'Sportage', 'SUV', 'South Korea', 'Incheon', ARRAY['Petrol', 'Diesel', 'Hybrid']::TEXT[], 10),
  ('Kia', 'Sorento', 'SUV', 'South Korea', 'Incheon', ARRAY['Petrol', 'Diesel', 'Hybrid']::TEXT[], 11),
  ('Kia', 'Mohave', 'SUV', 'South Korea', 'Incheon', ARRAY['Diesel']::TEXT[], 12),
  ('Kia', 'Telluride', 'SUV', 'South Korea', 'Incheon', ARRAY['Petrol']::TEXT[], 13),
  ('Kia', 'Carnival', 'MPV', 'South Korea', 'Incheon', ARRAY['Petrol', 'Diesel', 'Hybrid']::TEXT[], 14),
  ('Kia', 'Bongo', 'Truck', 'South Korea', 'Incheon', ARRAY['Diesel']::TEXT[], 15),
  ('Kia', 'EV3', 'SUV', 'South Korea', 'Incheon', ARRAY['Electric']::TEXT[], 16),
  ('Kia', 'EV6', 'SUV', 'South Korea', 'Incheon', ARRAY['Electric']::TEXT[], 17),
  ('Kia', 'EV9', 'SUV', 'South Korea', 'Incheon', ARRAY['Electric']::TEXT[], 18),
  ('Genesis', 'G70', 'Sedan', 'South Korea', 'Incheon', ARRAY['Petrol']::TEXT[], 1),
  ('Genesis', 'G80', 'Sedan', 'South Korea', 'Incheon', ARRAY['Petrol', 'Electric']::TEXT[], 2),
  ('Genesis', 'G90', 'Sedan', 'South Korea', 'Incheon', ARRAY['Petrol']::TEXT[], 3),
  ('Genesis', 'GV60', 'SUV', 'South Korea', 'Incheon', ARRAY['Electric']::TEXT[], 4),
  ('Genesis', 'GV70', 'SUV', 'South Korea', 'Incheon', ARRAY['Petrol', 'Electric']::TEXT[], 5),
  ('Genesis', 'GV80', 'SUV', 'South Korea', 'Incheon', ARRAY['Petrol', 'Diesel']::TEXT[], 6),
  ('BYD', 'Dolphin', 'Hatchback', 'China', 'Shanghai', ARRAY['Electric']::TEXT[], 1),
  ('BYD', 'Seagull', 'Hatchback', 'China', 'Shanghai', ARRAY['Electric']::TEXT[], 2),
  ('BYD', 'Atto 3', 'SUV', 'China', 'Shanghai', ARRAY['Electric']::TEXT[], 3),
  ('BYD', 'Yuan Plus', 'SUV', 'China', 'Shanghai', ARRAY['Electric']::TEXT[], 4),
  ('BYD', 'Seal', 'Sedan', 'China', 'Shanghai', ARRAY['Electric']::TEXT[], 5),
  ('BYD', 'Seal U', 'SUV', 'China', 'Shanghai', ARRAY['Electric', 'Hybrid']::TEXT[], 6),
  ('BYD', 'Han', 'Sedan', 'China', 'Shanghai', ARRAY['Electric', 'Hybrid']::TEXT[], 7),
  ('BYD', 'Qin Plus', 'Sedan', 'China', 'Shanghai', ARRAY['Electric', 'Hybrid']::TEXT[], 8),
  ('BYD', 'Song Plus', 'SUV', 'China', 'Shanghai', ARRAY['Electric', 'Hybrid']::TEXT[], 9),
  ('BYD', 'Song Pro', 'SUV', 'China', 'Shanghai', ARRAY['Electric', 'Hybrid']::TEXT[], 10),
  ('BYD', 'Tang', 'SUV', 'China', 'Shanghai', ARRAY['Electric', 'Hybrid']::TEXT[], 11),
  ('BYD', 'Sealion 6', 'SUV', 'China', 'Shanghai', ARRAY['Hybrid']::TEXT[], 12),
  ('BYD', 'Sealion 7', 'SUV', 'China', 'Shanghai', ARRAY['Electric']::TEXT[], 13),
  ('BYD', 'Shark', 'Pickup', 'China', 'Shanghai', ARRAY['Hybrid']::TEXT[], 14),
  ('BYD', 'M6', 'MPV', 'China', 'Shanghai', ARRAY['Electric']::TEXT[], 15),
  ('Chery', 'QQ', 'Hatchback', 'China', 'Shanghai', ARRAY['Petrol', 'Electric']::TEXT[], 1),
  ('Chery', 'Arrizo 5', 'Sedan', 'China', 'Shanghai', ARRAY['Petrol']::TEXT[], 2),
  ('Chery', 'Arrizo 6', 'Sedan', 'China', 'Shanghai', ARRAY['Petrol']::TEXT[], 3),
  ('Chery', 'Arrizo 8', 'Sedan', 'China', 'Shanghai', ARRAY['Petrol']::TEXT[], 4),
  ('Chery', 'Tiggo 2 Pro', 'SUV', 'China', 'Shanghai', ARRAY['Petrol']::TEXT[], 5),
  ('Chery', 'Tiggo 4 Pro', 'SUV', 'China', 'Shanghai', ARRAY['Petrol']::TEXT[], 6),
  ('Chery', 'Tiggo 7 Pro', 'SUV', 'China', 'Shanghai', ARRAY['Petrol', 'Hybrid']::TEXT[], 7),
  ('Chery', 'Tiggo 8 Pro', 'SUV', 'China', 'Shanghai', ARRAY['Petrol', 'Hybrid']::TEXT[], 8),
  ('Chery', 'Tiggo 9', 'SUV', 'China', 'Shanghai', ARRAY['Petrol', 'Hybrid']::TEXT[], 9),
  ('Chery', 'Omoda 5', 'SUV', 'China', 'Shanghai', ARRAY['Petrol', 'Electric']::TEXT[], 10),
  ('Chery', 'Jaecoo 7', 'SUV', 'China', 'Shanghai', ARRAY['Petrol', 'Hybrid']::TEXT[], 11),
  ('Geely', 'Coolray', 'SUV', 'China', 'Ningbo', ARRAY['Petrol']::TEXT[], 1),
  ('Geely', 'Azkarra', 'SUV', 'China', 'Ningbo', ARRAY['Petrol', 'Hybrid']::TEXT[], 2),
  ('Geely', 'Okavango', 'SUV', 'China', 'Ningbo', ARRAY['Petrol', 'Hybrid']::TEXT[], 3),
  ('Geely', 'Monjaro', 'SUV', 'China', 'Ningbo', ARRAY['Petrol']::TEXT[], 4),
  ('Geely', 'Emgrand', 'Sedan', 'China', 'Ningbo', ARRAY['Petrol']::TEXT[], 5),
  ('Geely', 'Preface', 'Sedan', 'China', 'Ningbo', ARRAY['Petrol']::TEXT[], 6),
  ('Geely', 'Starray', 'SUV', 'China', 'Ningbo', ARRAY['Petrol', 'Hybrid']::TEXT[], 7),
  ('Geely', 'Geometry C', 'SUV', 'China', 'Ningbo', ARRAY['Electric']::TEXT[], 8),
  ('Geely', 'EX5', 'SUV', 'China', 'Ningbo', ARRAY['Electric']::TEXT[], 9),
  ('Haval', 'Jolion', 'SUV', 'China', 'Tianjin', ARRAY['Petrol', 'Hybrid']::TEXT[], 1),
  ('Haval', 'H6', 'SUV', 'China', 'Tianjin', ARRAY['Petrol', 'Hybrid']::TEXT[], 2),
  ('Haval', 'H9', 'SUV', 'China', 'Tianjin', ARRAY['Petrol', 'Diesel']::TEXT[], 3),
  ('Haval', 'Dargo', 'SUV', 'China', 'Tianjin', ARRAY['Petrol']::TEXT[], 4),
  ('Haval', 'H7', 'SUV', 'China', 'Tianjin', ARRAY['Petrol']::TEXT[], 5),
  ('GWM', 'Poer', 'Pickup', 'China', 'Tianjin', ARRAY['Diesel', 'Petrol']::TEXT[], 1),
  ('GWM', 'Wingle 5', 'Pickup', 'China', 'Tianjin', ARRAY['Diesel']::TEXT[], 2),
  ('GWM', 'Wingle 7', 'Pickup', 'China', 'Tianjin', ARRAY['Diesel']::TEXT[], 3),
  ('GWM', 'Tank 300', 'SUV', 'China', 'Tianjin', ARRAY['Petrol', 'Hybrid']::TEXT[], 4),
  ('GWM', 'Tank 500', 'SUV', 'China', 'Tianjin', ARRAY['Petrol', 'Hybrid']::TEXT[], 5),
  ('GWM', 'Ora 03', 'Hatchback', 'China', 'Tianjin', ARRAY['Electric']::TEXT[], 6),
  ('Changan', 'Alsvin', 'Sedan', 'China', 'Shanghai', ARRAY['Petrol']::TEXT[], 1),
  ('Changan', 'Eado', 'Sedan', 'China', 'Shanghai', ARRAY['Petrol']::TEXT[], 2),
  ('Changan', 'CS35 Plus', 'SUV', 'China', 'Shanghai', ARRAY['Petrol']::TEXT[], 3),
  ('Changan', 'CS55 Plus', 'SUV', 'China', 'Shanghai', ARRAY['Petrol']::TEXT[], 4),
  ('Changan', 'CS75 Plus', 'SUV', 'China', 'Shanghai', ARRAY['Petrol', 'Hybrid']::TEXT[], 5),
  ('Changan', 'CS85', 'SUV', 'China', 'Shanghai', ARRAY['Petrol']::TEXT[], 6),
  ('Changan', 'UNI-K', 'SUV', 'China', 'Shanghai', ARRAY['Petrol', 'Hybrid']::TEXT[], 7),
  ('Changan', 'UNI-T', 'SUV', 'China', 'Shanghai', ARRAY['Petrol']::TEXT[], 8),
  ('Changan', 'Hunter', 'Pickup', 'China', 'Shanghai', ARRAY['Diesel']::TEXT[], 9),
  ('Jetour', 'X50', 'SUV', 'China', 'Shanghai', ARRAY['Petrol']::TEXT[], 1),
  ('Jetour', 'X70', 'SUV', 'China', 'Shanghai', ARRAY['Petrol']::TEXT[], 2),
  ('Jetour', 'X90', 'SUV', 'China', 'Shanghai', ARRAY['Petrol']::TEXT[], 3),
  ('Jetour', 'Dashing', 'SUV', 'China', 'Shanghai', ARRAY['Petrol']::TEXT[], 4),
  ('Jetour', 'T2', 'SUV', 'China', 'Shanghai', ARRAY['Petrol', 'Hybrid']::TEXT[], 5),
  ('MG', 'MG3', 'Hatchback', 'China', 'Shanghai', ARRAY['Petrol', 'Hybrid']::TEXT[], 1),
  ('MG', 'MG5', 'Sedan', 'China', 'Shanghai', ARRAY['Petrol']::TEXT[], 2),
  ('MG', 'ZS', 'SUV', 'China', 'Shanghai', ARRAY['Petrol', 'Electric']::TEXT[], 3),
  ('MG', 'HS', 'SUV', 'China', 'Shanghai', ARRAY['Petrol', 'Hybrid']::TEXT[], 4),
  ('MG', 'RX5', 'SUV', 'China', 'Shanghai', ARRAY['Petrol']::TEXT[], 5),
  ('MG', 'RX8', 'SUV', 'China', 'Shanghai', ARRAY['Petrol']::TEXT[], 6),
  ('MG', 'MG4', 'Hatchback', 'China', 'Shanghai', ARRAY['Electric']::TEXT[], 7),
  ('MG', 'Extender', 'Pickup', 'China', 'Shanghai', ARRAY['Diesel']::TEXT[], 8),
  ('Foton', 'Tunland', 'Pickup', 'China', 'Tianjin', ARRAY['Diesel']::TEXT[], 1),
  ('Foton', 'Aumark', 'Truck', 'China', 'Tianjin', ARRAY['Diesel']::TEXT[], 2),
  ('Foton', 'Ollin', 'Truck', 'China', 'Tianjin', ARRAY['Diesel']::TEXT[], 3),
  ('Foton', 'Auman', 'Truck', 'China', 'Tianjin', ARRAY['Diesel']::TEXT[], 4),
  ('Foton', 'View', 'Van', 'China', 'Tianjin', ARRAY['Diesel']::TEXT[], 5),
  ('JAC', 'T6', 'Pickup', 'China', 'Shanghai', ARRAY['Diesel']::TEXT[], 1),
  ('JAC', 'T8', 'Pickup', 'China', 'Shanghai', ARRAY['Diesel']::TEXT[], 2),
  ('JAC', 'T9', 'Pickup', 'China', 'Shanghai', ARRAY['Diesel']::TEXT[], 3),
  ('JAC', 'JS4', 'SUV', 'China', 'Shanghai', ARRAY['Petrol']::TEXT[], 4),
  ('JAC', 'N-Series', 'Truck', 'China', 'Shanghai', ARRAY['Diesel']::TEXT[], 5),
  ('Dongfeng', 'Rich 6', 'Pickup', 'China', 'Shanghai', ARRAY['Diesel']::TEXT[], 1),
  ('Dongfeng', 'Glory 580', 'SUV', 'China', 'Shanghai', ARRAY['Petrol']::TEXT[], 2),
  ('Dongfeng', 'Forthing T5', 'SUV', 'China', 'Shanghai', ARRAY['Petrol']::TEXT[], 3),
  ('Dongfeng', 'Captain', 'Truck', 'China', 'Shanghai', ARRAY['Diesel']::TEXT[], 4)
  ) AS v(make, model, body_type, origin_country, origin_port, fuel_types, display_order);

-- Restore an admin's own pricing and photographs onto the rebuilt rows.
UPDATE global_import_catalog c
   SET typical_fob_usd     = k.typical_fob_usd,
       typical_freight_usd = k.typical_freight_usd,
       engine_cc           = k.engine_cc,
       images              = k.images,
       updated_at          = NOW()
  FROM kept_catalog_edits k
 WHERE lower(c.make) = k.make_key AND lower(c.model) = k.model_key;

DROP TABLE kept_catalog_edits;

CREATE INDEX IF NOT EXISTS idx_global_import_catalog_body ON global_import_catalog (body_type);
