export const RWF_RATE = 1300; // 1 USD ≈ 1,300 RWF (2026 rate)

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

export function getNeighborhood(carId) {
  return NEIGHBORHOOD_MAP[carId] || 'Kigali';
}

export function getListedDaysAgo(carId) {
  return LISTED_DAYS_AGO[carId] || 14;
}

export function getSavedCount(carId) {
  return SAVED_COUNTS[carId] || 0;
}

export function getPriceDrop(carId) {
  return PRICE_DROPS[carId] || 0;
}

export function getDriveType(carId) {
  return DRIVE_TYPES[carId] || 'LHD';
}

// Market average = current price + below_market amount (if any), else +8%
export function getMarketAvg(car) {
  if (car.belowMarket) return car.price + car.belowMarket;
  if (car.type === 'auction') return Math.round((car.currentBid || car.price) * 1.06);
  return Math.round(car.price * 1.08);
}

// % diff from market: negative = below, positive = above
export function getMarketDiff(car) {
  const avg = getMarketAvg(car);
  const price = car.type === 'auction' ? (car.currentBid || car.price) : car.price;
  return Math.round(((price - avg) / avg) * 100);
}

// 6-point price history for sparkline (oldest → newest)
export function getPriceHistory(car) {
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

// RWF formatting
export function formatRWF(usdAmount) {
  const rwf = Math.round(usdAmount * RWF_RATE);
  if (rwf >= 1_000_000) {
    return `RWF ${(rwf / 1_000_000).toFixed(1)}M`;
  }
  return `RWF ${rwf.toLocaleString()}`;
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
