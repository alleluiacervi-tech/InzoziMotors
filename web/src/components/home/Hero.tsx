import Image from 'next/image'
import Link from 'next/link'
import { Button, Icon } from '@/components/ui'
import type { IconName } from '@/components/ui'
import { CRITICAL_ITEMS, PASS_THRESHOLD, SCORE_MAX } from '@/lib/inspection-policy'
import { getServerT } from '@/lib/i18n/server'

// ─────────────────────────────────────────────────────────────────────────────
// The front door: one sentence, one search box, and a photograph of the thing
// we actually do.
//
// WHY THIS IS NO LONGER A DARK BAND.
//
// It opened on ink-900 for several passes. On a phone that is a near-black
// slab filling the first screen, and it fought the product: the palette in
// globals.css is called EDITORIAL SHOWROOM and is built warm and paper-like on
// purpose — "photography of a car sits better on bone than on cold white" — and
// then the one screen everybody sees threw all of that away and rendered on
// #14110F. It also forced the header into a second personality (white type
// floating on the photo) that existed for this page alone.
//
// So the hero is now the paper the rest of the site is printed on, and the ink
// is spent where ink earns its keep: ONE small card, the 150, sitting on the
// photograph's edge. A dark object on a light ground reads as deliberate. A
// dark ground with a light object on it reads as a different website.
//
// The lighting rig survives, in its daylight form — `ambient-paper` and
// `grid-paper` are the same two lamps and the same draughtsman's grid, driven
// off --content and the lamp tokens so they follow the theme instead of
// hardcoding a grey that only works in one of them.
//
// WHAT IS UNCHANGED, AND WHY IT SHOULD STAY THAT WAY.
//
// The original hero was a four-tab "command deck", 1391px tall on a 390px
// phone — 1.65 screens before anyone saw a car, on an inventory-first
// marketplace. That is gone and stays gone: search belongs here, filtering
// belongs on /cars, which has a full filter panel. Nothing on this screen asks
// a question another part of the page answers differently.
//
// The form is a real GET form. It works with JavaScript switched off and
// produces a shareable, indexable /cars?q= URL. An empty submit lands on /cars
// showing everything, so search and browse are the same door.
//
// WHY THIS PHOTOGRAPH. Every car marketplace in this market opens with a clean
// car. A car is what our competitors sell; an inspection is what we sell, and
// this frame is a real vehicle on a real alignment rack with the heads clamped
// to its wheels. It appears exactly once on the site — the closing band carries
// the Kigali lot instead (see FinalCta).
// ─────────────────────────────────────────────────────────────────────────────

const TRUST: { icon: IconName; key: string }[] = [
  { icon: 'shield-check', key: 'home.hero.trust.inspection' },
  { icon: 'user', key: 'home.hero.trust.sellers' },
  { icon: 'mail', key: 'home.hero.trust.contact' },
]

/** The three numbers, straight from the shared policy transcription. */
const METRICS: { value: number; key: string }[] = [
  { value: SCORE_MAX, key: 'home.hero.metric.points' },
  { value: PASS_THRESHOLD, key: 'home.hero.metric.threshold' },
  { value: CRITICAL_ITEMS, key: 'home.hero.metric.critical' },
]

