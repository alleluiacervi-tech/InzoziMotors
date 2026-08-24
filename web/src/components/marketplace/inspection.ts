import type { InspectionReport } from '@/lib/types'

// The backend returns category summaries recomputed from the canonical,
// versioned 150-check policy. The website renders those authoritative values;
// it does not carry a second checklist that can drift from what was inspected.
export const SCORE_MAX = 150

export interface CategorySummary {
  id: string
  name: string
  weight: number
  earned: number
  pass: number
  flag: number
  fail: number
  checked: number
  issues: { item: string; verdict: 'flag' | 'fail' }[]
}

export interface ReportSummary {
  score: number
  categories: CategorySummary[]
  pass: number
  flag: number
  fail: number
  checked: number
  issues: { item: string; verdict: 'flag' | 'fail' }[]
}

/** Returns null unless the API supplied a passing, complete canonical report. */
export function summariseReport(report: InspectionReport | null): ReportSummary | null {
  if (!report?.passed || !Array.isArray(report.category_scores)) return null
  const categories = report.category_scores.map((category) => ({
    id: category.id,
    name: category.name,
    weight: Number(category.max_points),
    earned: Number(category.earned),
    pass: Number(category.pass_count),
    flag: Number(category.flag_count),
    fail: Number(category.fail_count),
    checked: Number(category.checked),
    issues: (category.flags || []).map((issue) => ({
      item: issue.label,
      verdict: issue.verdict,
    })),
  }))
  if (!categories.length || categories.some((category) => !Number.isFinite(category.earned))) return null
  return {
    score: Number(report.score),
    categories,
    pass: categories.reduce((sum, category) => sum + category.pass, 0),
    flag: categories.reduce((sum, category) => sum + category.flag, 0),
    fail: categories.reduce((sum, category) => sum + category.fail, 0),
    checked: categories.reduce((sum, category) => sum + category.checked, 0),
    issues: categories.flatMap((category) => category.issues),
  }
}
