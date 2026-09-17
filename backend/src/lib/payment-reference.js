// A deterministic per-milestone payment reference, derived from the order
// ref rather than stored anywhere. Both `backend/src/routes/imports.js`
// (the API payload) and `backend/src/lib/documents/import-documents.js`
// (the deposit invoice PDF) must agree on this string, or a buyer sees one
// reference on their order and a different one on the invoice they paid
// against — so it lives here once rather than in either.
//
// This turns payment reconciliation from "compare a photo to a bank
// statement" into "match a string". See docs/IMPORTS-AUDIT.md, Tier 1
// automation.

const MILESTONE_SUFFIX = { initial_50: 'D1', final_50: 'D2' };

function paymentReference(orderRef, milestone) {
  const suffix = MILESTONE_SUFFIX[milestone] || String(milestone || '').slice(0, 3).toUpperCase();
  return `${orderRef}-${suffix}`;
}

module.exports = { paymentReference };
