-- ─────────────────────────────────────────────────────────────────────────────
-- 0043_global_vin_intelligence.sql
-- Canonical Vehicle Entity, History Events, Anomaly Detection & Audit Logging.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Canonical Vehicle Entity
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vin_raw TEXT NOT NULL,                                       -- Full raw VIN (Internal only)
  vin_normalized TEXT NOT NULL,                                -- Uppercase alphanumeric without punctuation
  vin_masked TEXT NOT NULL,                                   -- Safe public string: e.g. "JTDBZ293***1234" or "VIN Verified"
  vin_type VARCHAR(20) NOT NULL DEFAULT 'iso',                -- 'iso', 'chassis', 'non_standard'
  wmi VARCHAR(3),                                             -- World Manufacturer Identifier (1-3)
  vds VARCHAR(6),                                             -- Vehicle Descriptor Section (4-9)
  vis VARCHAR(8),                                             -- Vehicle Identifier Section (10-17)
  check_digit VARCHAR(1),                                     -- Modulo 11 check digit
  check_digit_valid BOOLEAN,                                  -- Mathematical validation result
  
  -- Factory / Manufacturer Specifications (Normalized)
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year SMALLINT NOT NULL,
  trim VARCHAR(100),
  body_type VARCHAR(50),                                      -- SUV, Sedan, Hatchback, Pickup, Coupe, Van, etc.
  engine_displacement_cc INT,
  engine_cylinders SMALLINT,
  engine_description VARCHAR(100),
  fuel_type VARCHAR(30),                                      -- Petrol, Diesel, Hybrid, EV, Plug-in Hybrid
  transmission VARCHAR(50),                                   -- Automatic, Manual, CVT, Dual-Clutch
  drivetrain VARCHAR(20),                                     -- AWD, 4WD, FWD, RWD
  plant_country VARCHAR(100),
  plant_city VARCHAR(100),
  
  -- Verification & Quality
  verification_status VARCHAR(30) NOT NULL DEFAULT 'unverified', -- 'unverified', 'partially_verified', 'fully_verified'
  confidence_score NUMERIC(4,3) NOT NULL DEFAULT 1.000,
  data_quality_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index on normalized VIN
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_vin_normalized ON vehicles(vin_normalized);
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model_year ON vehicles(make, model, year);

-- 2. Link Listing Entity (`cars`) to canonical `vehicles`
ALTER TABLE cars ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_cars_vehicle_id ON cars(vehicle_id);

-- 3. Provenance-Tracked Vehicle History Events
CREATE TABLE IF NOT EXISTS vehicle_history_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,                             -- 'manufacturing', 'registration', 'inspection', 'odometer', 'service', 'accident', 'recall', 'auction_listing', 'import_export', 'title_salvage'
  event_date DATE NOT NULL,
  event_timestamp TIMESTAMPTZ,
  
  -- Metrics
  odometer_km INT,
  odometer_miles INT,
  odometer_verified BOOLEAN DEFAULT FALSE,
  
  -- Source & Provenance
  provider_id VARCHAR(50) NOT NULL,                           -- 'local_iso_decoder', 'nhtsa_vpic', 'sawa_inspection', 'rra_customs', 'commercial_partner'
  source_type VARCHAR(50) NOT NULL,                           -- 'government_open', 'inspection_station', 'manufacturer_db', 'commercial_feed'
  source_reference VARCHAR(150),
  confidence_score NUMERIC(4,3) NOT NULL DEFAULT 1.000,
  
  -- Content & Transparency
  title VARCHAR(200) NOT NULL,
  public_summary TEXT NOT NULL,
  internal_details JSONB,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  has_anomaly BOOLEAN NOT NULL DEFAULT FALSE,
  anomaly_description VARCHAR(255),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vhe_vehicle_date ON vehicle_history_events(vehicle_id, event_date ASC);
CREATE INDEX IF NOT EXISTS idx_vhe_event_type ON vehicle_history_events(event_type);

-- 4. Vehicle Data Quality & Anomaly Signals
CREATE TABLE IF NOT EXISTS vehicle_data_quality_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  signal_type VARCHAR(60) NOT NULL,                           -- 'potential_odometer_rollback', 'chronological_discrepancy', 'conflicting_specs', 'suspicious_duplicate'
  severity VARCHAR(20) NOT NULL,                              -- 'info', 'warning', 'critical'
  title VARCHAR(150) NOT NULL,
  public_message TEXT NOT NULL,                               -- Defensible, objective phrasing
  internal_evidence JSONB NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vdqs_vehicle ON vehicle_data_quality_signals(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vdqs_resolved ON vehicle_data_quality_signals(resolved);

-- 5. Strict Audit Log for Internal VIN Operations
CREATE TABLE IF NOT EXISTS vin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,                                -- 'vin.search', 'vin.decode', 'vehicle.create', 'listing.populate_from_vin', 'vehicle.override_spec', 'verification.update'
  target_vehicle_id UUID REFERENCES vehicles(id),
  vin_searched_masked VARCHAR(25),
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_val_user ON vin_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_val_created ON vin_audit_logs(created_at DESC);
