// The price history a buyer is shown.
//
// A seller who fixes a typo in the first minutes of a listing is correcting
// it, not changing their price: on 15 Oct 2026 a Civic went live at 70,000 RWF
// and was corrected to 25,000,000 two minutes later, and every client drew that
// as a price rise. So the history starts from the price in force once the
// first hour after the car went live has passed; edits inside that hour are
// folded into the opening price. Changes after it are real and all kept.

const SETTLE_MS = 60 * 60 * 1000;

/**
 * @param {{price: number|string, at: string|Date}[]} rows oldest first
 * @param {string|Date|null} liveFrom when the car first went live
 * @returns the rows a buyer sees, oldest first; the first is the opening price
 */
function publicPriceHistory(rows, liveFrom) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const from = liveFrom ? new Date(liveFrom).getTime() : NaN;
  if (!Number.isFinite(from)) return rows;
  const settledAt = from + SETTLE_MS;
  const time = (row) => new Date(row.at).getTime();

  const settling = rows.filter((row) => time(row) <= settledAt);
  const later = rows.filter((row) => time(row) > settledAt);
  if (settling.length === 0) return later;
  const opening = settling[settling.length - 1];
  return [opening, ...later];
}

module.exports = { publicPriceHistory, SETTLE_MS };
