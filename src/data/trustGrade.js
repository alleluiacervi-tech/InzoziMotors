import { colors } from '../theme';

// One grade scale for the 0–100 trust score. The score screen and a seller's
// profile each carried their own thresholds (85/70/55 and 80/65/50), so the
// same seller was an A on one screen and a B on the other.
// `labelKey` is a translation key (trustScore.grade*), resolved by the caller.
export function trustGrade(score) {
  if (score >= 85) return { letter: 'A', labelKey: 'trustScore.gradeExcellent', color: colors.greenText };
  if (score >= 70) return { letter: 'B', labelKey: 'trustScore.gradeGood', color: colors.statusScheduled };
  if (score >= 55) return { letter: 'C', labelKey: 'trustScore.gradeFair', color: colors.amberText };
  return { letter: 'D', labelKey: 'trustScore.gradeNeedsWork', color: colors.alertRed };
}
