import Link from 'next/link'
import { Button, Card, Container, EmptyState, Section, SectionHeading, TextLink } from '@/components/ui'
import { CarCard } from '@/components/marketplace/CarCard'
import { formatMoney } from '@/lib/business'
import { budgetHref, type InventorySummary } from '@/lib/inventory'
import type { Car } from '@/lib/types'
import { getServerT } from '@/lib/i18n/server'

// ─────────────────────────────────────────────────────────────────────────────
// The yard: how many inspected cars are in stock, the ways buyers here cut it
// (make, budget, body), and the newest eight.
//
// The cuts used to be a band of their own above this grid, three labelled
// columns of chips. They are one row of filters now, directly over the cars
// they filter — the same chips, where a buyer's eye already is. Every chip
// carries its count and links to the /cars URL the filter panel would write,
// and a chip exists only when its count is above zero.
// ─────────────────────────────────────────────────────────────────────────────

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

export async function FeaturedCars({ cars, inventory }: { cars: Car[]; inventory: InventorySummary }) {
  const t = await getServerT()
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

        {inventory.total ? (
          // One scrolling row on a phone (a thumb swipe, not five rows of
          // chips pushing the cars below the fold); it wraps from sm up.
          <nav aria-label={t('home.front.stock.all')} className="-mx-5 mt-8 sm:mx-0">
            <ul className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-1 sm:flex-wrap sm:overflow-visible sm:px-0">
              {inventory.makes.slice(0, 6).map((m) => (
                <Filter key={m.value} href={`/cars?make=${encodeURIComponent(m.value)}`} label={m.value} count={m.count} />
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

        {cars.length ? (
          <div className="mt-8 grid items-stretch gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cars.map((car, i) => (
              <div key={car.id} className={`h-full min-w-0 ${i >= 6 ? 'hidden xl:block' : ''}`}>
                <CarCard car={car} />
              </div>
            ))}
          </div>
        ) : (
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
      </Container>
    </Section>
  )
}

export default FeaturedCars