export async function Hero() {
  const t = await getServerT()

  return (
    // A section with its own height, not a viewport-filling stage: the point of
    // this page is the inventory below, and the hero's job is to be crossed.
    // No negative margin any more — the header is opaque on every page now, so
    // there is nothing to slide underneath.
    <section className="ambient-paper grid-paper relative isolate overflow-hidden bg-surface-page">
      <div className="relative z-10 mx-auto grid w-full max-w-content items-center gap-10 px-5 pb-12 pt-10 sm:gap-12 sm:px-8 sm:pb-16 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,470px)] lg:gap-16 lg:pb-20 lg:pt-16 lg:px-12">
        {/* min-w-0 is load-bearing: a grid child defaults to min-width:auto, so
            without it a long string in the right-hand track widens it and
            pushes the headline off a 390px screen. That bug shipped once. */}
        <div className="min-w-0">
          {/* A live indicator rather than a decorative rule: this marketplace
              has stock in it right now, and a pulsing dot is the shortest way
              to say so. Full-strength brand red, which on paper is 5.6:1 — the
              tint that was needed on ink is not needed here. */}
          <p className="flex items-center gap-2.5 text-eyebrow font-bold uppercase text-content-muted">
            <span aria-hidden="true" className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="absolute inset-0 animate-halo rounded-full bg-brand motion-reduce:animate-none" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-brand" />
            </span>
            {t('home.hero.eyebrow')}
          </p>

          {/* display-xl is a real step on the type scale: clamp(2.75rem, 6vw,
              5rem) — 44px on a phone, 80px on a desktop. */}
          <h1 className="mt-4 text-display-xl font-extrabold text-balance text-content">
            {t('home.hero.title')}
          </h1>

          <p className="mt-5 max-w-xl text-title-sm leading-relaxed text-pretty text-content-secondary">
            {t('home.hero.subtitle')}
          </p>

          {/* The command bar. On paper it has to be a raised object or it
              disappears into the page, so it carries the site's float shadow
              and a hairline. focus-within lifts the whole bar, because that is
              the object the eye already treats as one control. */}
          <form
            action="/cars"
            method="get"
            role="search"
            className="mt-8 flex w-full max-w-xl items-center gap-2 rounded-2xl border border-line-soft bg-surface p-2 shadow-float transition-shadow duration-300 ease-brand focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30"
          >
            <label htmlFor="hero-search" className="sr-only">
              {t('home.hero.searchLabel')}
            </label>
            <span aria-hidden="true" className="pl-3 text-content-muted">
              <Icon name="search" size={18} />
            </span>
            <input
              id="hero-search"
              name="q"
              type="search"
              autoComplete="off"
              placeholder={t('home.hero.searchPlaceholder')}
              // The container owns the focus treatment. globals.css rings every
              // :focus-visible element, so suppressing it here needs ring-0 as
              // well as outline-none, or a second ring is drawn inside the first.
              className="h-11 min-w-0 flex-1 bg-transparent text-field text-content placeholder:text-content-muted focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-body"
            />
            <Button type="submit" size="sm">
              {t('home.hero.searchButton')}
            </Button>
          </form>

          {/* Evidence chips. The hairline between them is what makes three short
              phrases read as a specification rather than a sentence that lost
              its commas. */}
          <ul className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 sm:divide-x sm:divide-line">
            {TRUST.map((item, i) => (
              <li
                key={item.key}
                className={`flex items-center gap-2 text-caption font-semibold text-content-secondary ${
                  i > 0 ? 'sm:pl-6' : ''
                }`}
              >
                {/* Neutral, not green. The house rule keeps informational icons
                    off the accent so the one red thing on this screen is the
                    button people are meant to press. */}
                <Icon name={item.icon} size={15} className="shrink-0 text-content-muted" aria-hidden="true" />
                {item.key === 'home.hero.trust.sellers' ? (
                  <Link
                    href="/promise"
                    // -my-2/py-2: the row blockifies this anchor, so WCAG's
                    // inline-text exception stops applying and a 20px-tall link
                    // needs to become a real target. The negative margin keeps
                    // the row's height unchanged.
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

        {/* The photograph. Landscape crop on a phone so it costs one glance
            rather than half a screen; the full portrait frame from lg up. */}
        <figure className="relative m-0 min-w-0 animate-rise lg:animate-none">
          <div className="relative overflow-hidden rounded-3xl bg-surface-alt shadow-float ring-1 ring-line">
            <div className="relative aspect-[16/10] w-full sm:aspect-[2/1] lg:aspect-[4/5]">
              <Image
                src="/img/inspection-alignment.jpg"
                alt={t('home.hero.photoAlt')}
                fill
                priority
                sizes="(min-width: 1024px) 470px, 100vw"
                className="animate-kenburns object-cover object-[58%_42%] motion-reduce:animate-none lg:object-center"
              />
              {/* One gradient, at the foot, only where the caption sits. */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink-900/85 via-ink-900/30 to-transparent"
              />
            </div>

            {/* What the picture is, said plainly. A photograph on a trust page
                that does not say where it was taken is decoration. */}
            <figcaption className="absolute inset-x-5 bottom-5 flex items-start gap-2 text-micro font-semibold leading-snug text-white/80">
              <Icon name="camera" size={13} className="mt-0.5 shrink-0 text-white/50" aria-hidden="true" />
              <span className="min-w-0">{t('home.hero.photoCaption')}</span>
            </figcaption>
          </div>

          {/* THE NUMBER, and the one piece of ink on the page. A dark card
              breaking the frame's left edge on a bone ground is the strongest
              object here, which is right: it is the single most important fact
              on the site. Below lg it tucks under the image as a normal block —
              an overlapping card on a 390px screen is a clipped card. */}
          <div className="mt-4 flex items-center gap-4 rounded-2xl bg-ink-900 p-4 shadow-lift-ink sm:p-5 lg:absolute lg:-left-12 lg:bottom-14 lg:mt-0 lg:max-w-[17rem]">
            <span className="tnum text-display font-extrabold leading-none tracking-[-0.03em] text-white">
              {SCORE_MAX}
            </span>
            <span className="min-w-0 text-caption leading-snug text-white/75">
              {t('home.trust.fact.inspection')}
            </span>
          </div>
        </figure>
      </div>

      {/* The fold lands on a fact. Three numbers, a hairline band, no
          decoration — the hero's closing argument in the register the rest of
          the site uses for evidence. Hidden below sm, where it would cost a
          third of a screen to repeat what the card above already says. */}
      <div className="relative z-10 hidden border-t border-line sm:block">
        <dl className="mx-auto grid max-w-content grid-cols-3 divide-x divide-line px-5 sm:px-8 lg:px-12">
          {METRICS.map((metric) => (
            <div key={metric.key} className="px-4 py-5 first:pl-0 last:pr-0 lg:py-6">
              <dt className="text-caption text-content-muted">{t(metric.key)}</dt>
              <dd className="tnum mt-1 text-stat font-extrabold leading-none text-content">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

export default Hero
