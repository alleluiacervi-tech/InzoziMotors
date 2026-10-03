import Link from 'next/link'
import { Icon } from '@/components/ui'
import type { IconName } from '@/components/ui'
import { I18nScope } from '@/components/i18n/I18nScope'
import { HeroSearch } from './HeroSearch'
import { Specimen } from './Specimen'
import { formatMoney } from '@/lib/business'
import { budgetHref, type InventorySummary } from '@/lib/inventory'
import { getServerT } from '@/lib/i18n/server'
import type { InspectionReport } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// The front door: one sentence, one search, one piece of evidence.
//
// LEFT: the promise at poster size — know the car before you meet the seller —
// then Buy / Rent / Import as one control (HeroSearch), the shortcuts buyers
// here actually take, and what Sawa is not (the deal is between the parties;
// CLAUDE.md requires every surface to say so).
//
// RIGHT: the Specimen — the best-scoring car in stock with its real 150-point
// result. The hero used to carry a workshop photograph and a stock count; the
// report IS the product, so the hero now shows one instead of a picture of
// where one is made.
// ─────────────────────────────────────────────────────────────────────────────

const TRUST: { icon: IconName; key: string; href: string }[] = [
  { icon: 'user', key: 'home.hero.trust.sellers', href: '/promise' },
  { icon: 'mail', key: 'home.hero.trust.contact', href: '/how-it-works' },
]

export async function Hero({
  inventory,
  rentalCount,
  report,
}: {
  inventory: InventorySummary
  rentalCount: number
  report: InspectionReport | null
}) {
  const t = await getServerT()

  // Shortcuts: the three makes with most stock, the cheapest band that has
  // cars in it, and the most common body type — each a /cars URL the filter
  // panel would also produce.
  const shortcuts: { label: string; href: string }[] = inventory.makes
    .slice(0, 3)
    .map((m) => ({ label: m.value, href: `/cars?make=${encodeURIComponent(m.value)}` }))
  const firstBand = inventory.budgets.find((b) => b.count > 0 && b.max != null)
  if (firstBand) {
    shortcuts.push({
      label: firstBand.min == null
        ? t('home.front.stock.under', { amount: formatMoney(firstBand.max) })
        : t('home.front.stock.range', { from: formatMoney(firstBand.min - 1), to: formatMoney(firstBand.max) }),
      href: budgetHref(firstBand),
    })
  }
  if (inventory.bodies[0]) {
    shortcuts.push({
      label: inventory.bodies[0].value,
      href: `/cars?body_type=${encodeURIComponent(inventory.bodies[0].value)}`,
    })
  }

  return (
    <section className="relative isolate overflow-hidden bg-surface-page">
      <div className="mx-auto grid w-full max-w-content gap-12 px-5 pb-6 pt-10 sm:px-8 sm:pb-8 sm:pt-14 lg:grid-cols-12 lg:items-center lg:gap-10 lg:px-12 lg:pb-10 lg:pt-16 xl:gap-16">
        {/* min-w-0 is load-bearing: a grid child defaults to min-width:auto,
            so a long word would widen the track and push the headline off a
            390px screen. That bug shipped once. */}
        <div className="min-w-0 lg:col-span-7">
          <h1 className="max-w-[12ch] text-mega font-black text-balance text-content">
            {t('home.land.headline')}
          </h1>
          <p className="mt-6 max-w-[34rem] text-title-sm leading-relaxed text-pretty text-content-secondary">
            {t('home.land.lede')}
          </p>

          <I18nScope ns={['home']}>
            <HeroSearch
              makes={inventory.makes}
              modelsByMake={inventory.modelsByMake}
              rentalCount={rentalCount}
            />
          </I18nScope>

          {shortcuts.length ? (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-caption font-semibold text-content-muted">{t('home.front.popular')}</span>
              {shortcuts.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="inline-flex h-10 items-center rounded-pill border border-line bg-surface px-4 text-caption font-bold text-content-secondary transition-colors hover:border-content hover:text-content"
                >
                  {s.label}
                </Link>
              ))}
            </div>
          ) : null}

          <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
            {TRUST.map((item) => (
              <li key={item.key} className="flex items-center gap-2 text-caption font-semibold text-content-secondary">
                <Icon name={item.icon} size={15} className="shrink-0 text-content-muted" aria-hidden="true" />
                <Link
                  href={item.href}
                  className="-my-2 py-2 underline decoration-line underline-offset-4 transition-colors hover:decoration-content"
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 animate-rise lg:col-span-5">
          <Specimen car={inventory.best} report={report} />
        </div>
      </div>
    </section>
  )
}

export default Hero
