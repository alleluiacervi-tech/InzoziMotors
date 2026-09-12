-- ─────────────────────────────────────────────────────────────────────────────
-- 0044_global_import_catalog.sql
-- Global Import Catalog: searchable international models from South Korea,
-- China, United Arab Emirates, and Japan with FOB pricing, transit timelines,
-- and specifications for on-demand Rwandan vehicle importation.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS global_import_catalog (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make                    VARCHAR(80) NOT NULL,
  model                   VARCHAR(80) NOT NULL,
  year_start              SMALLINT NOT NULL,
  year_end                SMALLINT NOT NULL,
  trim                    VARCHAR(80),
  body_type               VARCHAR(50) NOT NULL,
  engine_cc               INT NOT NULL,
  fuel_type               VARCHAR(30) NOT NULL,
  transmission            VARCHAR(50) NOT NULL DEFAULT 'Automatic',
  drive_side              VARCHAR(10) NOT NULL DEFAULT 'LHD',
  origin_country          VARCHAR(80) NOT NULL,
  origin_port             VARCHAR(80) NOT NULL,
  typical_fob_usd         INT NOT NULL,
  typical_freight_usd     INT NOT NULL,
  estimated_transit_days  INT NOT NULL DEFAULT 35,
  images                  TEXT[] NOT NULL DEFAULT '{}',
  highlights              TEXT[] NOT NULL DEFAULT '{}',
  description             TEXT,
  display_order           INT NOT NULL DEFAULT 100,
  active                  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_global_import_catalog_make_model ON global_import_catalog (lower(make), lower(model));
CREATE INDEX IF NOT EXISTS idx_global_import_catalog_origin ON global_import_catalog (origin_country);
CREATE INDEX IF NOT EXISTS idx_global_import_catalog_active ON global_import_catalog (active, display_order);

-- Top in-demand global import vehicles
INSERT INTO global_import_catalog (
  make, model, year_start, year_end, trim, body_type, engine_cc, fuel_type,
  transmission, drive_side, origin_country, origin_port, typical_fob_usd,
  typical_freight_usd, estimated_transit_days, images, highlights, description, display_order
) VALUES
  -- ─── South Korea (Kia & Hyundai) ───────────────────────────────────────────
  ('Kia', 'Sportage', 2020, 2024, 'Noblesse / Signature', 'SUV', 2000, 'Diesel',
   'Automatic', 'LHD', 'South Korea', 'Incheon Port', 15500, 2800, 35,
   ARRAY['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80', 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80'],
   ARRAY['Lane Keep Assist', 'Ventilated & Heated Leather Seats', 'Panoramic Sunroof', 'Smart Cruise Control'],
   'Premium Korean domestic market (KDM) Kia Sportage. Rigorously inspected pre-shipment in Incheon with verified mileage and full maintenance records.', 10),

  ('Kia', 'Sorento', 2019, 2024, 'Master / Signature 7-Seat', 'SUV', 2200, 'Diesel',
   'Automatic', 'LHD', 'South Korea', 'Incheon Port', 19200, 3000, 35,
   ARRAY['https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80', 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80'],
   ARRAY['7-Seat Configuration', 'Surround View 360 Monitor', 'Smart Power Tailgate', 'Highway Driving Assist'],
   'Spacious, luxury 3-row family SUV from South Korea. Fuel efficient 2.2L e-VGT turbodiesel, ideal for long distance travel across Rwanda.', 12),

  ('Kia', 'Carnival', 2020, 2024, 'Limousine 7/9-Seat', 'Van', 2200, 'Diesel',
   'Automatic', 'LHD', 'South Korea', 'Incheon Port', 22500, 3200, 35,
   ARRAY['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80'],
   ARRAY['VIP Lounge Second-Row Seats', 'Dual Power Sliding Doors', 'Dual Sunroofs', 'Krell Premium Sound'],
   'Executive high-roof luxury minivan from South Korea. Unmatched executive passenger comfort and VIP travel.', 15),

  ('Kia', 'K5', 2020, 2024, 'Signature Turbo', 'Sedan', 1600, 'Petrol',
   'Automatic', 'LHD', 'South Korea', 'Incheon Port', 13800, 2600, 35,
   ARRAY['https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80', 'https://images.unsplash.com/photo-1556800572-1b8aeef2c54f?w=800&q=80'],
   ARRAY['Fastback Styling', 'Head-Up Display', '10.25-inch Navigation', 'Wireless Phone Charging'],
   'Striking modern fastback design, comfortable touring sedan with turbocharged engine and low fuel consumption.', 18),

  ('Kia', 'Seltos', 2020, 2024, 'Noblesse 4WD', 'SUV', 1600, 'Petrol',
   'Automatic', 'LHD', 'South Korea', 'Incheon Port', 14200, 2600, 35,
   ARRAY['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80'],
   ARRAY['All-Wheel Drive (AWD)', 'Bose Premium Audio', 'LED Headlamps', 'Drive Mode Select'],
   'Compact urban SUV with elevated ground clearance and full AWD capability, perfect for Kigali city and upcountry roads.', 20),

  ('Kia', 'EV6', 2022, 2025, 'GT-Line Long Range AWD', 'SUV', 0, 'Electric',
   'Automatic', 'LHD', 'South Korea', 'Incheon Port', 28000, 2800, 35,
   ARRAY['https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&q=80'],
   ARRAY['800V Ultra-Fast Charging', '500km Range', 'Vehicle-to-Load (V2L)', 'Meridian 14-Speaker Sound'],
   'State of the art all-electric crossover with 0% fuel expenses and low RRA import duty incentives in Rwanda.', 22),

  ('Hyundai', 'Palisade', 2020, 2024, 'Calligraphy 7-Seat AWD', 'SUV', 2200, 'Diesel',
   'Automatic', 'LHD', 'South Korea', 'Incheon Port', 25500, 3200, 35,
   ARRAY['https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80'],
   ARRAY['Nappa Leather Seating', 'HTRAC All-Wheel Drive', 'Blind-Spot View Monitor', 'Dual Wide Digital Cockpit'],
   'Hyundai flagship luxury 7-seat SUV. Dominant road presence, whisper-quiet cabin, and bulletproof diesel reliability.', 25),

  ('Hyundai', 'Santa Fe', 2019, 2024, 'Prestige / Calligraphy', 'SUV', 2000, 'Diesel',
   'Automatic', 'LHD', 'South Korea', 'Incheon Port', 18800, 2900, 35,
   ARRAY['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80'],
   ARRAY['HTRAC 4WD', 'Heated & Cooled Seats', 'Apple CarPlay & Android Auto', 'Smart Cruise with Stop & Go'],
   'High-spec midsize SUV directly from South Korea with full service record and verifiable mileage.', 28),

  ('Hyundai', 'Tucson', 2020, 2024, 'Inspiration AWD', 'SUV', 2000, 'Diesel',
   'Automatic', 'LHD', 'South Korea', 'Incheon Port', 16500, 2800, 35,
   ARRAY['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80'],
   ARRAY['Parametric Jewel Grille', 'Shift-by-Wire Transmission', 'Electronic Parking Brake', 'Multi-Air Mode AC'],
   'Futuristic styling and dynamic turbodiesel performance. One of the most sought-after imports in Rwanda.', 30),

  ('Hyundai', 'Avante', 2020, 2024, 'Modern / Inspiration (Elantra)', 'Sedan', 1600, 'Petrol',
   'Automatic', 'LHD', 'South Korea', 'Incheon Port', 12500, 2500, 35,
   ARRAY['https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80'],
   ARRAY['Exceptional Fuel Economy (5.5L/100km)', 'Digital Key', 'Forward Collision-Avoidance', 'Dual 10.25in Displays'],
   'Renowned KDM sedan known locally as Elantra. Unmatched fuel economy and low maintenance cost.', 32),

  ('Genesis', 'GV70', 2021, 2025, 'AWD Sport Package', 'SUV', 2200, 'Diesel',
   'Automatic', 'LHD', 'South Korea', 'Incheon Port', 34000, 3200, 35,
   ARRAY['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80'],
   ARRAY['Genesis Active Safety Control', 'Electronic Limited-Slip Differential', '3D Digital Cluster', 'Lexicon Sound System'],
   'Korea premier luxury marque competing directly with Porsche Macan and BMW X3. Breathtaking interior craftsmanship.', 35),

  -- ─── China (BYD, Geely, Haval, Jetour, Chery, Changan) ──────────────────────
  ('BYD', 'Song Plus', 2022, 2025, 'DM-i Flagship AWD', 'SUV', 1500, 'Hybrid',
   'Automatic', 'LHD', 'China', 'Shanghai Port', 17500, 2600, 40,
   ARRAY['https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&q=80', 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80'],
   ARRAY['1,100km Combined Range', 'Rotating 15.6in Screen', 'Blade Battery Safety', 'VTOL Mobile Power Station'],
   'The world best-selling plug-in hybrid SUV. 100km electric range for Kigali commuting plus 1,000km petrol backup.', 40),

  ('BYD', 'Atto 3', 2022, 2025, 'Extended Range (Yuan Plus)', 'SUV', 0, 'Electric',
   'Automatic', 'LHD', 'China', 'Ningbo Port', 16500, 2600, 40,
   ARRAY['https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&q=80'],
   ARRAY['Ultra-Safe Blade Battery', '480km Range', 'Panoramic Electric Sunroof', 'Heat Pump System'],
   'Dynamic all-electric compact SUV with gym-inspired interior, class-leading crash safety, and zero emissions.', 42),

  ('BYD', 'Tang', 2021, 2025, 'DM-i 7-Seat Flagship', 'SUV', 1500, 'Hybrid',
   'Automatic', 'LHD', 'China', 'Shanghai Port', 25500, 3000, 40,
   ARRAY['https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80'],
   ARRAY['Executive 7-Seat Layout', 'Dynaudio HiFi Audio', 'DiPilot Intelligent Driving', 'Brembo Calipers'],
   'Premium 7-seater executive hybrid SUV combining rapid acceleration, exceptional cabin insulation, and generous room.', 45),

  ('Geely', 'Monjaro', 2022, 2025, 'Exclusive 4WD Flagship', 'SUV', 2000, 'Petrol',
   'Automatic', 'LHD', 'China', 'Ningbo Port', 21500, 2800, 40,
   ARRAY['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80'],
   ARRAY['Volvo CMA Platform', 'Triple Panoramic Cockpit Screens', 'BorgWarner 6th-Gen 4WD', 'Bose Noise Cancelling'],
   'Engineered on Volvo CMA architecture with 238hp turbocharged engine. European chassis dynamics with Chinese luxury.', 50),

  ('Geely', 'Coolray', 2021, 2025, 'Sport Plus (Binyue)', 'SUV', 1500, 'Petrol',
   'Automatic', 'LHD', 'China', 'Ningbo Port', 12800, 2500, 40,
   ARRAY['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80'],
   ARRAY['Carbon Fibre Trim Accents', 'Quad Exhausts', 'Automatic Parking Assistant', '360 HD Camera'],
   'Youthful, punchy crossover SUV with quick DCT gear shifts, premium bucket seats, and outstanding reliability.', 52),

  ('Haval', 'H6', 2021, 2025, 'Supreme 4WD', 'SUV', 1500, 'Petrol',
   'Automatic', 'LHD', 'China', 'Shanghai Port', 14500, 2600, 40,
   ARRAY['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80'],
   ARRAY['GWM Lemon Modular Platform', 'Level 2 Autonomous Driving', 'HUD Head-Up Display', 'Auto Reversing Tracking'],
   'China top-selling SUV for 10 straight years. Spacious cabin, bulletproof build quality, and strong resale value.', 55),

  ('Jetour', 'Dashing', 2023, 2025, 'Deluxe 1.6T', 'SUV', 1600, 'Petrol',
   'Automatic', 'LHD', 'China', 'Shanghai Port', 15200, 2600, 40,
   ARRAY['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80'],
   ARRAY['Chery Kunpeng 197hp Engine', 'Hidden Door Handles', 'Sony Headrest Speakers', 'Smart Voice Control'],
   'Futuristic styling by Porsche ex-designer. Powered by Chery proven Kunpeng powertrain with 197 horsepower.', 58),

  ('Chery', 'Tiggo 8 Pro', 2021, 2025, 'Max 7-Seat AWD', 'SUV', 2000, 'Petrol',
   'Automatic', 'LHD', 'China', 'Shanghai Port', 16800, 2800, 40,
   ARRAY['https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80'],
   ARRAY['Aviation Class Headrests', 'Dual 12.3-inch Curved Screens', 'AWD Terrain System', '10 Airbags'],
   'Affordable 7-seater luxury SUV with high ground clearance, powerful 2.0T engine, and solid all-road capability.', 60),

  ('Changan', 'UNI-K', 2021, 2025, 'Flagship AWD', 'SUV', 2000, 'Petrol',
   'Automatic', 'LHD', 'China', 'Shanghai Port', 19800, 2900, 40,
   ARRAY['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80'],
   ARRAY['Vision Concept Exterior', 'Aisin 8-Speed Automatic', 'Zero Gravity Sofa Seats', 'Quad Titanium Style Exhausts'],
   'Avant-garde design with true luxury rear legroom and silky-smooth Aisin 8-speed transmission.', 62),

  -- ─── Dubai / United Arab Emirates (Toyota, Lexus, Nissan) ───────────────────
  ('Toyota', 'Land Cruiser', 2022, 2025, 'LC300 VXR / GR-Sport', 'SUV', 3500, 'Petrol',
   'Automatic', 'LHD', 'United Arab Emirates', 'Jebel Ali Port', 78000, 3500, 30,
   ARRAY['https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80'],
   ARRAY['Twin-Turbo V6 (409hp)', 'E-KDSS Suspension System', 'Multi-Terrain Monitor 3D', 'Cool Box & Rear Entertainment'],
   'The undisputed King of 4WD. GCC Gulf specification Land Cruiser 300, tropicalized cooling system, pristine Dubai stock.', 70),

  ('Toyota', 'Land Cruiser Prado', 2021, 2025, 'TX-L 7-Seat / 250 First Edition', 'SUV', 2800, 'Diesel',
   'Automatic', 'LHD', 'United Arab Emirates', 'Jebel Ali Port', 44500, 3200, 30,
   ARRAY['https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80'],
   ARRAY['Legendary 1GD-FTV 2.8L Turbodiesel', 'Dual Fuel Tanks (150L Capacity)', 'Kinetic Dynamic Suspension', 'Full 7-Seat Leather'],
   'Rwanda gold standard in reliability, durability, and unmatched resale value. GCC Gulf spec with high cooling capacity.', 72),

  ('Toyota', 'Hilux', 2021, 2025, 'Double Cab Adventure 4x4', 'Truck', 2800, 'Diesel',
   'Automatic', 'LHD', 'United Arab Emirates', 'Jebel Ali Port', 32000, 3200, 30,
   ARRAY['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80'],
   ARRAY['Heavy Duty 4x4 with Rear Diff Lock', 'Adventure Styling Package', 'JBL Premium Audio', 'Tonneau Bed Cover'],
   'Indestructible workhorse and off-road companion. The preferred double cab pickup for Rwanda varied geography.', 75),

  ('Toyota', 'RAV4', 2021, 2025, 'Adventure AWD', 'SUV', 2500, 'Hybrid',
   'Automatic', 'LHD', 'United Arab Emirates', 'Jebel Ali Port', 23000, 2800, 30,
   ARRAY['https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80'],
   ARRAY['Electronic AWD (AWD-i)', 'Dynamic Torque Vectoring', 'Panoramic Glass Roof', 'Exceptional 5.2L/100km Consumption'],
   'World favourite compact SUV. Highly reliable hybrid powertrain with zero range anxiety and low maintenance costs.', 78),

  ('Lexus', 'LX 600', 2022, 2025, 'VIP 4-Seat / F-Sport', 'SUV', 3500, 'Petrol',
   'Automatic', 'LHD', 'United Arab Emirates', 'Jebel Ali Port', 118000, 3800, 30,
   ARRAY['https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80'],
   ARRAY['Ultra-Luxury Executive Seating', 'Active Height Control (AHC)', 'Mark Levinson 25-Speaker Audio', 'Fingerprint Ignition'],
   'The absolute pinnacle of luxury off-road engineering. Handcrafted Japanese interior luxury paired with bulletproof reliability.', 80),

  ('Lexus', 'RX 350', 2021, 2025, 'F-Sport AWD', 'SUV', 2400, 'Petrol',
   'Automatic', 'LHD', 'United Arab Emirates', 'Jebel Ali Port', 39500, 3000, 30,
   ARRAY['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80'],
   ARRAY['Lexus Safety System+ 3.0', 'Semi-Aniline Leather Seats', 'Wireless Apple CarPlay', 'Adaptive Variable Suspension'],
   'Prestigious crossover SUV featuring unmatched craftsmanship, whisper-quiet cabin, and smooth power delivery.', 82),

  ('Nissan', 'Patrol', 2020, 2025, 'Platinum V8 (Y62)', 'SUV', 5600, 'Petrol',
   'Automatic', 'LHD', 'United Arab Emirates', 'Jebel Ali Port', 48000, 3400, 30,
   ARRAY['https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80'],
   ARRAY['400hp V8 Engine', 'Hydraulic Body Motion Control', 'Diamond Quilted Leather', 'Rear Entertainment Screens'],
   'The Hero of All Terrain. Massive cabin room, colossal V8 muscle, and luxury highway cruising.', 85),

  -- ─── Japan (Toyota, Subaru) ────────────────────────────────────────────────
  ('Toyota', 'Harrier', 2020, 2024, 'G / Z Leather Package', 'SUV', 2000, 'Petrol',
   'Automatic', 'LHD', 'Japan', 'Kobe Port', 18500, 2700, 45,
   ARRAY['https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80'],
   ARRAY['Coupe-SUV Profile', 'Dimmable Electrochromic Sunroof', 'Digital Inner Mirror with Recorder', 'Synthetic Leather Trim'],
   'Sleek executive crossover blending coupe elegance with SUV versatility. Low mileage Japan export with complete inspection.', 90),

  ('Subaru', 'Forester', 2019, 2024, 'Advance e-Boxer AWD', 'SUV', 2000, 'Hybrid',
   'Automatic', 'LHD', 'Japan', 'Yokohama Port', 13500, 2700, 45,
   ARRAY['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80'],
   ARRAY['Symmetrical All-Wheel Drive', 'EyeSight Driver Assist', 'X-MODE with Hill Descent', '220mm Ground Clearance'],
   'Renowned capability in rain, mud, and steep gravel inclines. Unbeatable traction and active safety on Rwandan roads.', 92);
