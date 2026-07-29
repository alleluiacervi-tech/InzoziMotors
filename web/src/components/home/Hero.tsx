import { Button, Icon } from '@/components/ui'
import type { IconName } from '@/components/ui'
import { HERO_SLIDES } from '@/lib/imagery'
import { HeroRotator, type HeroSlide } from './HeroRotator'

// The hero is a full-viewport photographic stage — one idea per viewport, the
// image doing the persuading, one quiet CTA. By decision, the stage always
// runs the curated brand photography (lib/imagery.ts): the hero is the brand
// moment, and the inventory gets its own showcase directly below (FeaturedCars,
// BrowseEntry), where real listings carry real prices.
//
// Search follows immediately in a light band: AVATR sells six objects and
// needs no search; a marketplace's first action IS search, so it gets the
// second viewport-stop rather than competing with the photograph.

const TRUST_STRIP: { icon: IconName; label: string }[] = [
  { icon: 'shield-check', label: '150-point inspection' },
  { icon: 'refresh', label: '7-day drive-it guarantee' },
  { icon: 'cash', label: 'Buyers pay nothing' },
]

const SLIDES: HeroSlide[] = HERO_SLIDES.map((slide) => ({
  image: slide.image,
  alt: slide.alt,
  eyebrow: "Rwanda's certified marketplace",
  headline: slide.headline,
  caption: slide.caption,
  href: slide.href,
  cta: slide.cta,
}))

export function Hero() {
  return (
    <>
      <HeroRotator slides={SLIDES} />

      {/* The marketplace's first action, in its own light band directly under
          the stage. A real GET form: works without JavaScript, produces a
          shareable, indexable URL. */}
      <section className="border-b border-line-soft bg-surface">
        <div className="mx-auto w-full max-w-content px-5 py-8 sm:px-8 lg:px-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <form
              action="/cars"
              method="get"
              role="search"
              className="flex w-full max-w-xl items-center gap-2 rounded-2xl border border-line bg-surface p-2 shadow-card transition-colors focus-within:border-content-muted"
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

            <ul className="flex flex-wrap items-center gap-x-7 gap-y-3">
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
        </div>
      </section>
    </>
  )
}

export default Hero
