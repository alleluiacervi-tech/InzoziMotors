import Link from 'next/link'
import { Button, Card, Container, EmptyState, Section, SectionHeading, TextLink } from '@/components/ui'
import { CarCard } from '@/components/marketplace/CarCard'
import { formatMoney } from '@/lib/business'
import { budgetHref, type InventorySummary } from '@/lib/inventory'
import type { Car, FeaturedPlacement, SoldCar } from '@/lib/types'
import { RecentlySold } from './RecentlySold'
import { displayMake } from '@/lib/vehicle-names'
import { makeSlug } from '@/components/marketplace/query'
import { getServerT } from '@/lib/i18n/server'

// ─────────────────────────────────────────────────────────────────────────────
// The stock: the homepage's main event, directly under the hero.
//
// Operator placements are not a section of their own any more. With two of
// them, one of which was also the hero's car and the grid's first card, the
// same Hyundai appeared three times in three screens. Placements now lead
// this grid, each wearing its label in the card's top-right corner (a paid
// one always reads "Sponsored"), and the stock fills the rest. The hero's car
// is left out, so no car appears twice on the page.
// ─────────────────────────────────────────────────────────────────────────────

/** Nine fills three rows of three on a laptop and stays scannable on a phone. */
const GRID_MAX = 9
const PHONE_MAX = 4

function Filter({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <li className="shrink-0">
      <Link
        href={href}
        className="inline-flex h-10 items-center gap-2 rounded-pill border border-line bg-surface px-4 text-caption font-bold text-content transition-colors hover:border-content"
      >
        {label}
        <span className="tabular-nums font-semibold text-content-muted">{count}</span>
      </Link>
    </li>
  )
}

function Divider() {
  return <li aria-hidden="true" className="mx-1 h-5 w-px shrink-0 self-center bg-line" />
}

export async function FeaturedCars({
  cars,
  placements = [],
  excludeId,
  inventory,
  sold = [],
}: {
  /** Live stock, newest first. */
  cars: Car[]
  /** Operator placements in slot order; they lead the grid. */
  placements?: FeaturedPlacement[]
  /** The hero's car, already on screen above. */
  excludeId?: string
  inventory: InventorySummary
  /** Sold in the last 90 days; the row shows only with three or more. */
  sold?: SoldCar[]
}) {
  const t = await getServerT()

  const placementTag = (p: FeaturedPlacement) =>
    p.sponsored || p.label === 'Sponsored'
      ? t('home.topDeals.sponsored')
      : p.label === 'Hot deal'
      ? t('home.topDeals.hotDeal')
      : t('home.topDeals.featured')

  const seen = new Set<string>(excludeId ? [excludeId] : [])
  const grid: { car: Car; tag?: string }[] = []
  for (const p of placements) {
    if (grid.length >= GRID_MAX || seen.has(p.id)) continue
    seen.add(p.id)
    grid.push({ car: p, tag: placementTag(p) })
  }
  for (const car of cars) {
    if (grid.length >= GRID_MAX || seen.has(car.id)) continue
    seen.add(car.id)
    grid.push({ car })
  }

  // Whole rows only on a laptop: seven cards in threes leave one stranded.
  if (grid.length > 3) grid.length = Math.floor(grid.length / 3) * 3

  const bands = inventory.budgets.filter((b) => b.count > 0)
  const bandLabel = (b: (typeof bands)[number]) =>
    b.min == null
      ? t('home.front.stock.under', { amount: formatMoney(b.max) })
      : b.max == null
      ? t('home.front.stock.over', { amount: formatMoney(b.min - 1) })
      : t('home.front.stock.range', { from: formatMoney(b.min - 1), to: formatMoney(b.max) })

  return (
    <Section tone="page">
      <Container>
        <SectionHeading
          title={
            inventory.total === 1
              ? t('home.front.stock.titleOne')
              : inventory.total > 1
              ? t('home.front.stock.title', { count: inventory.total })
              : t('home.featured.title')
          }
          description={t('home.featured.description')}
          action={<TextLink href="/cars">{t('home.front.stock.all')}</TextLink>}
        />

        {/* The yard's shape as one row of filters: makes, budgets, bodies. On a
            phone it scrolls sideways rather than stacking into a wall. */}
        {inventory.total ? (
          <nav aria-label={t('home.front.stock.all')} className="-mx-5 mt-8 sm:mx-0">
            <ul className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-1 sm:flex-wrap sm:overflow-visible sm:px-0">
              {inventory.makes.slice(0, 6).map((m) => (
                <Filter key={m.value} href={`/cars/make/${makeSlug(m.value)}`} label={displayMake(m.value)} count={m.count} />
              ))}
              {bands.length ? <Divider /> : null}
              {bands.map((b) => (
                <Filter key={`${b.min}-${b.max}`} href={budgetHref(b)} label={bandLabel(b)} count={b.count} />
              ))}
              {inventory.bodies.length ? <Divider /> : null}
              {inventory.bodies.slice(0, 4).map((b) => (
                <Filter key={b.value} href={`/cars?body_type=${encodeURIComponent(b.value)}`} label={b.value} count={b.count} />
              ))}
            </ul>
          </nav>
        ) : null}

        {grid.length ? (
          <>
            <ul className="mt-8 grid items-stretch gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {grid.map(({ car, tag }, i) => (
                // A phone shows four, one per row; the rest are a tap away on
                // /cars. Two columns and up show the full nine.
                <li key={car.id} className={`h-full min-w-0 ${i >= PHONE_MAX ? 'hidden sm:block' : ''}`}>
                  <CarCard car={car} tag={tag} priority={i < 3} />
                </li>
              ))}
            </ul>
            <div className="mt-10 flex justify-center">
              <Button href="/cars" variant="outline" size="lg">
                {t('home.front.stock.all')}
              </Button>
            </div>
          </>
        ) : cars.length ? null : (
          // Only when there is no stock at all. One car in stock is the hero's
          // car, already on screen; the heading and "See all" still stand.
          <Card className="mt-10">
            <EmptyState
              icon="alert"
              title={t('home.featured.emptyTitle')}
              description={t('home.featured.emptyDescription')}
              action={
                <Button href="/cars" variant="outline">
                  {t('home.featured.emptyAction')}
                </Button>
              }
            />
          </Card>
        )}

        <RecentlySold cars={sold} />
      </Container>
    </Section>
  )
}

export default FeaturedCars
