import type { Car } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// Filter options, derived from the inventory that actually exists.
//
// A hardcoded make list would offer buyers thirty brands Inzozi has never
// listed, and every one of those clicks lands on an empty page. So the options
// come from a page of live listings instead: if it is not in the yard, it is
// not in the dropdown.
//
// The trade is that the option list reflects one page (the API clamps a request
// at 100 rows), not the whole catalogue. At Inzozi's inventory size that is the
// whole catalogue; when it stops being, the backend should expose a facet
// endpoint and this file becomes a thin call to it.
// ─────────────────────────────────────────────────────────────────────────────

export interface Facets {
  makes: string[]
  bodyTypes: string[]
  fuelTypes: string[]
  transmissions: string[]
}

export const EMPTY_FACETS: Facets = {
  makes: [],
  bodyTypes: [],
  fuelTypes: [],
  transmissions: [],
}

function distinct(values: (string | null | undefined)[]): string[] {
  const seen = new Map<string, string>()
  for (const raw of values) {
    const value = raw?.trim()
    if (!value) continue
    // Case-insensitive de-dupe: "Petrol" and "petrol" are one option, and the
    // first spelling the catalogue used is the one buyers see.
    const key = value.toLowerCase()
    if (!seen.has(key)) seen.set(key, value)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

export function buildFacets(cars: Car[]): Facets {
  return {
    makes: distinct(cars.map((car) => car.make)),
    bodyTypes: distinct(cars.map((car) => car.body_type)),
    fuelTypes: distinct(cars.map((car) => car.fuel_type)),
    transmissions: distinct(cars.map((car) => car.transmission)),
  }
}

/**
 * A filter already in the URL must stay selectable even if this page of
 * inventory no longer contains it — otherwise the select silently drops the
 * user's own choice and the form re-submits without it.
 */
export function withSelected(options: string[], selected?: string): string[] {
  if (!selected) return options
  const has = options.some((option) => option.toLowerCase() === selected.toLowerCase())
  return has ? options : [selected, ...options]
}
