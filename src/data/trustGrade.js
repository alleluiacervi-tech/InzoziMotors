import { colors } from '../theme';

// One grade scale for the 0–100 trust score. The score screen and a seller's
// profile each carried their own thresholds (85/70/55 and 80/65/50), so the
// same seller was an A on one screen and a B on the other.
export function trustGrade(score) {
  if (score >= 85) return { letter: 'A', label: 'Excellent', color: colors.greenText };
  if (score >= 70) return { letter: 'B', label: 'Good', color: colors.statusScheduled };
  if (score >= 55) return { letter: 'C', label: 'Fair', color: colors.amberText };
  return { letter: 'D', label: 'Needs work', color: colors.alertRed };
}
