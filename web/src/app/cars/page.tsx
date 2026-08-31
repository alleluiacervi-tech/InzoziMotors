import type { Metadata } from 'next'
import { Suspense } from 'react'
import { cars as carsApi } from '@/lib/api'
import type { Car } from '@/lib/types'
import { Button, Container, EmptyState, Icon } from '@/components/ui'
import { CarCard, CarCardSkeleton } from '@/components/marketplace/CarCard'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbNode, graph, itemListNode } from '@/lib/seo'
import { ActiveFilters } from '@/components/marketplace/ActiveFilters'
import { FilterPanel } from '@/components/marketplace/FilterPanel'
import { FilterSheet } from '@/components/marketplace/FilterSheet'
import { PageIntro } from '@/components/marketplace/PageIntro'
import { Pagination } from '@/components/marketplace/Pagination'
import { SortSelect } from '@/components/marketplace/SortSelect'
import { buildFacets, EMPTY_FACETS } from '@/components/marketplace/facets'
import {
  browseHeading,
  describeFilters,
  PAGE_SIZE,
  readFilters,
  readOffset,
  readSort,
  toCarQuery,
  buildBrowseHref,
  browseIndexPolicy,
  type SearchParams,
  type Filters,
  type SortValue,
} from '@/components/marketplace/query'

// ─────────────────────────────────────────────────────────────────────────────
// Browse — the marketplace's front door and its entire SEO surface.
//
// The page splits at the data boundary: the h1 and intro render synchronously
// (a crawler or a buyer on a dead connection always gets a headline), while the
// grid streams in behind a Suspense boundary. Every filtered view is a real
// address someone can send to a friend.
// ─────────────────────────────────────────────────────────────────────────────

type PageProps = { searchParams: Promise<SearchParams> }

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams
  const filters = readFilters(params)
  const sort = readSort(params)
  const offset = readOffset(params)
  const description = describeFilters(filters)

  // Which filtered views earn a place in the index — see browseIndexPolicy.
  const { canonical, index } = browseIndexPolicy(filters, sort, offset)

  return {
    title: Object.keys(filters).length
      ? `${browseHeading(filters)} in Kigali, Rwanda`
      : 'Cars for sale in Kigali, Rwanda',
    description:
      `${description} reviewed for publication on Sawa Cars in Kigali. View listing evidence and contact verified sellers directly.`,
    // Always self-canonical: a filtered view is a narrower page, not a
    // duplicate of the unfiltered one.
    alternates: { canonical },
    robots: index ? undefined : { index: false, follow: true },
    openGraph: {
      title: browseHeading(filters),
      url: canonical,
      images: ['/opengraph-image'],
    },
  }
}

