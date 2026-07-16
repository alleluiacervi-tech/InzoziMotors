// Financing + valuation helpers — representative demo figures.
// Rates mirror the FinancingScreen banks (Kigali market ~16% p.a.).

const ANNUAL_RATE = 0.16;
const TERM_MONTHS = 60;
const DOWN_PAYMENT = 0.2;

// Representative monthly payment: 20% down, 16% p.a., 60 months
export function monthlyEstimate(price) {
  const principal = price * (1 - DOWN_PAYMENT);
  const r = ANNUAL_RATE / 12;
  const pmt = (principal * r) / (1 - Math.pow(1 + r, -TERM_MONTHS));
  return Math.round(pmt);
}

// Instant valuation range from comparable cars in inventory
export function estimateValuation({ make, year, mileage }, cars) {
  const sameMake = cars.filter((c) => c.make === make && c.price);
  const pool = sameMake.length >= 2 ? sameMake : cars.filter((c) => c.price);
  const base = pool.reduce((sum, c) => sum + c.price, 0) / pool.length;

  const age = Math.max(0, 2026 - year);
  const yearFactor = Math.max(0.45, 1 - age * 0.055);

  const excessKm = Math.max(0, (mileage || 0) - 30000);
  const mileageFactor = Math.max(0.75, 1 - (excessKm / 10000) * 0.02);

  const est = base * yearFactor * mileageFactor;
  const round100 = (v) => Math.round(v / 100) * 100;

  return {
    low: round100(est * 0.92),
    high: round100(est * 1.08),
    comparables: sameMake.length,
  };
}
