import { vehicleMakes } from '@/lib/api'
import type { VehicleMake } from '@/lib/types'

// Brand marks, the website's half of src/context/AppContext.js's brandLogo().
//
// The brand list is served by GET /makes (cached ten minutes), and a car's make
// is whatever the seller typed — "Mercedes", "mercedes-benz", "Benz" — so the
// lookup matches the name or any of its aliases, ignoring case. No logo is
// committed to either client; an operator uploads each one, and BrandMark
// draws the brand's initials until then.

export type LogoLookup = (make: string | null | undefined) => string | undefined

/** One fetch per render tree (the request is cached by Next). Never throws:
 *  without the list every brand simply draws its lettermark. */
export async function getLogoLookup(): Promise<LogoLookup> {
  const makes: VehicleMake[] = await vehicleMakes.list().catch(() => [])
  const index = new Map<string, VehicleMake>()
  for (const m of makes) {
    index.set(String(m.name).trim().toLowerCase(), m)
    for (const alias of m.aliases || []) index.set(String(alias).trim().toLowerCase(), m)
  }
  return (make) => index.get(String(make || '').trim().toLowerCase())?.logo_url || undefined
}
