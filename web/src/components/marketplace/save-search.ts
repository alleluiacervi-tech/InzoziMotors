import type { TFunction } from '@/lib/i18n/dictionary'
import type { SavedSearch } from '@/lib/types'
import { formatMoney } from '@/lib/business'
import { describeFilters, type Filters } from './query'

/** The /cars filters an alert can match on (backend/src/lib/alerts.js): make,
 *  model, body type (stored as `category`) and a franc budget. A keyword is
 *  kept for the label and the dashboard, though the matcher ignores it. */
export function toSavedSearchFilters(filters: Filters): SavedSearch['filters'] {
  const out: SavedSearch['filters'] = {}
  if (filters.make) out.make = filters.make
  if (filters.model) out.model = filters.model
  if (filters.body_type) out.category = filters.body_type
  const max = Number(filters.max_price)
  if (Number.isFinite(max) && max > 0) out.maxPrice = Math.round(max)
  if (filters.q) out.query = filters.q
  return out
}

/** Worth offering only when the view names something a new car could match. */
export function canSaveSearch(filters: Filters): boolean {
  const f = toSavedSearchFilters(filters)
  return Boolean(f.make || f.model || f.category || f.maxPrice)
}

/** "Tell me when new Toyota cars under RWF 20M are listed". */
export function saveSearchLabel(t: TFunction, filters: Filters): string {
  const subject = describeFilters(t, { make: filters.make, model: filters.model, body_type: filters.body_type })
  const max = Number(filters.max_price)
  return Number.isFinite(max) && max > 0
    ? t('cars.saveSearch.promptBudget', { subject, amount: formatMoney(max) })
    : t('cars.saveSearch.prompt', { subject })
}
