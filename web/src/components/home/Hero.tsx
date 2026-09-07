import Image from 'next/image'
import Link from 'next/link'
import { Button, Icon } from '@/components/ui'
import type { IconName } from '@/components/ui'
import { HERO_SLIDES } from '@/lib/imagery'
import { formatKm, formatUSD } from '@/lib/business'
import type { Car } from '@/lib/types'
import { getServerT } from '@/lib/i18n/server'
import type { TFunction } from '@/lib/i18n/dictionary'

// The hero is a full-viewport photographic stage with the marketplace's first
// action ON it. A marketplace's front door is a search box, not a slogan — so
// the search form sits under the headline, on the stage, and submitting it is
// the page's one red action. The old layout put search in a separate light
// band below, which made the most important control on the site the second
// viewport-stop; measured against how people actually use Encar-style
// marketplaces, that is one scroll too late.
//
// A real GET form: works without JavaScript, produces a shareable, indexable
// /cars?q= URL. An empty submit lands on /cars showing everything, so search
// and browse are the same door.
//
// Selling is the quieter path — a text link, because "Sell" also lives in the
// header and in the page's closing band. One primary action per viewport.

const TRUST_STRIP: { icon: IconName; key: string }[] = [
  { icon: 'shield-check', key: 'home.hero.trust.inspection' },
  { icon: 'user', key: 'home.hero.trust.sellers' },
  { icon: 'mail', key: 'home.hero.trust.contact' },
]

// One slide. The first entry of the curated set is the buy-side statement,
// which is the right single message for a marketplace's front door.
const STAGE = HERO_SLIDES[0]

const JOURNEYS: { key: string; href: string; icon: IconName; active?: boolean }[] = [
  { key: 'home.hero.nav.buy', href: '/cars', icon: 'search', active: true },
  { key: 'home.hero.nav.rent', href: '/rentals', icon: 'key' },
  { key: 'home.hero.nav.sell', href: '/sell', icon: 'car' },
  { key: 'home.hero.nav.tools', href: '/tools', icon: 'gauge' },
]

/**
 * Live stock, inside the first screen.
 *
 * The stage was one photograph of a car nobody can buy, and a visitor had to
 * scroll before the site proved it had any inventory at all. Four real
 * listings sit beside the search box now — the same cars the page already
 * fetches for the grid below, so this costs no extra request — and if the
 * backend is unreachable the rail simply does not render. Never a placeholder
 * car: a marketplace that invents stock on its front door has nothing left to
 * be trusted about.
 */
