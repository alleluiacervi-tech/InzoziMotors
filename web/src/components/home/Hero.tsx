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
// WHAT THIS REPLACED, AND WHY.
//
// The original hero was a four-tab "command deck" over a full-bleed car photo,
// 1391px tall on a 390px phone — 1.65 screens before anyone saw a car, on an
// inventory-first marketplace. The deck is gone and stays gone: search belongs
// here, filtering belongs on /cars, which already has a full filter panel.
// Sell and Import live in the header and the closing band. Nothing on this
// screen asks a question that another part of the page answers differently.
//
// WHAT THIS PASS CHANGED, AND WHY.
//
// The layout was right and the surface was flat. A #14110F panel with a
// photograph pasted on it reads as an unstyled background rather than a
// decision, so the ink now carries a lighting rig — two soft lamps, a
// draughtsman's grid that fades out before the fold, and 3.5% film grain that
// kills the banding large dark gradients show on 8-bit panels. All three are
// utilities in globals.css, shared with every other dark surface, so this is
// the site's lighting, not the hero's.
//
// Three substantive additions:
//
//   1. THE EVIDENCE CARD. The "150" was a figcaption sitting inside the photo's
//      bottom gradient, competing with the picture. It is now a panel that
//      breaks the frame's left edge on large screens — the single most
//      important number on the page, given its own surface and its own light.
//
//   2. THE METRIC STRIP. 150 points, 105 to publish, 49 critical. Those three
//      numbers ARE the product, and they were previously only stated two
//      sections down in a paragraph. They close the hero as a hairline band,
//      so the fold lands on a fact rather than on a gradient.
//
//   3. THE SEARCH FIELD READS IN DARK MODE. It was `bg-white text-content`.
//      In dark mode `--content` resolves to #F5F1EC — near-white ink on a
//      hardcoded white field, so anything typed into the homepage search was
//      invisible. It is `bg-surface` now, which is white in light and the card
//      ink in dark, and the field is legible in both.
//
// WHY THIS PHOTOGRAPH. Every car marketplace in this market opens with a clean
// car. A car is what our competitors sell; an inspection is what we sell, and
// this frame is a real vehicle on a real alignment rack with the heads clamped
// to its wheels. It argues the whole product without a sentence. It sits BESIDE
// the type rather than behind it, so nothing needs a stack of darkening
// gradients to stay legible — and it is now the ONLY place on the site this
// photograph appears. The closing band used to run the same frame a second
// time; it carries the lot at Kigali instead (see FinalCta).
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
    // -mt pulls it under the transparent header (Header.tsx overlay mode).
    // `isolate` gives the lighting layers a stacking context of their own, so
    // the -z-10 backdrops can never slide under the section's own background.
    <section className="ambient-ink blueprint-grid grain relative isolate -mt-[var(--header-h)] overflow-hidden bg-ink-900">
      <div className="relative z-10 mx-auto grid w-full max-w-content items-center gap-9 px-5 pb-12 pt-[calc(var(--header-h)+2.25rem)] sm:gap-10 sm:px-8 sm:pb-16 sm:pt-[calc(var(--header-h)+3rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-16 lg:px-12 lg:pb-20">
        {/* min-w-0 is load-bearing: a grid child defaults to min-width:auto, so
            without it a long car title in the old right-hand rail widened the
            track and pushed the headline off a 390px screen. That bug shipped
            for months. */}
        <div className="min-w-0 text-white">
          {/* The eyebrow earns a live indicator rather than a decorative rule:
              this marketplace has stock in it right now, and a pulsing dot is
              the shortest way to say so. brand-light, not brand — Signal Red
              on near-black is 1.9:1 and reads as a smudge; the tint clears the
              3:1 non-text threshold in both themes. */}
          <p className="flex items-center gap-2.5 text-eyebrow font-bold uppercase text-white/70">
            <span aria-hidden="true" className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="absolute inset-0 animate-halo rounded-full bg-brand-light motion-reduce:animate-none" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-brand-light" />
            </span>
            {t('home.hero.eyebrow')}
          </p>

          {/* display-xl is a real step on the type scale: clamp(2.75rem, 6vw,
              5rem), so 44px on a phone and 80px on a desktop. */}
          <h1 className="mt-4 text-display-xl font-extrabold text-balance">
            {t('home.hero.title')}
          </h1>

          <p className="mt-5 max-w-xl text-title-sm leading-relaxed text-pretty text-white/75">
            {t('home.hero.subtitle')}
          </p>

          {/* The command bar. focus-within lifts the whole bar, not just the
              input, so the focused target is the object the eye already treats
              as one control — and the ring is drawn on the container because a
              ring on a borderless input inside a padded shell looks broken. */}
          <form
            action="/cars"
            method="get"
            role="search"
            className="mt-8 flex w-full max-w-xl items-center gap-2 rounded-2xl bg-surface p-2 shadow-lift-ink ring-1 ring-white/10 transition-shadow duration-300 ease-brand focus-within:ring-2 focus-within:ring-brand"
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
              // The container owns the focus treatment. globals.css puts a
              // brand ring on EVERY :focus-visible element, so suppressing it
              // here needs ring-0 as well as outline-none — outline alone left
              // a second ring drawn inside the first, which is what a focused
              // field looked like before this line.
              className="h-11 min-w-0 flex-1 bg-transparent text-field text-content placeholder:text-content-muted focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-body"
            />
            <Button type="submit" size="sm">
              {t('home.hero.searchButton')}
            </Button>
          </form>

          {/* Evidence chips, not a bullet list: each is a discrete claim, and
              the hairline between them is what makes three short phrases read
              as a specification rather than a sentence that lost its commas. */}
          <ul className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 sm:divide-x sm:divide-white/15">
            {TRUST.map((item, i) => (
              <li
                key={item.key}
                className={`flex items-center gap-2 text-caption font-semibold text-white/85 ${
                  i > 0 ? 'sm:pl-6' : ''
                }`}
              >
                {/* Neutral, not green. The house rule keeps informational icons
                    off the accent so the one red thing on this screen is the
                    button people are meant to press. */}
                <Icon name={item.icon} size={15} className="shrink-0 text-white/55" aria-hidden="true" />
                {item.key === 'home.hero.trust.sellers' ? (
                  <Link
                    href="/promise"
                    // -my-2/py-2: the chip row blockifies this anchor (the
                    // li is a flex container), so WCAG's inline-text exception
                    // stops applying and a 20px-tall link becomes a real
                    // target. The negative margin keeps the row's height.
                    className="-my-2 py-2 underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white"
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
          <div className="relative overflow-hidden rounded-3xl bg-ink-800 shadow-lift-ink ring-1 ring-white/10">
            <div className="relative aspect-[16/10] w-full sm:aspect-[2/1] lg:aspect-[4/5]">
              <Image
                src="/img/inspection-alignment.jpg"
                alt={t('home.hero.photoAlt')}
                fill
                priority
                sizes="(min-width: 1024px) 460px, 100vw"
                className="animate-kenburns object-cover object-[58%_42%] motion-reduce:animate-none lg:object-center"
              />
              {/* One gradient, at the foot, only where the caption sits. */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink-900/90 via-ink-900/40 to-transparent"
              />
            </div>

            {/* What the picture is, said plainly. A photograph on a trust page
                that does not say where it was taken is decoration. */}
            {/* Wraps rather than truncates. On a 390px screen the single-line
                version lost the word "Kigali", which is the half of the
                sentence that makes the claim local. */}
            <figcaption className="absolute inset-x-5 bottom-5 flex items-start gap-2 text-micro font-semibold leading-snug text-white/75">
              <Icon name="camera" size={13} className="mt-0.5 shrink-0 text-white/45" aria-hidden="true" />
              <span className="min-w-0">{t('home.hero.photoCaption')}</span>
            </figcaption>
          </div>

          {/* THE NUMBER. Its own panel, breaking the frame on large screens so
              it belongs to the page rather than to the picture. Below lg it
              tucks under the image as a normal block — an overlapping card on
              a 390px screen is a clipped card. */}
          <div className="mt-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-ink-800/95 p-4 shadow-lift-ink backdrop-blur-md sm:p-5 lg:absolute lg:-left-12 lg:bottom-16 lg:mt-0 lg:max-w-[17rem]">
            <span className="tnum text-display font-extrabold leading-none tracking-[-0.03em] text-white">
              {SCORE_MAX}
            </span>
            <span className="min-w-0 text-caption leading-snug text-white/75">
              {t('home.trust.fact.inspection')}
            </span>
          </div>
        </figure>
      </div>

      {/* The fold lands on a fact. Three numbers, a hairline band, and no
          decoration — the hero's closing argument, in the register the rest of
          the site uses for evidence. Hidden below sm, where it would cost a
          third of a screen to say what the evidence card above already says. */}
      <div className="relative z-10 hidden border-t border-white/10 sm:block">
        <dl className="mx-auto grid max-w-content grid-cols-3 divide-x divide-white/10 px-5 sm:px-8 lg:px-12">
          {METRICS.map((metric) => (
            <div key={metric.key} className="px-4 py-5 first:pl-0 last:pr-0 lg:py-6">
              <dt className="text-caption text-white/55">{t(metric.key)}</dt>
              <dd className="tnum mt-1 text-stat font-extrabold leading-none text-white">
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
