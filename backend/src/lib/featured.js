// ─────────────────────────────────────────────────────────────────────────────
// The featured rail's two rules that are not a WHERE clause.
//
// 1. A label has to be true. "Sponsored" is a disclosure and is always shown on
//    a paid slot. "Hot deal" is a claim about the price, so it is only made
//    when the price actually fell (see the price-drop lateral in
//    GET /cars/featured). An operator picking hot_deal on a car whose price
//    never moved gets "Featured", because the rail would otherwise be saying
//    something nobody can check.
//
// 2. Paid slots take turns. The rail no longer advances on its own, so the
//    first card is the one almost everyone sees. Sponsors who paid the same
//    way should get that first position equally often, and nobody should get
//    it just because their placement was booked first. Sponsored rows therefore
//    rotate among the positions they hold, once per Kigali calendar day.
//    Editorial and hot-deal picks keep the slot the operator chose. The shift
//    is per day, not per request, so the website (cached for a minute) and the
//    app show the same order on the same day.
// ─────────────────────────────────────────────────────────────────────────────

const KIGALI_OFFSET_MS = 2 * 3600 * 1000; // Africa/Kigali is UTC+2, no DST.
const DAY_MS = 86400 * 1000;

/** Days since the epoch, counted in Kigali. */
function kigaliDay(now = Date.now()) {
  return Math.floor((now + KIGALI_OFFSET_MS) / DAY_MS);
}

function featuredLabel(row) {
  if (row.kind === 'sponsored') return 'Sponsored';
  if (row.kind === 'hot_deal' && row.previous_price != null) return 'Hot deal';
  return 'Featured';
}

/**
 * Rotate the sponsored rows among the positions they already occupy.
 * Every other row stays exactly where the operator's slot put it.
 */
function rotateSponsored(rows, day = kigaliDay()) {
  const positions = [];
  rows.forEach((row, i) => { if (row.kind === 'sponsored') positions.push(i); });
  if (positions.length < 2) return rows;

  const shift = ((day % positions.length) + positions.length) % positions.length;
  const out = rows.slice();
  positions.forEach((pos, i) => {
    out[pos] = rows[positions[(i + shift) % positions.length]];
  });
  return out;
}

module.exports = { kigaliDay, featuredLabel, rotateSponsored };
