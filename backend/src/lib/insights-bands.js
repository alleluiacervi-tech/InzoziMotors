// Price bands for inventory reporting, in RWF whole francs.
//
// The same edges as BUDGET_EDGES in web/src/lib/inventory.ts, with the same
// rule: a band is (previous edge, edge], so a car priced exactly 15,000,000
// sits in "up to 15M" on the homepage and in this report alike. Change both
// in the same commit or the admin console and the public site disagree.
const BUDGET_EDGES_RWF = [15_000_000, 30_000_000, 60_000_000];

/** Every band, low to high, as { min, max } with null for an open end. */
function budgetBands(edges = BUDGET_EDGES_RWF) {
  const bounds = [null, ...edges, null];
  return bounds.slice(0, -1).map((lo, i) => ({ min: lo == null ? null : lo + 1, max: bounds[i + 1] }));
}

module.exports = { BUDGET_EDGES_RWF, budgetBands };
