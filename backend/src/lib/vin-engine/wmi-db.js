// ─────────────────────────────────────────────────────────────────────────────
// vin-engine/wmi-db.js
// Global World Manufacturer Identifier (WMI) registry.
// ─────────────────────────────────────────────────────────────────────────────

const REGIONS = {
  A: { name: 'Africa', countries: { AA: 'South Africa', GA: 'Kenya', DA: 'Egypt' } },
  B: { name: 'Africa', countries: {} },
  C: { name: 'Africa', countries: {} },
  J: { name: 'Asia', country: 'Japan' },
  K: { name: 'Asia', country: 'South Korea' },
  L: { name: 'Asia', country: 'China' },
  M: { name: 'Asia', countries: { MA: 'India', ME: 'India', ML: 'Thailand', MR: 'Thailand', MF: 'Indonesia' } },
  N: { name: 'Asia', country: 'Iran' },
  P: { name: 'Asia', countries: { PL: 'Malaysia', PA: 'Philippines' } },
  R: { name: 'Asia', countries: { RF: 'Taiwan', RL: 'Vietnam' } },
  S: { name: 'Europe', countries: { SA: 'United Kingdom', SM: 'United Kingdom', SN: 'Germany', ST: 'Germany' } },
  T: { name: 'Europe', countries: { TJ: 'Czech Republic', TR: 'Hungary' } },
  U: { name: 'Europe', countries: { UU: 'Romania' } },
  V: { name: 'Europe', countries: { VF: 'France', VR: 'France', VS: 'Spain', VW: 'Spain', VA: 'Austria' } },
  W: { name: 'Europe', country: 'Germany' },
  X: { name: 'Europe', countries: { X4: 'Russia', XL: 'Netherlands' } },
  Y: { name: 'Europe', countries: { YS: 'Sweden', YV: 'Sweden', YA: 'Belgium' } },
  Z: { name: 'Europe', countries: { ZA: 'Italy', ZR: 'Italy' } },
  1: { name: 'North America', country: 'United States' },
  2: { name: 'North America', country: 'Canada' },
  3: { name: 'North America', country: 'Mexico' },
  4: { name: 'North America', country: 'United States' },
  5: { name: 'North America', country: 'United States' },
  6: { name: 'Oceania', country: 'Australia' },
  7: { name: 'Oceania', country: 'New Zealand' },
  8: { name: 'South America', countries: { '8A': 'Argentina' } },
  9: { name: 'South America', countries: { '93': 'Brazil', '9B': 'Brazil' } },
};

