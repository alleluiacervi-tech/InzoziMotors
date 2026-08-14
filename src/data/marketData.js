// The USD⇄RWF rate. LIVE: refreshed from GET /fx on app boot (AppContext) and
// cached in storage for offline starts. `let` on purpose — Metro's CJS interop
// reads the binding at each use, so screens that show {RWF_RATE} pick up the
// refreshed value. The initial figure matches the backend's floor; it renders
// only before the first refresh on a first-ever launch.
//
// It was `const 1300` while the real rate drifted to ~1473 — every converted
// figure in the app was ~12% wrong, silently, which is why this stopped being
// a constant.
export let RWF_RATE = 1470;

/** Called from AppContext with the /fx response. Ignores nonsense so a broken
 *  payload can never zero out every price in the app. */
export function setRwfRate(rate) {
  if (Number.isFinite(rate) && rate > 100 && rate < 10000) RWF_RATE = rate;
}

// Kigali neighborhood assignments per car ID
const NEIGHBORHOOD_MAP = {
  '1': 'Nyarutarama', '2': 'Nyarutarama', '3': 'Nyarutarama', '4': 'Nyarutarama',
  '5': 'Remera',      '6': 'Remera',      '7': 'Remera',      '8': 'Remera',      '9': 'Remera',
  '10': 'Kicukiro',   '11': 'Kicukiro',   '12': 'Kicukiro',   '13': 'Kicukiro',   '14': 'Kicukiro',
  '15': 'Kimihurura', '16': 'Kimihurura', '17': 'Kimihurura', '18': 'Kimihurura',
  '19': 'Gisozi',     '20': 'Gisozi',     '21': 'Gisozi',     '22': 'Gisozi',     '23': 'Gisozi',
  '24': 'Kacyiru',    '25': 'Kacyiru',
};

export const KIGALI_NEIGHBORHOODS = [
  { id: 'nyarutarama', name: 'Nyarutarama', area: 'Gasabo', description: 'Embassy quarter · upscale' },
  { id: 'remera',      name: 'Remera',      area: 'Gasabo', description: 'Commercial hub · busy' },
  { id: 'kicukiro',    name: 'Kicukiro',    area: 'Kicukiro', description: 'Mixed residential' },
  { id: 'kimihurura',  name: 'Kimihurura',  area: 'Kicukiro', description: 'Diplomatic quarter' },
  { id: 'gisozi',      name: 'Gisozi',      area: 'Gasabo', description: 'New residential zone' },
  { id: 'kacyiru',     name: 'Kacyiru',     area: 'Gasabo', description: 'Government district' },
];

// How many days since listing went live
const LISTED_DAYS_AGO = {
  '1': 12, '2': 3, '3': 8, '4': 25, '5': 1, '6': 47, '7': 15, '8': 5,
  '9': 20, '10': 32, '11': 7, '12': 2, '13': 45, '14': 11, '15': 18,
  '16': 28, '17': 4, '18': 35, '19': 9, '20': 14, '21': 22, '22': 6,
  '23': 50, '24': 17, '25': 31,
};

// How many buyers have saved this car
const SAVED_COUNTS = {
  '1': 47, '2': 23, '3': 31, '4': 8,  '5': 56, '6': 14, '7': 82, '8': 29,
  '9': 41, '10': 7, '11': 12, '12': 19, '13': 5, '14': 33, '15': 28,
  '16': 11, '17': 63, '18': 9, '19': 18, '20': 44, '21': 15, '22': 37,
  '23': 6,  '24': 22, '25': 8,
};

// Price drops (how much was knocked off the original listing price)
const PRICE_DROPS = {
  '1': 800, '3': 500, '8': 400, '12': 1200, '17': 650, '22': 900,
};

// Drive type (LHD = locally purchased / new imports; RHD = Japanese imports)
const DRIVE_TYPES = {
  '1': 'LHD', '2': 'LHD', '3': 'LHD', '4': 'LHD', '5': 'LHD',
  '6': 'LHD', '7': 'LHD', '8': 'RHD', '9': 'RHD', '10': 'RHD',
  '11': 'LHD', '12': 'LHD', '13': 'RHD', '14': 'LHD', '15': 'RHD',
  '16': 'LHD', '17': 'LHD', '18': 'RHD', '19': 'LHD', '20': 'RHD',
  '21': 'LHD', '22': 'RHD', '23': 'LHD', '24': 'RHD', '25': 'LHD',
};

// ─── Real data first, demo table second ──────────────────────────────────────
// Every accessor below takes either a car object or a bare id. When the object
// carries a server-computed value it wins; the hardcoded tables above only ever
// serve the 25 bundled demo cars (ids '1'–'25'), which is why a real listing
// used to show "0 saves · listed 14 days ago" no matter what the database said.

