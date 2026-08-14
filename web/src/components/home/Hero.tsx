import Image from 'next/image'
import Link from 'next/link'
import { Button, Icon } from '@/components/ui'
import type { IconName } from '@/components/ui'
import { HERO_SLIDES } from '@/lib/imagery'

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

const TRUST_STRIP: { icon: IconName; label: string }[] = [
  { icon: 'shield-check', label: '150-point inspection' },
  { icon: 'refresh', label: '7-day drive-it guarantee' },
  { icon: 'cash', label: 'Buyers pay nothing' },
]

// One slide. The first entry of the curated set is the buy-side statement,
// which is the right single message for a marketplace's front door.
const STAGE = HERO_SLIDES[0]

const JOURNEYS: { label: string; href: string; icon: IconName; active?: boolean }[] = [
  { label: 'Buy', href: '/cars', icon: 'search', active: true },
  { label: 'Rent', href: '/rentals', icon: 'key' },
  { label: 'Sell', href: '/sell', icon: 'car' },
  { label: 'Car tools', href: '/tools', icon: 'gauge' },
]

export function Hero() {
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

      <div className="relative mx-auto w-full max-w-content px-5 pb-14 pt-32 sm:px-8 sm:pb-16 lg:px-12">
        <div className="max-w-2xl text-white">
          <p
            className="mb-3 animate-fade-up text-eyebrow font-bold uppercase text-white/85"
            style={{ animationDelay: '80ms' }}
          >
            Rwanda&rsquo;s trusted mobility marketplace
          </p>
          <h1 className="animate-fade-up text-display-xl font-extrabold" style={{ animationDelay: '160ms' }}>
            The right car. The confidence to move.
          </h1>
          <p
            className="mt-4 max-w-xl animate-fade-up text-title-sm leading-relaxed text-white/80"
            style={{ animationDelay: '260ms' }}
          >
            Buy certified, rent inspected, or sell with our team handling every important step.
          </p>

          <nav
            aria-label="Choose what you want to do"
            className="mt-8 flex w-full max-w-xl gap-1 rounded-2xl border border-white/15 bg-ink-900/35 p-1.5 backdrop-blur-md"
          >
            {JOURNEYS.map((journey) => (
              <Link
                key={journey.label}
                href={journey.href}
                aria-current={journey.active ? 'page' : undefined}
                className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-caption font-bold transition-all sm:px-3 ${
                  journey.active
                    ? 'bg-white text-content shadow-card'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon name={journey.icon} size={15} />
                <span className="truncate">{journey.label}</span>
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

          <ul
            className="mt-6 flex animate-fade-up flex-wrap items-center gap-x-7 gap-y-3"
            style={{ animationDelay: '560ms' }}
          >
            {TRUST_STRIP.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-2 text-caption font-semibold text-white/85"
              >
                <Icon name={item.icon} size={15} className="text-white/70" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export default Hero