function StockRail({ cars, t }: { cars: Car[]; t: TFunction }) {
  if (!cars.length) return null
  return (
    <div
      className="w-full animate-fade-up lg:max-w-[392px]"
      style={{ animationDelay: '460ms' }}
    >
      <div className="mb-2.5 flex items-baseline justify-between px-1">
        <span className="text-eyebrow font-bold uppercase text-white/85">
          {t('home.hero.stockEyebrow')}
        </span>
        <Link href="/cars" className="text-caption font-bold text-white hover:underline">
          {t('home.hero.stockAll')}
        </Link>
      </div>
      <ul className="flex flex-col gap-2.5">
        {cars.slice(0, 4).map((car) => (
          <li key={car.id}>
            <Link
              href={`/cars/${car.id}`}
              className="flex items-center gap-3.5 rounded-xl border border-white/12 bg-white/[0.07] p-2.5 transition-colors hover:border-white/25 hover:bg-white/[0.12]"
            >
              <span className="relative h-[68px] w-[92px] shrink-0 overflow-hidden rounded-md bg-white/10">
                {car.images?.[0] ? (
                  <Image
                    src={car.images[0]}
                    alt=""
                    fill
                    sizes="92px"
                    className="object-cover"
                  />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-caption font-bold text-white">{car.title}</span>
                <span className="mt-0.5 block truncate text-micro text-white/65">
                  {formatKm(car.mileage)}
                  {car.location ? ` · ${car.location}` : ''}
                  {car.inspection_score ? ` · ${car.inspection_score}/150` : ''}
                </span>
              </span>
              <span className="shrink-0 text-caption font-extrabold tabular-nums text-white">
                {formatUSD(car.price)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export async function Hero({ cars = [] }: { cars?: Car[] }) {
  const t = await getServerT()
  return (
    // -mt pulls the stage up UNDER the transparent header (see Header.tsx's
    // overlay mode) so the page opens as one full-bleed photograph with the
    // navigation floating on it, rather than a white bar stacked on an image.
    <section className="relative -mt-[var(--header-h)] flex min-h-[100svh] items-end overflow-hidden bg-ink-900">
      {STAGE.image ? (
        <Image
          src={STAGE.image}
          alt={STAGE.alt}
          fill
          priority
          sizes="100vw"
          // The 22s push-in: starts a breath wider and settles home. Nobody
          // can point at it; the opening just feels alive. The reduced-motion
          // kill-switch in globals.css collapses it to a static frame.
          className="animate-kenburns object-cover"
          {...(typeof STAGE.image !== 'string' ? { placeholder: 'blur' as const } : {})}
        />
      ) : null}
      {/* Legibility gradient — the text sits on ink, not on the photo. */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-900/90 via-ink-900/45 to-ink-900/15" />
      {/* Top scrim for the overlay header: the floating nav's white type must
          hold contrast even when the photograph's sky is bright. */}
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-ink-900/70 to-transparent" />

      {/* Two columns from lg up: the statement and its search on the left, live
          stock on the right. Below lg they stack, statement first — on a phone
          the rail is one thumb-scroll away rather than competing for the fold. */}
      <div className="relative mx-auto grid w-full max-w-content items-end gap-10 px-5 pb-14 pt-32 sm:px-8 sm:pb-16 lg:grid-cols-[minmax(0,1fr)_392px] lg:gap-14 lg:px-12">
        <div className="max-w-2xl text-white">
          <p
            className="mb-3 animate-fade-up text-eyebrow font-bold uppercase text-white/85"
            style={{ animationDelay: '80ms' }}
          >
            {t('home.hero.eyebrow')}
          </p>
          <h1 className="animate-fade-up text-display-xl font-extrabold" style={{ animationDelay: '160ms' }}>
            {t('home.hero.title')}
          </h1>
          <p
            className="mt-4 max-w-xl animate-fade-up text-title-sm leading-relaxed text-white/80"
            style={{ animationDelay: '260ms' }}
          >
            {t('home.hero.subtitle')}
          </p>

          <nav
            aria-label={t('home.hero.navLabel')}
            className="mt-8 flex w-full max-w-xl gap-1 rounded-2xl border border-white/15 bg-ink-900/35 p-1.5 backdrop-blur-md"
          >
            {JOURNEYS.map((journey) => (
              <Link
                key={journey.key}
                href={journey.href}
                aria-current={journey.active ? 'page' : undefined}
                className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-caption font-bold transition-all sm:px-3 ${
                  journey.active
                    ? 'bg-white text-content shadow-card'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon name={journey.icon} size={15} />
                <span className="truncate">{t(journey.key)}</span>
              </Link>
            ))}
          </nav>

          <form
            action="/cars"
            method="get"
            role="search"
            className="mt-3 flex w-full max-w-xl animate-fade-up items-center gap-2 rounded-2xl bg-white p-2 shadow-float"
            style={{ animationDelay: '380ms' }}
          >
            <label htmlFor="hero-search" className="sr-only">
              {t('home.hero.searchLabel')}
            </label>
            <span className="pl-3 text-content-muted">
              <Icon name="search" size={18} />
            </span>
            <input
              id="hero-search"
              name="q"
              type="search"
              autoComplete="off"
              placeholder={t('home.hero.searchPlaceholder')}
              className="h-11 min-w-0 flex-1 bg-transparent text-body text-content placeholder:text-content-muted"
            />
            <Button type="submit" size="sm">
              {t('home.hero.searchButton')}
            </Button>
          </form>

          <ul
            className="mt-6 flex animate-fade-up flex-wrap items-center gap-x-7 gap-y-3"
            style={{ animationDelay: '560ms' }}
          >
            {TRUST_STRIP.map((item) => (
              <li
                key={item.key}
                className="flex items-center gap-2 text-caption font-semibold text-white/85"
              >
                <Icon name={item.icon} size={15} className="text-white/70" />
                {t(item.key)}
              </li>
            ))}
          </ul>
        </div>

        <StockRail cars={cars} t={t} />
      </div>
    </section>
  )
}

export default Hero
