// Certification tiers — Encar-style graded trust instead of a binary badge.
// Derived from the 150-point inspection score:
//   Certified+  — 140+/150, full documentation, our top grade
//   Certified   — 120+/150, passed with minor flags
//   Inspected   — completed the 150-point check
export function getCertTier(car) {
  if (!car?.inspected) return null;
  const score = car.inspectionScore || 0;
  if (score >= 140) return { key: 'plus', label: 'Certified+', short: 'Certified+', variant: 'certPlus' };
  if (score >= 120) return { key: 'certified', label: 'Sawa Certified', short: 'Certified', variant: 'cert' };
  return { key: 'inspected', label: '150-pt Inspected', short: 'Inspected', variant: 'inspectedTier' };
}