const SPECIFIC_WMIS = {
  // Japan
  JTD: { make: 'Toyota', country: 'Japan', region: 'Asia', type: 'Passenger Car' },
  JTE: { make: 'Toyota', country: 'Japan', region: 'Asia', type: 'SUV / Truck' },
  JTM: { make: 'Toyota', country: 'Japan', region: 'Asia', type: 'SUV / Van' },
  JTN: { make: 'Toyota', country: 'Japan', region: 'Asia', type: 'Passenger Car' },
  JT1: { make: 'Toyota', country: 'Japan', region: 'Asia', type: 'Commercial' },
  JH4: { make: 'Acura', country: 'Japan', region: 'Asia', type: 'Passenger Car' },
  JHM: { make: 'Honda', country: 'Japan', region: 'Asia', type: 'Passenger Car' },
  JHL: { make: 'Honda', country: 'Japan', region: 'Asia', type: 'SUV' },
  JN1: { make: 'Nissan', country: 'Japan', region: 'Asia', type: 'Passenger Car' },
  JN6: { make: 'Nissan', country: 'Japan', region: 'Asia', type: 'Truck' },
  JN8: { make: 'Nissan', country: 'Japan', region: 'Asia', type: 'SUV' },
  JM1: { make: 'Mazda', country: 'Japan', region: 'Asia', type: 'Passenger Car' },
  JM3: { make: 'Mazda', country: 'Japan', region: 'Asia', type: 'SUV' },
  JA3: { make: 'Mitsubishi', country: 'Japan', region: 'Asia', type: 'Passenger Car' },
  JA4: { make: 'Mitsubishi', country: 'Japan', region: 'Asia', type: 'SUV' },
  JF1: { make: 'Subaru', country: 'Japan', region: 'Asia', type: 'Passenger Car' },
  JF2: { make: 'Subaru', country: 'Japan', region: 'Asia', type: 'SUV' },
  JS1: { make: 'Suzuki', country: 'Japan', region: 'Asia', type: 'Motorcycle' },
  JS2: { make: 'Suzuki', country: 'Japan', region: 'Asia', type: 'Passenger Car' },
  JS3: { make: 'Suzuki', country: 'Japan', region: 'Asia', type: 'SUV' },
  JDA: { make: 'Daihatsu', country: 'Japan', region: 'Asia', type: 'Passenger Car' },
  JAA: { make: 'Isuzu', country: 'Japan', region: 'Asia', type: 'Commercial' },

  // Germany
  WBA: { make: 'BMW', country: 'Germany', region: 'Europe', type: 'Passenger Car' },
  WBS: { make: 'BMW M', country: 'Germany', region: 'Europe', type: 'High Performance' },
  WBY: { make: 'BMW i', country: 'Germany', region: 'Europe', type: 'Electric Vehicle' },
  WDB: { make: 'Mercedes-Benz', country: 'Germany', region: 'Europe', type: 'Passenger Car' },
  WDD: { make: 'Mercedes-Benz', country: 'Germany', region: 'Europe', type: 'Passenger Car' },
  WDC: { make: 'Mercedes-Benz', country: 'Germany', region: 'Europe', type: 'SUV' },
  WMX: { make: 'Mercedes-AMG', country: 'Germany', region: 'Europe', type: 'High Performance' },
  WAU: { make: 'Audi', country: 'Germany', region: 'Europe', type: 'Passenger Car' },
  WA1: { make: 'Audi', country: 'Germany', region: 'Europe', type: 'SUV' },
  WVW: { make: 'Volkswagen', country: 'Germany', region: 'Europe', type: 'Passenger Car' },
  WVG: { make: 'Volkswagen', country: 'Germany', region: 'Europe', type: 'SUV' },
  WV1: { make: 'Volkswagen Commercial', country: 'Germany', region: 'Europe', type: 'Commercial' },
  WP0: { make: 'Porsche', country: 'Germany', region: 'Europe', type: 'Sports Car' },
  WP1: { make: 'Porsche', country: 'Germany', region: 'Europe', type: 'SUV' },

  // South Korea
  KMH: { make: 'Hyundai', country: 'South Korea', region: 'Asia', type: 'Passenger Car' },
  KM8: { make: 'Hyundai', country: 'South Korea', region: 'Asia', type: 'SUV' },
  KNA: { make: 'Kia', country: 'South Korea', region: 'Asia', type: 'Passenger Car' },
  KND: { make: 'Kia', country: 'South Korea', region: 'Asia', type: 'SUV' },
  KPT: { make: 'SsangYong', country: 'South Korea', region: 'Asia', type: 'SUV' },

  // United Kingdom
  SAL: { make: 'Land Rover', country: 'United Kingdom', region: 'Europe', type: 'SUV' },
  SAJ: { make: 'Jaguar', country: 'United Kingdom', region: 'Europe', type: 'Passenger Car' },
  SAR: { make: 'Rover', country: 'United Kingdom', region: 'Europe', type: 'Passenger Car' },
  SHS: { make: 'Honda UK', country: 'United Kingdom', region: 'Europe', type: 'Passenger Car' },
  SCA: { make: 'Rolls-Royce', country: 'United Kingdom', region: 'Europe', type: 'Luxury' },

  // United States
  '1FA': { make: 'Ford', country: 'United States', region: 'North America', type: 'Passenger Car' },
  '1FM': { make: 'Ford', country: 'United States', region: 'North America', type: 'SUV' },
  '1FT': { make: 'Ford', country: 'United States', region: 'North America', type: 'Truck' },
  '1G1': { make: 'Chevrolet', country: 'United States', region: 'North America', type: 'Passenger Car' },
  '1GC': { make: 'Chevrolet', country: 'United States', region: 'North America', type: 'Truck' },
  '1GN': { make: 'Chevrolet', country: 'United States', region: 'North America', type: 'SUV' },
  '1HG': { make: 'Honda', country: 'United States', region: 'North America', type: 'Passenger Car' },
  '1C4': { make: 'Chrysler / Jeep', country: 'United States', region: 'North America', type: 'SUV' },
  '1J4': { make: 'Jeep', country: 'United States', region: 'North America', type: 'SUV' },
  '4T1': { make: 'Toyota', country: 'United States', region: 'North America', type: 'Passenger Car' },
  '5TB': { make: 'Toyota', country: 'United States', region: 'North America', type: 'Truck' },
  '5YJ': { make: 'Tesla', country: 'United States', region: 'North America', type: 'Electric Vehicle' },
  '7SA': { make: 'Tesla', country: 'United States', region: 'North America', type: 'Electric Vehicle' },

  // Sweden
  YV1: { make: 'Volvo', country: 'Sweden', region: 'Europe', type: 'Passenger Car' },
  YV4: { make: 'Volvo', country: 'Sweden', region: 'Europe', type: 'SUV' },

  // France
  VF1: { make: 'Renault', country: 'France', region: 'Europe', type: 'Passenger Car' },
  VF3: { make: 'Peugeot', country: 'France', region: 'Europe', type: 'Passenger Car' },
  VF7: { make: 'Citroën', country: 'France', region: 'Europe', type: 'Passenger Car' },

  // China
  LGX: { make: 'BYD', country: 'China', region: 'Asia', type: 'Electric Vehicle / Hybrid' },
  LB3: { make: 'Geely', country: 'China', region: 'Asia', type: 'Passenger Car' },
  LTV: { make: 'Dongfeng', country: 'China', region: 'Asia', type: 'Passenger Car' },
  LJD: { make: 'Chery', country: 'China', region: 'Asia', type: 'Passenger Car' },
  LHG: { make: 'GAC', country: 'China', region: 'Asia', type: 'Passenger Car' },
};

/**
 * Resolves WMI (Digits 1-3) into Manufacturer, Country, Region, and Vehicle Type.
 */
function resolveWmi(wmiCode) {
  if (!wmiCode || wmiCode.length < 3) return null;
  const upper = wmiCode.toUpperCase();

  if (SPECIFIC_WMIS[upper]) {
    return { ...SPECIFIC_WMIS[upper], wmi: upper };
  }

  // Fallback to region and country code heuristics
  const firstChar = upper[0];
  const firstTwo = upper.slice(0, 2);
  const reg = REGIONS[firstChar];

  let regionName = reg ? reg.name : 'Unknown';
  let countryName = 'Unknown';

  if (reg) {
    if (reg.country) {
      countryName = reg.country;
    } else if (reg.countries && reg.countries[firstTwo]) {
      countryName = reg.countries[firstTwo];
    }
  }

  return {
    wmi: upper,
    make: 'Unknown',
    country: countryName,
    region: regionName,
    type: 'Passenger Vehicle',
  };
}

module.exports = {
  resolveWmi,
  SPECIFIC_WMIS,
  REGIONS,
};
