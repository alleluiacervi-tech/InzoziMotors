import type { Car } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// What is in the yard, summarised once for the homepage.
//
// Every number the homepage shows about stock — the count, the makes, the
// budget bands, the body types, the models the search box offers — comes from
// one page of live listings through this file. Nothing is offered that would
// land a buyer on an empty page, and nothing is counted twice with two
// different rules.
//
// BUDGET_BANDS is the site's ONE set of price bands. An earlier homepage had
// three (hero 15/30/50/100M, a pill row 25/50M, chips 10/20/35M) that
// disagreed with each other on the same screen; the hero's budget select and
// the stock band both read this list.
// ─────────────────────────────────────────────────────────────────────────────

/** Upper edges of the bands, in whole RWF. The last band is open-ended. */
export const BUDGET_EDGES = [15_000_000, 30_000_000, 60_000_000] as const

export interface BudgetBand {
  /** Inclusive lower bound (RWF) or null for the first band. */
  min: number | null
  /** Inclusive upper bound (RWF) or null for the open top band. */
  max: number | null
  count: number
}

export interface CountedValue {
  value: string
  count: number
}

export interface InventorySummary {
  total: number
  makes: CountedValue[]
  bodies: CountedValue[]
  budgets: BudgetBand[]
  /** Models in stock per make, for the hero's model suggestions. */
  modelsByMake: Record<string, string[]>
  /** The listing with the highest inspection score (ties: newest first). */
  best: Car | null
}

function counted(values: (string | null | undefined)[]): CountedValue[] {
  const byKey = new Map<string, CountedValue>()
  for (const raw of values) {
    const value = raw?.trim()
    if (!value) continue
    const key = value.toLowerCase()
    const hit = byKey.get(key)
    if (hit) hit.count += 1
    else byKey.set(key, { value, count: 1 })
  }
  return [...byKey.values()].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}

export function budgetBands(prices: number[]): BudgetBand[] {
  const edges = [null, ...BUDGET_EDGES, null] as (number | null)[]
  const bands: BudgetBand[] = []
  for (let i = 0; i < edges.length - 1; i++) {
    const min = edges[i] == null ? null : (edges[i] as number) + 1
    const max = edges[i + 1]
    const count = prices.filter((p) => (min == null || p >= min) && (max == null || p <= max)).length
    bands.push({ min, max, count })
  }
  return bands
}

/** The /cars URL for a band — the same params the filter panel writes. */
export function budgetHref(band: Pick<BudgetBand, 'min' | 'max'>): string {
  const params = new URLSearchParams()
  if (band.min != null) params.set('min_price', String(band.min))
  if (band.max != null) params.set('max_price', String(band.max))
  return `/cars?${params.toString()}`
}

export function summarizeInventory(cars: Car[]): InventorySummary {
  const modelsByMake: Record<string, string[]> = {}
  for (const car of cars) {
    if (!car.make || !car.model) continue
    const list = (modelsByMake[car.make] ??= [])
    if (!list.some((m) => m.toLowerCase() === car.model!.toLowerCase())) list.push(car.model)
  }
  for (const list of Object.values(modelsByMake)) list.sort((a, b) => a.localeCompare(b))

  let best: Car | null = null
  for (const car of cars) {
    if (!car.inspection_score) continue
    if (!best || car.inspection_score > (best.inspection_score ?? 0)) best = car
  }

  return {
    total: cars.length,
    makes: counted(cars.map((c) => c.make)),
    bodies: counted(cars.map((c) => c.body_type)),
    budgets: budgetBands(cars.map((c) => c.price).filter((p): p is number => typeof p === 'number')),
    modelsByMake,
    best,
  }
}
