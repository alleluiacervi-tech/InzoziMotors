import type { Metadata } from 'next'
import { Suspense } from 'react'
import { cars as carsApi } from '@/lib/api'
import type { Car } from '@/lib/types'
import { Button, Container, EmptyState, Icon } from '@/components/ui'
import { CarCard, CarCardSkeleton } from '@/components/marketplace/CarCard'
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

  return {
    title: `${browseHeading(filters)}`,
    description:
      `${description} listed by Sawa in Kigali. Every car is physically ` +
      'inspected on our 150-point check, photographed by our team and covered by ' +
      'the 7-day drive-it guarantee. Buyers pay no fees.',
    alternates: { canonical: buildBrowseHref(filters, { sort }) },
    // Page 2 onwards is the same inventory in a different slice — one canonical
    // entry point is enough for a catalogue this size.
    robots: offset > 0 ? { index: false, follow: true } : undefined,
    openGraph: {
      title: browseHeading(filters),
      url: buildBrowseHref(filters, { sort }),
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
    <div className="grid gap-10 lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-12">
      <aside className="hidden lg:block">
        <div className="sticky top-[calc(var(--header-h)+24px)]">
          <h2 className="mb-5 text-caption font-bold uppercase tracking-wide text-content-muted">
            Narrow it down
          </h2>
          <FilterPanel facets={facets} filters={filters} sort={sort} />
        </div>
      </aside>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((car, index) => (
                <li key={car.id}>
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
      <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
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
      {/* Outside the data boundary — the headline never waits on the API. */}
      <PageIntro
        eyebrow="The marketplace"
        title={browseHeading(filters)}
        description="Every car inspected on the same 150 points. Buyers never pay a fee."
      />

      <Container className="py-8 sm:py-10">
        <Suspense fallback={<BrowseSkeleton />}>
          <BrowseResults filters={filters} sort={sort} offset={offset} />
        </Suspense>
      </Container>
    </>
  )
}
