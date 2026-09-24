import Image from 'next/image'
import Link from 'next/link'
import { Icon } from '@/components/ui'
import type { IconName } from '@/components/ui'
import { I18nScope } from '@/components/i18n/I18nScope'
import { HeroSearch } from './HeroSearch'
import { formatMoney } from '@/lib/business'
import { budgetHref, type InventorySummary } from '@/lib/inventory'
import { getServerT } from '@/lib/i18n/server'

// ─────────────────────────────────────────────────────────────────────────────
// The front door: one sentence, one search, and one piece of evidence.
//
// LEFT: the claim the whole business rests on, then Buy / Rent / Import as one
// control (HeroSearch). Buyers in this market search make → budget → shape, so
// Buy is three structured fields rather than a single free-text box, and the
// shortcuts under it are the makes and bands actually in stock.
//
// RIGHT: the inspection photograph, with one live number set on its edge —
// how many inspected cars are in stock. A real car's report is on the page
// too, but lower down beside the rulebook it proves (InspectionStory): a
// listing photo is only as good as the seller's framing, and the hero is the
// one frame Sawa controls end to end.
//
// Printed on the site's paper, not an ink slab: the header, the page and the
// hero are one surface, and the certificate is the object set on it.
// ─────────────────────────────────────────────────────────────────────────────

const TRUST: { icon: IconName; key: string; href?: string }[] = [
  { icon: 'user', key: 'home.hero.trust.sellers', href: '/promise' },
  { icon: 'mail', key: 'home.hero.trust.contact', href: '/how-it-works' },
]

export async function Hero({
  inventory,
  rentalCount,
}: {
  inventory: InventorySummary
  rentalCount: number
}) {
  const t = await getServerT()

  // Shortcuts: the three makes with most stock, the cheapest band that has
  // cars in it, and the most common body type. Each is a /cars URL the filter
  // panel would also produce.
  const shortcuts: { label: string; href: string }[] = [
    ...inventory.makes.slice(0, 3).map((m) => ({ label: m.value, href: `/cars?make=${encodeURIComponent(m.value)}` })),
  ]
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
    <section className="ambient-paper grid-paper relative isolate overflow-hidden bg-surface-page">
      <div className="relative z-10 mx-auto grid w-full max-w-content items-center gap-10 px-5 pb-14 pt-8 sm:px-8 sm:pb-16 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,500px)] lg:gap-14 lg:px-12 lg:pb-20 lg:pt-14 xl:gap-20">
        {/* min-w-0 is load-bearing: a grid child defaults to min-width:auto,
            so a long string in the right track would widen it and push the
            headline off a 390px screen. That bug shipped once. */}
        <div className="min-w-0">
          <h1 className="max-w-[14ch] text-display-xl font-extrabold text-balance text-content">
            {t('home.front.headline')}
          </h1>
          <p className="mt-5 max-w-xl text-title-sm leading-relaxed text-pretty text-content-secondary">
            {t('home.front.lede')}
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
              <span className="mr-1 text-micro font-semibold text-content-muted">{t('home.front.popular')}</span>
              {shortcuts.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="inline-flex h-9 items-center rounded-pill border border-line bg-surface px-3.5 text-micro font-bold text-content-secondary transition-colors hover:border-content hover:text-content"
                >
                  {s.label}
                </Link>
              ))}
            </div>
          ) : null}

          {/* What Sawa is and is not, on the first screen: every surface must
              say the deal is between the parties (CLAUDE.md, "not a party"). */}
          <ul className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2">
            {TRUST.map((item) => (
              <li key={item.key} className="flex items-center gap-2 text-caption font-semibold text-content-secondary">
                <Icon name={item.icon} size={15} className="shrink-0 text-content-muted" aria-hidden="true" />
                {item.href ? (
                  <Link
                    href={item.href}
                    className="-my-2 py-2 underline decoration-line underline-offset-4 transition-colors hover:decoration-content"
                  >
                    {t(item.key)}
                  </Link>
                ) : (
                  t(item.key)
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* The photograph: a real vehicle on a real alignment rack at a Sawa
            centre. Every marketplace here opens on a clean car; this one
            opens on the inspection, because that is what it sells. Landscape
            on a phone so it costs one glance, the full portrait frame from lg. */}
        <figure className="relative m-0 min-w-0 animate-rise lg:animate-none">
          <div className="relative overflow-hidden rounded-3xl bg-surface-alt shadow-float ring-1 ring-line">
            <div className="relative aspect-[16/10] w-full sm:aspect-[2/1] lg:aspect-[4/5]">
              <Image
                src="/img/inspection-alignment.jpg"
                alt={t('home.hero.photoAlt')}
                fill
                priority
                sizes="(min-width: 1024px) 500px, 100vw"
                className="animate-kenburns object-cover object-[58%_42%] motion-reduce:animate-none lg:object-center"
              />
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink-900/85 via-ink-900/30 to-transparent" />
            </div>
            <figcaption className="absolute inset-x-5 bottom-5 flex items-start gap-2 text-micro font-semibold leading-snug text-white/80">
              <Icon name="camera" size={13} className="mt-0.5 shrink-0 text-white/50" aria-hidden="true" />
              <span className="min-w-0">{t('home.hero.photoCaption')}</span>
            </figcaption>
          </div>

          {/* The one piece of ink on the page, and it is live: how many
              inspected cars are in the yard right now. The headline already
              says "150", so this card says something the page does not. */}
          {inventory.total > 0 ? (
            <Link
              href="/cars"
              className="group mt-4 flex items-center gap-4 rounded-2xl bg-ink-900 p-4 shadow-lift-ink transition-transform duration-300 ease-brand hover:-translate-y-0.5 sm:p-5 lg:absolute lg:-left-12 lg:bottom-16 lg:mt-0 lg:max-w-[17rem]"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-brand-light" aria-hidden="true" />
              <span className="tnum text-display font-extrabold leading-none tracking-[-0.03em] text-white">
                {inventory.total}
              </span>
              <span className="min-w-0 text-caption leading-snug text-white/75 group-hover:text-white">
                {inventory.total === 1 ? t('home.frontExtra.stockCardOne') : t('home.frontExtra.stockCard')}
              </span>
            </Link>
          ) : null}
        </figure>
      </div>
    </section>
  )
}

export default Hero