const idOf = (carOrId) => (typeof carOrId === 'object' && carOrId ? carOrId.id : carOrId);
const objOf = (carOrId) => (typeof carOrId === 'object' && carOrId ? carOrId : null);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export function getNeighborhood(carOrId) {
  const car = objOf(carOrId);
  if (car?.location) return car.location;
  return NEIGHBORHOOD_MAP[idOf(carOrId)] || 'Kigali';
}

export function getListedDaysAgo(carOrId) {
  const car = objOf(carOrId);
  if (isNum(car?.listedDays)) return car.listedDays;
  return LISTED_DAYS_AGO[idOf(carOrId)] ?? 14;
}

export function getSavedCount(carOrId) {
  const car = objOf(carOrId);
  if (isNum(car?.saves)) return car.saves;
  return SAVED_COUNTS[idOf(carOrId)] || 0;
}

// A real drop is the difference between the opening price and today's price.
export function getPriceDrop(carOrId) {
  const car = objOf(carOrId);
  const history = car?.priceHistory;
  if (Array.isArray(history) && history.length > 1) {
    const drop = history[0] - history[history.length - 1];
    return drop > 0 ? drop : 0;
  }
  return PRICE_DROPS[idOf(carOrId)] || 0;
}

export function getDriveType(carOrId) {
  const car = objOf(carOrId);
  if (car?.drive_side) return car.drive_side;
  return DRIVE_TYPES[idOf(carOrId)] || 'LHD';
}

// Market average — server-computed from real comparables when available.
export function getMarketAvg(car) {
  if (isNum(car?.marketAvg)) return car.marketAvg;
  if (car.belowMarket) return car.price + car.belowMarket;
  if (car.type === 'auction') return Math.round((car.currentBid || car.price) * 1.06);
  return Math.round(car.price * 1.08);
}

// % diff from market: negative = below, positive = above
export function getMarketDiff(car) {
  if (isNum(car?.marketDiff)) return car.marketDiff;
  const avg = getMarketAvg(car);
  const price = car.type === 'auction' ? (car.currentBid || car.price) : car.price;
  if (!avg) return 0;
  return Math.round(((price - avg) / avg) * 100);
}

// True only when the number came from real comparables — screens use this to
// decide whether to show a market claim at all rather than assert a guess.
export function hasRealMarketData(car) {
  return isNum(car?.marketAvg) && (car?.comparables || 0) >= 3;
}

// Price points for the sparkline (oldest → newest). Real history when the
// listing has any; otherwise a flat demo curve for the bundled cars.
export function getPriceHistory(car) {
  const history = car?.priceHistory;
  if (Array.isArray(history) && history.length > 1) return history;

  const drop = PRICE_DROPS[car.id] || 0;
  const base = car.type === 'auction' ? (car.currentBid || car.price) : car.price;
  if (drop > 0) {
    const orig = base + drop;
    return [orig, orig, Math.round(orig - drop * 0.4), Math.round(orig - drop * 0.7), Math.round(base + drop * 0.1), base];
  }
  return [
    Math.round(base * 1.02), Math.round(base * 1.015),
    Math.round(base * 1.02), Math.round(base * 1.005),
    Math.round(base * 1.01), base,
  ];
}

// All cars in a given neighborhood (pass full cars array)
export function getCarsInNeighborhood(cars, neighborhoodName) {
  return cars.filter((c) => (NEIGHBORHOOD_MAP[c.id] || 'Kigali') === neighborhoodName);
}

// Canonical money formatting. Product amounts already represent whole francs;
// presentation must never silently convert or relabel them.
export function formatRWF(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1_000_000) {
    const millions = value / 1_000_000;
    const compact = millions >= 100 || Number.isInteger(millions)
      ? millions.toFixed(0)
      : millions.toFixed(1).replace(/\.0$/, '');
    return `${compact}M RWF`;
  }
  return `RWF ${Math.round(value).toLocaleString('en-RW')}`;
}

// Rwanda RRA import duty calculation (2026 simplified rates)
// ccBracket: 'small' (<1500cc), 'medium' (1500-2000cc), 'large' (2000-3000cc), 'xl' (>3000cc)
export function calcRwandaDuty(vehicleValueUSD, ccBracket = 'medium') {
  const EXCISE_RATES = { small: 0.10, medium: 0.20, large: 0.25, xl: 0.35 };

  const cif = vehicleValueUSD * 1.12;              // add 12% freight + insurance
  const customs = cif * 0.25;                      // 25% customs duty
  const excise = cif * (EXCISE_RATES[ccBracket]);  // excise by displacement
  const subtotal = cif + customs + excise;
  const vat = subtotal * 0.18;                     // 18% VAT
  const infra = cif * 0.015;                       // 1.5% infrastructure levy

  const totalDuties = customs + excise + vat + infra;
  const grandTotal = vehicleValueUSD + totalDuties;
  const effectiveRate = Math.round((totalDuties / vehicleValueUSD) * 100);

  return { cif, customs, excise, vat, infra, totalDuties, grandTotal, effectiveRate };
}
