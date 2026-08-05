import { formatUSD } from '@/lib/business'
import type { CarQuery } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// The browse URL contract.
//
// The URL is the state. Every filter is a query param, so a filtered view is
// linkable, shareable, cacheable and crawlable — and the page renders the same
// with or without JavaScript, because a plain <form method="get"> produces
// exactly these params.
//
// This module is the ONLY place that translates those params into the CarQuery
// the API speaks. The page, the filter form, the sort control and the active
// chips all read from here, which is what stops the four drifting apart.
// ─────────────────────────────────────────────────────────────────────────────

export const PAGE_SIZE = 24

export type SearchParams = { [key: string]: string | string[] | undefined }

// ─── Sorting ─────────────────────────────────────────────────────────────────
// The API takes sort + order as a pair. The URL exposes ONE combined value,
// because a single <select> that must work without JavaScript can only emit one.

type SortDef = {
  value: string
  label: string
  sort: NonNullable<CarQuery['sort']>
  order: NonNullable<CarQuery['order']>
}

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first', sort: 'listed_at', order: 'desc' },
  { value: 'price_asc', label: 'Price: low to high', sort: 'price', order: 'asc' },
  { value: 'price_desc', label: 'Price: high to low', sort: 'price', order: 'desc' },
  { value: 'mileage_asc', label: 'Mileage: lowest first', sort: 'mileage', order: 'asc' },
  { value: 'year_desc', label: 'Year: newest first', sort: 'year', order: 'desc' },
] as const satisfies readonly SortDef[]

export type SortValue = (typeof SORT_OPTIONS)[number]['value']
export const DEFAULT_SORT: SortValue = 'newest'

// ─── Filters ─────────────────────────────────────────────────────────────────

export const FILTER_FIELDS = [
  'q',
  'make',
  'model',
  'body_type',
  'fuel_type',
  'transmission',
  'drive_side',
  'min_price',
  'max_price',
  'min_year',
  'max_year',
] as const

export type FilterField = (typeof FILTER_FIELDS)[number]
export type Filters = Partial<Record<FilterField, string>>

const NUMERIC_FIELDS: ReadonlySet<FilterField> = new Set([
  'min_price',
  'max_price',
  'min_year',
  'max_year',
])

/** Right-hand drive is the Japanese-import fleet; left-hand drive was bought
 *  locally. In Rwanda both are on the road, so this is a real buying decision
 *  rather than a spec — the labels say so instead of using the initialism. */
export const DRIVE_SIDES = [
  { value: 'RHD', label: 'Right-hand drive', hint: 'Japanese import' },
  { value: 'LHD', label: 'Left-hand drive', hint: 'Bought locally' },
] as const

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

/** Numbers arrive from a URL anyone can hand-edit — keep digits, drop the rest,
 *  and treat a zero or a nonsense value as "not set" rather than passing it on. */
function cleanNumber(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return ''
  const n = Number(digits)
  return Number.isFinite(n) && n > 0 ? String(n) : ''
}

export function readFilters(searchParams: SearchParams): Filters {
  const filters: Filters = {}
  for (const field of FILTER_FIELDS) {
    const raw = first(searchParams[field]).trim().slice(0, 60)
    const value = NUMERIC_FIELDS.has(field) ? cleanNumber(raw) : raw
    if (value) filters[field] = value
  }
  return filters
}

export function readSort(searchParams: SearchParams): SortValue {
  const raw = first(searchParams.sort)
  const match = SORT_OPTIONS.find((option) => option.value === raw)
  return match ? match.value : DEFAULT_SORT
}

export function readOffset(searchParams: SearchParams): number {
  const n = Number(first(searchParams.offset))
  if (!Number.isFinite(n) || n <= 0) return 0
  // Clamp to whole pages so "showing 25–48" can never lie about where we are.
  return Math.floor(n / PAGE_SIZE) * PAGE_SIZE
}

export function activeFilterCount(filters: Filters): number {
  return Object.keys(filters).length
}

// ─── Translation to the API ──────────────────────────────────────────────────

export function toCarQuery(filters: Filters, sort: SortValue, offset: number): CarQuery {
  const definition = SORT_OPTIONS.find((option) => option.value === sort) ?? SORT_OPTIONS[0]

  const query: CarQuery = {
    sort: definition.sort,
    order: definition.order,
    limit: PAGE_SIZE,
    offset,
  }

  if (filters.q) query.q = filters.q
  if (filters.make) query.make = filters.make
  if (filters.model) query.model = filters.model
  if (filters.body_type) query.body_type = filters.body_type
  if (filters.fuel_type) query.fuel_type = filters.fuel_type
  if (filters.transmission) query.transmission = filters.transmission
  if (filters.drive_side) query.drive_side = filters.drive_side
  if (filters.min_price) query.min_price = Number(filters.min_price)
  if (filters.max_price) query.max_price = Number(filters.max_price)
  if (filters.min_year) query.min_year = Number(filters.min_year)
  if (filters.max_year) query.max_year = Number(filters.max_year)

  return query
}

