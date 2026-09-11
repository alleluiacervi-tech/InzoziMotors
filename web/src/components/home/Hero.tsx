import Image from 'next/image'
import Link from 'next/link'
import { Button, Icon } from '@/components/ui'
import type { IconName } from '@/components/ui'
import { getServerT } from '@/lib/i18n/server'

// ─────────────────────────────────────────────────────────────────────────────
// The front door: one sentence, one search box, and a photograph of the thing
// we actually do.
//
// WHAT THIS REPLACED, AND WHY.
//
// The previous hero was a four-tab "command deck" over a full-bleed car photo:
// a Buy tab with its own body-type and budget menus, a VIN tab, a Sell panel,
// an Import panel, plus a four-way photograph switcher above it. Measured on a
// 390px phone it stood 1391px tall — 1.65 screens — so nobody reached a car
// without scrolling, on an inventory-first marketplace. Its two extra menus
// also duplicated the ones further down the page, which is how the homepage
// ended up asking the same question three times with three different answers.
//
// So the deck is gone. Search belongs here; filtering belongs on /cars, which
// already has a full filter panel. Sell and Import are in the header and the
// closing band. The VIN tab pushed to /vehicles/lookup, a page this site does
// not have — it returned 404 in production — and it is removed rather than
// linked to nothing; the lookup engine is real and lives on the API, so giving
// it a proper results page is its own piece of work, not a hero tab.
//
// WHY THIS PHOTOGRAPH. Every car marketplace in this market opens with a clean
// car. A car is what our competitors sell; an inspection is what we sell, and
// this frame is a real vehicle on a real alignment rack with the heads clamped
// to its wheels. It argues the whole product without a sentence, which is why
// the copy above it could shrink to two lines. It sits BESIDE the type on a
// solid ink ground rather than behind it, so nothing needs a stack of
// darkening gradients to stay legible.
//
// It is also portrait, and that is a feature here: a tall frame next to a
// column of type composes, where the same image stretched full-bleed would
// crop to a fender.
//
// The form is a real GET form. It works with JavaScript switched off and
// produces a shareable, indexable /cars?q= URL. An empty submit lands on /cars
// showing everything, so search and browse are the same door.
// ─────────────────────────────────────────────────────────────────────────────

const TRUST: { icon: IconName; key: string }[] = [
  { icon: 'shield-check', key: 'home.hero.trust.inspection' },
  { icon: 'user', key: 'home.hero.trust.sellers' },
  { icon: 'mail', key: 'home.hero.trust.contact' },
]

export async function Hero() {
  const t = await getServerT()

  return (
    // A section with its own height, not a viewport-filling stage: the point of
    // this page is the inventory below, and the hero's job is to be crossed.
    // -mt pulls it under the transparent header (Header.tsx overlay mode).
    <section className="relative -mt-[var(--header-h)] overflow-hidden bg-ink-900">
      <div className="mx-auto grid w-full max-w-content items-center gap-9 px-5 pb-10 pt-[calc(var(--header-h)+2rem)] sm:gap-10 sm:px-8 sm:pb-14 sm:pt-[calc(var(--header-h)+2.5rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-16 lg:px-12 lg:pb-16">
        {/* min-w-0 is load-bearing: a grid child defaults to min-width:auto, so
            without it a long car title in the old right-hand rail widened the
            track and pushed the headline off a 390px screen. That bug shipped
            for months. */}
        <div className="min-w-0 text-white">
          <p className="text-eyebrow font-bold uppercase text-white/70">
            {t('home.hero.eyebrow')}
          </p>

          {/* display-xl is a real step on the type scale: clamp(2.75rem, 6vw,
              5rem), so 44px on a phone and 80px on a desktop. The deck asked
              for `text-display-lg`, which was never defined, emitted no CSS at
              all, and left this headline rendering at 16px on a phone —
              smaller than its own subtitle. */}
          <h1 className="mt-3 text-display-xl font-extrabold text-balance">
            {t('home.hero.title')}
          </h1>

          <p className="mt-4 max-w-xl text-title-sm leading-relaxed text-white/80">
            {t('home.hero.subtitle')}
          </p>

          <form
            action="/cars"
            method="get"
            role="search"
            className="mt-8 flex w-full max-w-xl items-center gap-2 rounded-2xl bg-white p-2 shadow-float"
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
              className="h-11 min-w-0 flex-1 bg-transparent text-field sm:text-body text-content placeholder:text-content-muted"
            />
            <Button type="submit" size="sm">
              {t('home.hero.searchButton')}
            </Button>
          </form>

          <ul className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3">
            {TRUST.map((item) => (
              <li
                key={item.key}
                className="flex items-center gap-2 text-caption font-semibold text-white/85"
              >
                {/* Neutral, not green. The house rule keeps informational icons
                    off the accent so the one red thing on this screen is the
                    button people are meant to press. */}
                <Icon name={item.icon} size={15} className="text-white/55" />
                {item.key === 'home.hero.trust.sellers' ? (
                  <Link href="/promise" className="underline decoration-white/25 underline-offset-4 hover:decoration-white">
                    {t(item.key)}
                  </Link>
                ) : (
                  t(item.key)
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* The photograph. Landscape crop on a phone so it costs one glance
            rather than half a screen; the full portrait frame from lg up. */}
        <figure className="relative m-0 min-w-0 overflow-hidden rounded-2xl bg-ink-800">
          <div className="relative aspect-[16/10] w-full sm:aspect-[2/1] lg:aspect-[4/5]">
            <Image
              src="/img/inspection-alignment.jpg"
              alt={t('home.hero.photoAlt')}
              fill
              priority
              sizes="(min-width: 1024px) 420px, 100vw"
              className="object-cover object-[58%_42%] lg:object-center"
            />
            {/* One short gradient at the foot, only where the plate sits. */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink-900/85 to-transparent" />
          </div>

          {/* The number, not a paragraph. This is the whole argument for the
              inspection in two lines, and both halves are already translated:
              150 is SCORE_MAX in inspection-policy.js, and the label is the
              string the retired stat band used. */}
          <figcaption className="absolute inset-x-4 bottom-4 flex items-baseline gap-2.5 text-white">
            <span className="text-display font-extrabold leading-none tracking-[-0.03em] tabular-nums">
              150
            </span>
            <span className="text-caption leading-snug text-white/80">
              {t('home.trust.fact.inspection')}
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

export default Hero
