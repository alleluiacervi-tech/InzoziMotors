import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CarsPage, { generateMetadata as browseMetadata } from '../../page'
import { cars as carsApi, vehicleMakes } from '@/lib/api'
import { makeSlug } from '@/components/marketplace/query'
import type { SearchParams } from '@/components/marketplace/query'

// /cars/make/toyota — the Toyota view of /cars at a URL people and search
// engines can read. It renders the browse page itself with the make preset,
// and is that view's canonical (browseIndexPolicy), so the two never compete.

type Props = { params: Promise<{ make: string }>; searchParams: Promise<SearchParams> }

/** The stored make for a slug: from live stock first, then the brand list,
 *  because the API matches `make` exactly. Unknown slugs are a 404. */
async function resolveMake(slug: string): Promise<string | null> {
  const [stock, brands] = await Promise.all([
    carsApi.list({ limit: 100 }).catch(() => []),
    vehicleMakes.list().catch(() => []),
  ])
  const names = [...stock.map((car) => car.make), ...brands.map((b) => b.name)].filter(Boolean)
  return names.find((name) => makeSlug(name) === slug) ?? null
}

async function presetParams({ params, searchParams }: Props): Promise<SearchParams> {
  const { make: slug } = await params
  const make = await resolveMake(slug)
  if (!make) notFound()
  // The preset wins over a stray ?make= so the URL cannot say two things.
  return { ...(await searchParams), make }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const preset = await presetParams(props)
  return browseMetadata({ searchParams: Promise.resolve(preset) })
}

export default async function MakeLandingPage(props: Props) {
  const preset = await presetParams(props)
  return <CarsPage searchParams={Promise.resolve(preset)} />
}
