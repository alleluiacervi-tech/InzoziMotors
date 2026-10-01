// Certification tiers — Encar-style graded trust instead of a binary badge.
// Derived from the 150-point inspection score:
//   Certified+  — 140+/150, full documentation, our top grade
//   Certified   — 120+/150, passed with minor flags
//   Inspected   — completed the 150-point check
// A grade is only earned by a car that PASSED (score at the threshold and no
// critical failure). `inspectionPassed === false` caps it at Inspected — a high
// score cannot hide a failed brake check. Unknown (null) falls back to score.
export function getCertTier(car) {
  if (!car?.inspected) return null;
  const score = car.inspectionScore || 0;
  if (car.inspectionPassed === false) return { key: 'inspected', label: '150-pt Inspected', short: 'Inspected', variant: 'inspectedTier' };
  if (score >= 140) return { key: 'plus', label: 'Certified+', short: 'Certified+', variant: 'certPlus' };
  if (score >= 120) return { key: 'certified', label: 'Sawa Certified', short: 'Certified', variant: 'cert' };
  return { key: 'inspected', label: '150-pt Inspected', short: 'Inspected', variant: 'inspectedTier' };
}
