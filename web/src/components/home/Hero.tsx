import Image from 'next/image'
import { Button, Icon } from '@/components/ui'
import type { IconName } from '@/components/ui'
import { HERO_SLIDES } from '@/lib/imagery'

// The hero is a full-viewport photographic stage — ONE idea, the image doing
// the persuading, one primary action.
//
// It used to be a three-slide rotator. Cut deliberately: a rotating hero is a
// measured anti-pattern (slide 2 of any carousel is the least-read content on
// the web), the arrows-and-dots chrome sat in the thumb zone on phones, and the
// two other messages already have whole pages ("Sell" and "Rentals" are one tap
// away in the nav). One strong statement, said once, reads as confidence;
// three rotating ones read as indecision. Dropping the client component also
// removes ~4KB of JS from the most important paint on the site.
//
// The primary CTA is a real button now, not an underlined text link. The old
// "quiet CTA" register looked restrained on a desktop mock, but in practice the
// loudest element on the page became the header's app pill — the site whispered
// its product and shouted its vapor. Browse is the conversion; it gets the red.
//
// Search follows immediately in a light band: a marketplace's first action IS
// search, so it gets the second viewport-stop rather than competing with the
// photograph.

const TRUST_STRIP: { icon: IconName; label: string }[] = [
  { icon: 'shield-check', label: '150-point inspection' },
  { icon: 'refresh', label: '7-day drive-it guarantee' },
  { icon: 'cash', label: 'Buyers pay nothing' },
]

// One slide. The first entry of the curated set is the buy-side statement,
// which is the right single message for a marketplace's front door.
const STAGE = HERO_SLIDES[0]

export function Hero() {
  return (
    <>
      <section className="relative flex min-h-[calc(100svh-var(--header-h))] items-end overflow-hidden bg-ink-900">
        {STAGE.image ? (
          <Image
            src={STAGE.image}
            alt={STAGE.alt}
            fill
            priority
            sizes="100vw"
            className="object-cover"
            {...(typeof STAGE.image !== 'string' ? { placeholder: 'blur' as const } : {})}
          />
        ) : null}
        {/* Legibility gradient — the text sits on ink, not on the photo. The
            middle stop is deliberately darker than the old rotator's: the
            eyebrow used to float over the image's light sky and fail contrast. */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/90 via-ink-900/45 to-ink-900/15" />

        <div className="relative mx-auto w-full max-w-content px-5 pb-16 pt-32 sm:px-8 sm:pb-20 lg:px-12">
          <div className="max-w-2xl text-white">
            <p className="mb-3 text-eyebrow font-bold uppercase text-white/85">
              Rwanda&rsquo;s certified marketplace
            </p>
            <h1 className="text-display-xl font-extrabold">{STAGE.headline}</h1>
            <p className="mt-4 max-w-xl text-title-sm leading-relaxed text-white/80">
              {STAGE.caption}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button href="/cars" size="lg">
                Browse certified cars
              </Button>
              <Button href="/sell" variant="inverse" size="lg">
                Sell your car
              </Button>
            </div>
          </div>
        </div>
      </section>

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
              <Button type="submit" size="sm" variant="dark">
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