// ─── Building links back ─────────────────────────────────────────────────────

/** Any change to the filters or the sort resets to the first page — landing on
 *  page 3 of a result set you have just narrowed is disorienting and often empty. */
export function buildBrowseHref(
  filters: Filters,
  options: { sort?: SortValue; offset?: number } = {}
): string {
  const params = new URLSearchParams()
  for (const field of FILTER_FIELDS) {
    const value = filters[field]
    if (value) params.set(field, value)
  }
  if (options.sort && options.sort !== DEFAULT_SORT) params.set('sort', options.sort)
  if (options.offset && options.offset > 0) params.set('offset', String(options.offset))

  const search = params.toString()
  return search ? `/cars?${search}` : '/cars'
}

export function withoutFilter(filters: Filters, field: FilterField): Filters {
  const next: Filters = { ...filters }
  delete next[field]
  return next
}

// ─── Human labels ────────────────────────────────────────────────────────────

export const FILTER_LABELS: Record<FilterField, string> = {
  q: 'Search',
  make: 'Make',
  model: 'Model',
  body_type: 'Body type',
  fuel_type: 'Fuel',
  transmission: 'Gearbox',
  drive_side: 'Drive side',
  min_price: 'Minimum price',
  max_price: 'Maximum price',
  min_year: 'Earliest year',
  max_year: 'Latest year',
}

export function chipLabel(field: FilterField, value: string): string {
  switch (field) {
    case 'q':
      return `“${value}”`
    case 'drive_side':
      return DRIVE_SIDES.find((side) => side.value === value)?.label ?? value
    case 'min_price':
      return `From ${formatUSD(Number(value))}`
    case 'max_price':
      return `Up to ${formatUSD(Number(value))}`
    case 'min_year':
      return `${value} or newer`
    case 'max_year':
      return `${value} or older`
    default:
      return value
  }
}

function pluralise(word: string): string {
  return /s$/i.test(word) ? word : `${word}s`
}

/**
 * One phrase describing the current view, reused by the <h1>, the page title
 * and the meta description so all three always agree.
 */
export function describeFilters(filters: Filters): string {
  const parts: string[] = []
  if (filters.make) parts.push(filters.make)
  if (filters.model) parts.push(filters.model)
  if (filters.body_type) parts.push(pluralise(filters.body_type))
  if (!parts.length && filters.fuel_type) parts.push(pluralise(filters.fuel_type))
  if (!parts.length && filters.drive_side) {
    parts.push(pluralise(chipLabel('drive_side', filters.drive_side)))
  }
  if (!parts.length && filters.q) return `“${filters.q}”`
  if (!parts.length) return 'Certified cars'

  const phrase = parts.join(' ')
  return /s$/i.test(phrase) ? phrase : `${phrase} cars`
}

export function browseHeading(filters: Filters): string {
  // A keyword on its own does not read as a noun — "“hybrid pickup” for sale in
  // Kigali" is nonsense, so it gets its own sentence.
  const onlyKeyword =
    !!filters.q && !filters.make && !filters.model && !filters.body_type &&
    !filters.fuel_type && !filters.drive_side
  if (onlyKeyword) return `Cars matching “${filters.q}” in Kigali`
  return `${describeFilters(filters)} for sale in Kigali`
}

// ─── Indexing policy for faceted browse ──────────────────────────────────────
// Eleven filter fields combine into effectively unlimited URLs, and every one
// of them currently told Google "index me, I am canonical". That is textbook
// faceted-navigation index bloat: crawl budget burns on near-duplicates while
// the actual car pages wait.
//
// The rule below is deliberately conservative, and it never points a canonical
// at a DIFFERENT page — a filtered view is not a duplicate of the unfiltered
// one, it is a narrower page, so the honest signal is "don't index me" rather
// than "I am really that other URL". (Cross-canonical + noindex is also the one
// combination Google warns can leak the noindex onto the target.)
//
// Indexable: the bare catalogue, and a single facet that matches how people
// actually search — "Toyota", "SUV", "diesel". Everything else — keyword
// searches, price and year ranges, facet stacks, non-default sorts, page 2+ —
// is crawlable and followable, but not indexed.

const INDEXABLE_FACETS: readonly FilterField[] = ['make', 'body_type', 'fuel_type']

export function browseIndexPolicy(
  filters: Filters,
  sort: SortValue,
  offset: number
): { canonical: string; index: boolean } {
  const active = FILTER_FIELDS.filter((field) => !!filters[field])
  const canonical = buildBrowseHref(filters, { sort, offset })

  const indexable =
    offset === 0 &&
    sort === DEFAULT_SORT &&
    (active.length === 0 ||
      (active.length === 1 && INDEXABLE_FACETS.includes(active[0])))

  return { canonical, index: indexable }
}
