import type { MetadataRoute } from 'next'
import { api } from '@/lib/api'
import { SITE } from '@/lib/site'
import type { Car, RentalCar } from '@/lib/types'

// Every live listing belongs in here — a car nobody can find is a car nobody
// buys, and the catalogue is the only part of Sawa that earns search traffic.
//
// NOTHING in this file is allowed to throw. `next build` renders the sitemap
// like any other route, so an unreachable API during a deploy would fail the
// whole build. Every fetch is caught and degrades to "the static routes only",
// which is still a valid sitemap.

/** Regenerate hourly. Long enough that the API is not polled by crawlers,
 *  short enough that a car listed this morning is discoverable today. */
export const revalidate = 3600

type Freq = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>

/** Mirrors NAV_LINKS and FOOTER_LINKS in lib/site.ts, minus the signed-in
 *  surfaces and the in-page anchors. Keep the two in step when a page lands. */
const STATIC_ROUTES: { path: string; changeFrequency: Freq; priority: number }[] = [
  { path: '/', changeFrequency: 'daily', priority: 1.0 },
  { path: '/cars', changeFrequency: 'hourly', priority: 0.9 },
  { path: '/rentals', changeFrequency: 'daily', priority: 0.8 },
  { path: '/imports', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/sell', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/how-it-works', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/promise', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/tools', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/tools/valuation', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/tools/import-duty', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/tools/finance', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/download', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/legal/guarantee', changeFrequency: 'yearly', priority: 0.4 },
  // /signin and /signup are deliberately absent: both set robots noindex, and
  // a sitemap entry for a noindex page is a contradiction crawlers hold against
  // every other URL in the file.
  { path: '/legal/terms', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/legal/privacy', changeFrequency: 'yearly', priority: 0.2 },
  // Declared in Google Play's Data Safety form, so it has to be discoverable
  // and reachable by a signed-out reviewer.
  { path: '/account/delete', changeFrequency: 'yearly', priority: 0.2 },
]

/** GET /cars clamps `limit` at 100, so the catalogue is paged. The page cap is
 *  a stop-loss: a backend that always returns a full page must not spin here. */
const PAGE_SIZE = 100
const MAX_PAGES = 20

async function liveCars(): Promise<Car[]> {
  const all: Car[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    try {
      const batch = await api.cars.list({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        sort: 'listed_at',
        order: 'desc',
      })
      all.push(...batch)
      if (batch.length < PAGE_SIZE) break
    } catch (err) {
      // Keep whatever we already have rather than losing the catalogue over
      // one bad page.
      console.error('sitemap: car page', page, 'unavailable —', (err as Error).message)
      break
    }
  }
  return all
}

async function activeRentals(): Promise<RentalCar[]> {
  try {
    return await api.rentals.list()
  } catch (err) {
    console.error('sitemap: rentals unavailable —', (err as Error).message)
    return []
  }
}

/** Only a real, parseable timestamp is worth emitting — a bogus lastmod is
 *  worse than none, because crawlers stop trusting all of them. */
function lastModified(iso?: string | null): Date | undefined {
  if (!iso) return undefined
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cars, rentals] = await Promise.all([liveCars(), activeRentals()])

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE.url}${route.path}`,
    // Do not stamp every static URL with "now" on each hourly regeneration.
    // That is a false freshness signal; crawlers learn to ignore all lastmod
    // values when unchanged pages repeatedly claim they were just updated.
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))

  const carEntries: MetadataRoute.Sitemap = cars.map((car) => ({
    url: `${SITE.url}/cars/${car.id}`,
    lastModified: lastModified(car.listed_at ?? car.created_at),
    // A live listing's price and save count move; the page itself is stable.
    changeFrequency: 'daily',
    priority: 0.7,
  }))

  const rentalEntries: MetadataRoute.Sitemap = rentals.map((rental) => ({
    url: `${SITE.url}/rentals/${rental.id}`,
    // The rentals table carries no updated_at, so no lastmod is claimed.
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...staticEntries, ...carEntries, ...rentalEntries]
}