/** The data-dependent half — everything that needs the API lives below here. */
async function BrowseResults({
  filters, sort, offset,
}: {
  filters: Filters
  sort: SortValue
  offset: number
}) {
  // BOTH calls are allowed to fail. An unreachable API renders the designed
  // degraded state below — never the route error boundary. "No cars matched"
  // and "we couldn't reach the marketplace" are different truths, so the
  // primary call records WHICH one happened rather than collapsing both to [].
  const [primary, facetSource] = await Promise.all([
    carsApi.list(toCarQuery(filters, sort, offset)).then(
      (rows) => ({ rows, reachable: true }),
      (err: unknown) => {
        console.error('browse inventory unavailable:', (err as Error).message)
        return { rows: [] as Car[], reachable: false }
      }
    ),
    // Filter options come from real inventory. If that call fails the page is
    // still perfectly usable — it just falls back to the keyword and range
    // fields, so a facet outage never takes browse down with it.
    carsApi.list({ limit: 100 }).catch(() => [] as Car[]),
  ])

  const results = primary.rows
  const apiDown = !primary.reachable
  const facets = facetSource.length ? buildFacets(facetSource) : EMPTY_FACETS

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
      <aside className="hidden lg:block">
        <div className="sticky top-[calc(var(--header-h)+24px)] rounded-3xl border border-line-soft bg-surface p-6 shadow-card">
          <div className="mb-6 flex items-center justify-between border-b border-line-soft pb-4">
            <div>
              <p className="text-micro font-bold uppercase tracking-[0.14em] text-brand">Find your fit</p>
              <h2 className="mt-1 text-title-sm font-extrabold text-content">Refine the collection</h2>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-pill bg-surface-alt text-content-secondary"><Icon name="filter" size={17} /></span>
          </div>
          <FilterPanel facets={facets} filters={filters} sort={sort} />
        </div>
      </aside>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line-soft bg-surface px-4 py-3 shadow-card sm:px-5">
          <div className="flex items-center gap-3">
            <FilterSheet facets={facets} filters={filters} sort={sort} />
            {/* "on this page" whenever more may exist — the API returns a
                page, never a total, so a bare count would be a claim we
                cannot back. When the API is down we claim nothing: "0 cars"
                would be a statement about inventory we cannot see. */}
            {!apiDown ? (
              <p className="text-caption text-content-secondary">
                <span className="font-bold text-content">{results.length}</span>
                {results.length === 1 ? ' car' : ' cars'}
                {offset > 0 || results.length === PAGE_SIZE ? ' on this page' : ''}
              </p>
            ) : null}
          </div>
          <SortSelect filters={filters} sort={sort} />
        </div>

        <div className="mt-4">
          <ActiveFilters filters={filters} sort={sort} />
        </div>

        {apiDown ? (
          <EmptyState
            icon="alert"
            title="The marketplace is briefly unreachable"
            description="The cars are still there — this page just couldn't reach them. Try again in a moment."
            action={
              <Button
                href={buildBrowseHref(filters, { sort })}
                variant="outline"
                leadingIcon={<Icon name="refresh" size={16} />}
              >
                Try again
              </Button>
            }
            className="mt-6 rounded-2xl border border-line-soft bg-surface"
          />
        ) : results.length ? (
          <>
            {/* The catalogue's contents, in the order shown. Gives Google the
                list structure it needs to understand this as a product listing
                page rather than a wall of links. */}
            <JsonLd
              data={graph(
                itemListNode(
                  results.map((car) => ({ path: `/cars/${car.id}`, name: car.title })),
                  browseHeading(filters)
                )
              )}
            />
            <ul className="stagger mt-6 grid items-stretch gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((car, index) => (
                <li key={car.id} className="min-w-0">
                  {/* Only the first row is eager — the rest would fight the
                      LCP image for bandwidth on a mobile connection. */}
                  <CarCard car={car} priority={index < 3} />
                </li>
              ))}
            </ul>

            <Pagination
              filters={filters}
              sort={sort}
              offset={offset}
              count={Math.min(results.length, PAGE_SIZE)}
            />
          </>
        ) : (
          <EmptyState
            icon="search"
            title="Nothing matches these filters yet"
            description={
              offset > 0
                ? 'There are no more cars on this page. Go back to see the full list.'
                : 'Our inventory changes as cars clear inspection — a match may be at a center right now. Widen the search, or check back; new cars go live the day they pass.'
            }
            action={
              <Button href="/cars" variant="outline" leadingIcon={<Icon name="refresh" size={16} />}>
                Clear all filters
              </Button>
            }
            className="mt-6 rounded-2xl border border-line-soft bg-surface"
          />
        )}
      </div>
    </div>
  )
}

function BrowseSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-12">
      <div className="hidden lg:block">
        <div className="skeleton h-96 rounded-2xl" />
      </div>
      <ul className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="min-w-0">
            <CarCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default async function CarsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const filters = readFilters(params)
  const sort = readSort(params)
  const offset = readOffset(params)

  return (
    <>
      {/* Breadcrumbs render outside the data boundary too — a crawler that
          times out on the grid still learns where this page sits. */}
      <JsonLd
        data={graph(
          breadcrumbNode([
            { name: 'Home', path: '/' },
            { name: 'Cars for sale', path: '/cars' },
          ])
        )}
      />

      {/* Outside the data boundary — the headline never waits on the API. */}
      <PageIntro
        eyebrow="The marketplace"
        title={browseHeading(filters)}
        description="Every car inspected on the same 150 points. Buyers never pay a fee."
      />

      <Container className="py-8 sm:py-12">
        <Suspense fallback={<BrowseSkeleton />}>
          <BrowseResults filters={filters} sort={sort} offset={offset} />
        </Suspense>
      </Container>
    </>
  )
}
