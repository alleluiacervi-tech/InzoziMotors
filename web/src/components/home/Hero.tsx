import Image from 'next/image'
import Link from 'next/link'
import { Badge, Button, Container, Eyebrow, Icon } from '@/components/ui'
import type { IconName } from '@/components/ui'
import { CarGlyph } from '@/components/brand/Logo'
import { HeroScene } from '@/components/brand/HeroScene'
import { formatUSD, getCertTier } from '@/lib/business'
import type { Car } from '@/lib/types'

// The whole proposition in two lines, and a real car above the fold — a
// marketplace that opens with an actual listing instead of an illustration.
// Search is the hero's only primary action: for a marketplace, search IS the
// hero. Browse/sell entries live in the nav, BrowseEntry, and the closer.
//
// The search box is a real GET form pointed at /cars, so it works with
// JavaScript disabled and produces a shareable, indexable URL.

const TRUST_STRIP: { icon: IconName; label: string }[] = [
  { icon: 'shield-check', label: '150-point inspection' },
  { icon: 'refresh', label: '7-day drive-it guarantee' },
  { icon: 'cash', label: 'Buyers pay nothing' },
]

/** The newest live listing, rendered as the hero image. */
function HeroCar({ car }: { car: Car }) {
  const tier = getCertTier(car)
  const image = car.images?.[0]

  return (
    <div>
      <Link
        href={`/cars/${car.id}`}
        className="group relative block overflow-hidden rounded-3xl shadow-card-lg"
      >
        <div className="relative aspect-[4/3] bg-surface-alt">
          {image ? (
            <Image
              src={image}
              alt={car.title}
              fill
              priority
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover transition-transform duration-500 ease-brand group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <CarGlyph width={220} body="#E8E3E3" glass="#F6F4F4" />
            </div>
          )}
        </div>

        {tier ? (
          <div className="absolute left-4 top-4">
            <Badge tone={tier.key === 'plus' ? 'certPlus' : 'cert'} icon="shield-check">
              {tier.short}
            </Badge>
          </div>
        ) : null}

        {/* Photo overlays use white for the price — red loses legibility on
            photography; the red-price rule applies on light surfaces. */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-ink-900/70 p-4 text-white backdrop-blur">
          <p className="min-w-0 truncate text-title-sm font-extrabold">{car.title}</p>
          <p className="shrink-0 text-title-sm font-extrabold">{formatUSD(car.price)}</p>
        </div>
      </Link>
      <p className="mt-3 text-micro text-content-muted">
        Photographed at our Kigali center · 36 standard angles
      </p>
    </div>
  )
}

/** No listing to show — the brand illustration, never a skeleton or a stock
 *  photo of a car we don't have. */
function HeroFallback() {
  return (
    <div>
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl bg-surface">
        <HeroScene className="h-full w-full" />
      </div>
      <p className="mt-3 text-micro text-content-muted">
        Every listing: inspected, photographed, published by us
      </p>
    </div>
  )
}

export function Hero({ car }: { car: Car | null }) {
  return (
    <section className="border-b border-line-soft bg-surface-page">
      <Container className="py-16 sm:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-up">
            <Eyebrow>Rwanda&apos;s certified marketplace</Eyebrow>

            <h1 className="text-display-xl font-extrabold text-content">
              <span className="block">Every car inspected.</span>
              <span className="block">Every seller verified.</span>
            </h1>

            <p className="mt-6 max-w-xl text-title-sm leading-relaxed text-content-secondary">
              Every listing is inspected, photographed and published by our own team —
              nothing goes live any other way.
            </p>

            <form
              action="/cars"
              method="get"
              role="search"
              className="mt-9 flex max-w-xl items-center gap-2 rounded-2xl border border-line bg-surface p-2 shadow-card transition-colors focus-within:border-content-muted"
            >
              <label htmlFor="hero-search" className="sr-only">
                Search certified cars
              </label>
              <span className="pl-3 text-content-muted">
                <Icon name="search" size={18} />
              </span>
              <input
                id="hero-search"
                name="q"
                type="search"
                autoComplete="off"
                placeholder="Toyota RAV4, automatic SUV, diesel…"
                className="h-11 min-w-0 flex-1 bg-transparent text-body text-content placeholder:text-content-muted"
              />
              <Button type="submit" size="sm">
                Search
              </Button>
            </form>

            <ul className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3">
              {TRUST_STRIP.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center gap-2 text-caption font-semibold text-content-secondary"
                >
                  <Icon name={item.icon} size={15} className="text-content-muted" />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
            {car ? <HeroCar car={car} /> : <HeroFallback />}
          </div>
        </div>
      </Container>
    </section>
  )
}

export default Hero
