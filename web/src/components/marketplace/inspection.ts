import type { ChecklistVerdict, InspectionReport } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// Regrouping the 150-point checklist for a buyer.
//
// SOURCE OF TRUTH: CATEGORY_WEIGHTS in backend/src/routes/inspections.js —
// same category names, same weights, same item strings. The server computes the
// score and this file never recomputes it; all it does is fold the flat
// { item: verdict } map the API returns back into the seven categories a
// mechanic filled in, so the report reads the way it was taken.
//
// Items the backend does not map fall into "Other checks", weighted 21 like its
// default bucket. That way a checklist that grows on the server still renders
// completely here instead of silently dropping rows.
// ─────────────────────────────────────────────────────────────────────────────

export const SCORE_MAX = 150

export interface CategoryDefinition {
  id: string
  name: string
  weight: number
  items: string[]
}

export const INSPECTION_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'engine',
    name: 'Engine & drivetrain',
    weight: 25,
    items: [
      'Engine oil level & condition',
      'Coolant level',
      'Timing belt condition',
      'Air filter',
      'Engine mounts',
      'Transmission fluid',
    ],
  },
  {
    id: 'brakes',
    name: 'Brakes & steering',
    weight: 25,
    items: [
      'Front brake pads',
      'Rear brake pads',
      'Brake fluid',
      'Brake lines',
      'Power steering fluid',
      'Wheel alignment',
    ],
  },
  {
    id: 'body',
    name: 'Body & exterior',
    weight: 20,
    items: [
      'Panel gaps & alignment',
      'Paint condition',
      'Windscreen integrity',
      'Front lights',
      'Rear lights',
      'Rust / corrosion',
    ],
  },
  {
    id: 'interior',
    name: 'Interior & comfort',
    weight: 20,
    items: [
      'Seat condition',
      'Dashboard instruments',
      'Air conditioning',
      'Windows & locks',
      'Odometer reading',
      'Boot / trunk',
    ],
  },
  {
    id: 'electronics',
    name: 'Electronics & safety',
    weight: 20,
    items: [
      'Battery health',
      'OBD scan (no fault codes)',
      'Airbag system',
      'Traction control',
      'Seatbelts',
      'Horn',
    ],
  },
  {
    id: 'tyres',
    name: 'Tyres & wheels',
    weight: 15,
    items: [
      'Front-left tread',
      'Front-right tread',
      'Rear-left tread',
      'Rear-right tread',
      'Spare tyre',
      'Wheel condition',
    ],
  },
  {
    id: 'docs',
    name: 'Documentation',
    weight: 25,
    items: [
      'Registration / logbook',
      'Service history',
      'Import documents',
      'Insurance valid',
      'RRA duty paid stamp',
      'VIN match',
    ],
  },
]

const OTHER_WEIGHT = 21

export interface CategorySummary {
  id: string
  name: string
  weight: number
  /** Points earned out of `weight`; a flag is worth half, matching the server. */
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

const VERDICT_VALUE: Record<ChecklistVerdict, number> = { pass: 1, flag: 0.5, fail: 0 }

function isVerdict(value: unknown): value is ChecklistVerdict {
  return value === 'pass' || value === 'flag' || value === 'fail'
}

/**
 * `checklist_results` is a jsonb column. Postgres normally hands it back as an
 * object, but a driver or a migration can leave it a string — a report that
 * renders as an empty card because of a quoted blob is worse than a parse.
 */
function normalise(raw: Record<string, ChecklistVerdict> | string | null | undefined) {
  const source: unknown =
    typeof raw === 'string'
      ? (() => {
          try {
            return JSON.parse(raw) as unknown
          } catch {
            return null
          }
        })()
      : raw

  if (!source || typeof source !== 'object') return {}

  const result: Record<string, ChecklistVerdict> = {}
  for (const [item, verdict] of Object.entries(source as Record<string, unknown>)) {
    if (isVerdict(verdict)) result[item] = verdict
  }
  return result
}

/** Returns null when there is nothing real to show, so the caller can omit the
 *  card entirely rather than render an empty shell that implies a check ran. */
export function summariseReport(report: InspectionReport | null): ReportSummary | null {
  if (!report) return null

  const checklist = normalise(report.checklist_results)
  const entries = Object.entries(checklist)
  if (!entries.length) return null

  const mapped = new Set(INSPECTION_CATEGORIES.flatMap((category) => category.items))
  const unmapped = entries.filter(([item]) => !mapped.has(item))

  const definitions: CategoryDefinition[] = unmapped.length
    ? [
        ...INSPECTION_CATEGORIES,
        {
          id: 'other',
          name: 'Other checks',
          weight: OTHER_WEIGHT,
          items: unmapped.map(([item]) => item),
        },
      ]
    : INSPECTION_CATEGORIES

  const categories: CategorySummary[] = []
  for (const definition of definitions) {
    const present = definition.items.filter((item) => checklist[item] !== undefined)
    if (!present.length) continue

    let earnedRatio = 0
    let pass = 0
    let flag = 0
    let fail = 0
    const issues: CategorySummary['issues'] = []

    for (const item of present) {
      const verdict = checklist[item]
      earnedRatio += VERDICT_VALUE[verdict]
      if (verdict === 'pass') pass += 1
      else {
        if (verdict === 'flag') flag += 1
        else fail += 1
        issues.push({ item, verdict })
      }
    }

    categories.push({
      id: definition.id,
      name: definition.name,
      weight: definition.weight,
      earned: Math.round((earnedRatio / present.length) * definition.weight),
      pass,
      flag,
      fail,
      checked: present.length,
      issues,
    })
  }

  if (!categories.length) return null

  return {
    // The server's number, always. Recomputing it here would let a rounding
    // difference show a buyer one score and the seller another.
    score: Number(report.score) || 0,
    categories,
    pass: categories.reduce((sum, category) => sum + category.pass, 0),
    flag: categories.reduce((sum, category) => sum + category.flag, 0),
    fail: categories.reduce((sum, category) => sum + category.fail, 0),
    checked: categories.reduce((sum, category) => sum + category.checked, 0),
    issues: categories.flatMap((category) => category.issues),
  }
}
