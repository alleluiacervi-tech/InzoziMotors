// ─────────────────────────────────────────────────────────────────────────────
// vin-engine/jdm-chassis.js
// Japanese Domestic Market (JDM) chassis prefix dictionary and decoder.
// ─────────────────────────────────────────────────────────────────────────────

const JDM_CATALOG = {
  // ── Toyota Corolla / Fielder / Axio ───────────────────────────────────────
  NZE121: { make: 'Toyota', model: 'Corolla / Fielder', engineCc: 1500, fuel: 'Petrol', body: 'Sedan / Wagon', drivetrain: 'FWD', transmission: 'Automatic' },
  NZE141: { make: 'Toyota', model: 'Corolla Axio / Fielder', engineCc: 1500, fuel: 'Petrol', body: 'Sedan / Wagon', drivetrain: 'FWD', transmission: 'CVT' },
  NZE144: { make: 'Toyota', model: 'Corolla Axio / Fielder', engineCc: 1500, fuel: 'Petrol', body: 'Sedan / Wagon', drivetrain: '4WD', transmission: 'CVT' },
  NZE161: { make: 'Toyota', model: 'Corolla Axio / Fielder', engineCc: 1500, fuel: 'Petrol', body: 'Sedan / Wagon', drivetrain: 'FWD', transmission: 'CVT' },
  NKE165: { make: 'Toyota', model: 'Corolla Axio / Fielder Hybrid', engineCc: 1500, fuel: 'Hybrid', body: 'Sedan / Wagon', drivetrain: 'FWD', transmission: 'e-CVT' },
  ZRE142: { make: 'Toyota', model: 'Corolla Axio / Fielder', engineCc: 1800, fuel: 'Petrol', body: 'Sedan / Wagon', drivetrain: 'FWD', transmission: 'CVT' },

  // ── Toyota RAV4 ──────────────────────────────────────────────────────────
  ACA21: { make: 'Toyota', model: 'RAV4', engineCc: 2000, fuel: 'Petrol', body: 'SUV', drivetrain: '4WD', transmission: 'Automatic' },
  ACA31: { make: 'Toyota', model: 'RAV4', engineCc: 2400, fuel: 'Petrol', body: 'SUV', drivetrain: '4WD', transmission: 'CVT' },
  ACA36: { make: 'Toyota', model: 'RAV4', engineCc: 2400, fuel: 'Petrol', body: 'SUV', drivetrain: 'FWD', transmission: 'CVT' },
  MXAA54: { make: 'Toyota', model: 'RAV4', engineCc: 2000, fuel: 'Petrol', body: 'SUV', drivetrain: 'AWD', transmission: 'CVT' },
  AXAH54: { make: 'Toyota', model: 'RAV4 Hybrid', engineCc: 2500, fuel: 'Hybrid', body: 'SUV', drivetrain: 'e-Four AWD', transmission: 'e-CVT' },

  // ── Toyota Harrier ───────────────────────────────────────────────────────
  ACU30: { make: 'Toyota', model: 'Harrier', engineCc: 2400, fuel: 'Petrol', body: 'SUV', drivetrain: 'FWD', transmission: 'Automatic' },
  ACU35: { make: 'Toyota', model: 'Harrier', engineCc: 2400, fuel: 'Petrol', body: 'SUV', drivetrain: '4WD', transmission: 'Automatic' },
  MCU30: { make: 'Toyota', model: 'Harrier', engineCc: 3000, fuel: 'Petrol', body: 'SUV', drivetrain: 'FWD', transmission: 'Automatic' },
  ZSU60: { make: 'Toyota', model: 'Harrier', engineCc: 2000, fuel: 'Petrol', body: 'SUV', drivetrain: 'FWD', transmission: 'CVT' },
  ZSU65: { make: 'Toyota', model: 'Harrier', engineCc: 2000, fuel: 'Petrol', body: 'SUV', drivetrain: '4WD', transmission: 'CVT' },
  AVU65: { make: 'Toyota', model: 'Harrier Hybrid', engineCc: 2500, fuel: 'Hybrid', body: 'SUV', drivetrain: 'e-Four AWD', transmission: 'e-CVT' },

  // ── Toyota Land Cruiser & Prado ──────────────────────────────────────────
  KZJ95: { make: 'Toyota', model: 'Land Cruiser Prado', engineCc: 3000, fuel: 'Diesel', body: 'SUV', drivetrain: '4WD', transmission: 'Automatic' },
  KDJ120: { make: 'Toyota', model: 'Land Cruiser Prado', engineCc: 3000, fuel: 'Diesel', body: 'SUV', drivetrain: '4WD', transmission: 'Automatic' },
  TRJ120: { make: 'Toyota', model: 'Land Cruiser Prado', engineCc: 2700, fuel: 'Petrol', body: 'SUV', drivetrain: '4WD', transmission: 'Automatic' },
  GRJ120: { make: 'Toyota', model: 'Land Cruiser Prado', engineCc: 4000, fuel: 'Petrol', body: 'SUV', drivetrain: '4WD', transmission: 'Automatic' },
  TRJ150: { make: 'Toyota', model: 'Land Cruiser Prado', engineCc: 2700, fuel: 'Petrol', body: 'SUV', drivetrain: '4WD', transmission: 'Automatic' },
  GDJ150: { make: 'Toyota', model: 'Land Cruiser Prado', engineCc: 2800, fuel: 'Diesel', body: 'SUV', drivetrain: '4WD', transmission: 'Automatic' },
  HDJ100: { make: 'Toyota', model: 'Land Cruiser 100', engineCc: 4200, fuel: 'Diesel', body: 'SUV', drivetrain: '4WD', transmission: 'Automatic' },
  URJ200: { make: 'Toyota', model: 'Land Cruiser 200', engineCc: 4600, fuel: 'Petrol', body: 'SUV', drivetrain: '4WD', transmission: 'Automatic' },
  VDJ200: { make: 'Toyota', model: 'Land Cruiser 200', engineCc: 4500, fuel: 'Diesel', body: 'SUV', drivetrain: '4WD', transmission: 'Automatic' },

  // ── Toyota Prius ─────────────────────────────────────────────────────────
  ZVW30: { make: 'Toyota', model: 'Prius', engineCc: 1800, fuel: 'Hybrid', body: 'Hatchback', drivetrain: 'FWD', transmission: 'e-CVT' },
  ZVW50: { make: 'Toyota', model: 'Prius', engineCc: 1800, fuel: 'Hybrid', body: 'Hatchback', drivetrain: 'FWD', transmission: 'e-CVT' },

  // ── Toyota Commercial / Vans ─────────────────────────────────────────────
  KDH200: { make: 'Toyota', model: 'HiAce', engineCc: 2500, fuel: 'Diesel', body: 'Van', drivetrain: 'RWD', transmission: 'Automatic' },
  KDH201: { make: 'Toyota', model: 'HiAce', engineCc: 3000, fuel: 'Diesel', body: 'Van', drivetrain: 'RWD', transmission: 'Automatic' },
  TRH200: { make: 'Toyota', model: 'HiAce', engineCc: 2000, fuel: 'Petrol', body: 'Van', drivetrain: 'RWD', transmission: 'Automatic' },

  // ── Subaru ───────────────────────────────────────────────────────────────
  SH5: { make: 'Subaru', model: 'Forester', engineCc: 2000, fuel: 'Petrol', body: 'SUV', drivetrain: 'AWD', transmission: 'Automatic' },
  SJ5: { make: 'Subaru', model: 'Forester', engineCc: 2000, fuel: 'Petrol', body: 'SUV', drivetrain: 'AWD', transmission: 'CVT' },
  SJG: { make: 'Subaru', model: 'Forester XT', engineCc: 2000, fuel: 'Petrol', body: 'SUV', drivetrain: 'AWD', transmission: 'CVT' },
  SK9: { make: 'Subaru', model: 'Forester', engineCc: 2500, fuel: 'Petrol', body: 'SUV', drivetrain: 'AWD', transmission: 'CVT' },
  GP7: { make: 'Subaru', model: 'XV / Crosstrek', engineCc: 2000, fuel: 'Petrol', body: 'Crossover', drivetrain: 'AWD', transmission: 'CVT' },
  GT7: { make: 'Subaru', model: 'XV / Crosstrek', engineCc: 2000, fuel: 'Petrol', body: 'Crossover', drivetrain: 'AWD', transmission: 'CVT' },

  // ── Nissan ───────────────────────────────────────────────────────────────
  NT31: { make: 'Nissan', model: 'X-Trail', engineCc: 2000, fuel: 'Petrol', body: 'SUV', drivetrain: '4WD', transmission: 'CVT' },
  T31: { make: 'Nissan', model: 'X-Trail', engineCc: 2000, fuel: 'Petrol', body: 'SUV', drivetrain: 'FWD', transmission: 'CVT' },
  NT32: { make: 'Nissan', model: 'X-Trail', engineCc: 2000, fuel: 'Petrol', body: 'SUV', drivetrain: '4WD', transmission: 'CVT' },
  HNT32: { make: 'Nissan', model: 'X-Trail Hybrid', engineCc: 2000, fuel: 'Hybrid', body: 'SUV', drivetrain: '4WD', transmission: 'CVT' },
};

/**
 * Decodes a Japanese chassis number string into specifications.
 */
function decodeJdmChassis(rawChassis) {
  if (!rawChassis) return null;
  const cleaned = String(rawChassis).trim().toUpperCase();

  // Find longest matching prefix
  for (const [prefix, specs] of Object.entries(JDM_CATALOG)) {
    if (cleaned.startsWith(prefix)) {
      return {
        isJdm: true,
        chassisPrefix: prefix,
        plantCountry: 'Japan',
        ...specs,
      };
    }
  }

  // Fallback: heuristic prefix extraction (first letters + numbers before separator)
  const match = cleaned.match(/^([A-Z]{1,4}[0-9]{1,4})[- ]?/);
  if (match) {
    return {
      isJdm: true,
      chassisPrefix: match[1],
      plantCountry: 'Japan',
      make: 'Japanese Import',
      model: match[1],
    };
  }

  return null;
}

module.exports = {
  decodeJdmChassis,
  JDM_CATALOG,
};
