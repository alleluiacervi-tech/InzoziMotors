import Link from 'next/link'
import { Container, Icon } from '@/components/ui'
import { formatMoney } from '@/lib/business'
import { budgetHref, type InventorySummary } from '@/lib/inventory'
import { getServerT } from '@/lib/i18n/server'

// ─────────────────────────────────────────────────────────────────────────────
// What is in stock, in the three ways buyers here cut it: make, budget, body.
//
// Every chip carries its count and links to the /cars URL the filter panel
// would produce, and a chip only exists if its count is above zero. This band
// replaced four photographic body-type tiles (one of them hot-linked stock art
// of a pickup the yard did not have) with the yard's real shape.
// ─────────────────────────────────────────────────────────────────────────────

function Chip({ href, label, count, mark }: { href: string; label: string; count: number; mark?: string }) {
  return (
    <li>
      <Link
        href={href}
        className="group inline-flex h-11 items-center gap-2.5 rounded-pill border border-line bg-surface pl-1.5 pr-4 text-caption font-bold text-content transition-colors hover:border-content"
      >
        {mark ? (
          // Lettermark until an admin uploads the make's logo (brands are
          // third-party trademarks; none are committed — see CLAUDE.md).
          <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-surface-alt text-micro font-extrabold text-content-secondary">
            {mark}
          </span>
        ) : (
          <span aria-hidden="true" className="w-1.5" />
        )}
        {label}
        <span className="tabular-nums font-semibold text-content-muted">{count}</span>
      </Link>
    </li>
  )
}

export async function StockBand({ inventory }: { inventory: InventorySummary }) {
  const t = await getServerT()
  if (!inventory.total) return null

  const bands = inventory.budgets.filter((b) => b.count > 0)

  return (
    <section className="border-y border-line-soft bg-surface">
      <Container className="py-10 sm:py-12">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="text-headline font-extrabold text-content">
            {inventory.total === 1
              ? t('home.front.stock.titleOne')
              : t('home.front.stock.title', { count: inventory.total })}
          </h2>
          <Link
            href="/cars"
            className="-my-2 inline-flex items-center gap-1.5 py-2 text-body font-bold text-brand hover:underline"
          >
            {t('home.front.stock.all')}
            <Icon name="arrow-right" size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr_1fr] lg:gap-10">
          <div className="min-w-0">
            <h3 className="text-caption font-bold text-content-muted">{t('home.front.stock.byMake')}</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {inventory.makes.slice(0, 10).map((m) => (
                <Chip
                  key={m.value}
                  href={`/cars?make=${encodeURIComponent(m.value)}`}
                  label={m.value}
                  count={m.count}
                  mark={m.value.slice(0, 1).toUpperCase()}
                />
              ))}
            </ul>
          </div>

          {bands.length ? (
            <div className="min-w-0">
              <h3 className="text-caption font-bold text-content-muted">{t('home.front.stock.byBudget')}</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {bands.map((b) => (
                  <Chip
                    key={`${b.min}-${b.max}`}
                    href={budgetHref(b)}
                    count={b.count}
                    label={
                      b.min == null
                        ? t('home.front.stock.under', { amount: formatMoney(b.max) })
                        : b.max == null
                        ? t('home.front.stock.over', { amount: formatMoney(b.min - 1) })
                        : t('home.front.stock.range', { from: formatMoney(b.min - 1), to: formatMoney(b.max) })
                    }
                  />
                ))}
              </ul>
            </div>
          ) : null}

          {inventory.bodies.length ? (
            <div className="min-w-0">
              <h3 className="text-caption font-bold text-content-muted">{t('home.front.stock.byBody')}</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {inventory.bodies.slice(0, 6).map((b) => (
                  <Chip
                    key={b.value}
                    href={`/cars?body_type=${encodeURIComponent(b.value)}`}
                    label={b.value}
                    count={b.count}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  )
}

export default StockBand
