import Image from 'next/image'
import Link from 'next/link'
import { Container, Icon } from '@/components/ui'
import { CheckRuler, type RulerGroup } from '@/components/brand/CheckRuler'
import { CATEGORIES, CRITICAL_ITEMS, PASS_THRESHOLD, SCORE_MAX } from '@/lib/inspection-policy'
import { getServerT } from '@/lib/i18n/server'

// ─────────────────────────────────────────────────────────────────────────────
// The standard, drawn at full width: all 150 checklist items as one ruler on
// ink, the 49 critical ones standing taller. The hero showed one car's result;
// this is the rule every car is measured against, and it replaces a bar chart
// of seven categories that said the same thing less exactly.
//
// The one ink band on the page.
// ─────────────────────────────────────────────────────────────────────────────

export async function Standard({ id, showLink = true }: { id?: string; showLink?: boolean } = {}) {
  const t = await getServerT()

  const groups: RulerGroup[] = CATEGORIES.map((c) => ({
    key: c.key,
    label: t(`home.inspection.category.${c.key}`),
    max: c.points,
    critical: c.critical,
    meta: c.critical
      ? t('home.land.metaCritical', { points: c.points, critical: c.critical })
      : t('home.land.metaPoints', { points: c.points }),
  }))

  const stats = [
    { figure: String(SCORE_MAX), key: 'statItems' },
    { figure: String(PASS_THRESHOLD), key: 'statPass' },
    { figure: String(CRITICAL_ITEMS), key: 'statCritical' },
  ]

  // The homepage's one dark band: the ruler, three numbers and the
  // inspection photograph. The photo is licensed stock
  // (public/img/CREDITS.md), so its alt text describes what it shows and never
  // calls it a Sawa centre or inspector. No lamps or grain, no list of
  // controls (those live on How Sawa works).
  return (
    <section id={id} className="scroll-mt-[var(--header-h)] bg-ink-900 text-white" style={{ paddingBlock: 'var(--space-section)' }}>
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="min-w-0 lg:col-span-7">
            <h2 className="max-w-[16ch] text-display font-black text-balance">{t('home.land.standardTitle')}</h2>
            <p className="mt-6 max-w-[38rem] text-title-sm leading-relaxed text-pretty text-white/70">
              {t('home.land.standardBody', { critical: CRITICAL_ITEMS })}
            </p>

            <dl className="mt-10 grid grid-cols-3 gap-4 sm:gap-8">
              {stats.map((s) => (
                <div key={s.key} className="min-w-0 border-t border-white/15 pt-4">
                  <dt className="sr-only">{t(`home.land.${s.key}`)}</dt>
                  <dd>
                    <span className="tnum block text-display font-black leading-none">{s.figure}</span>
                    <span className="mt-2 block text-caption leading-snug text-white/60">{t(`home.land.${s.key}`)}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <figure className="relative m-0 min-w-0 lg:col-span-5">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl ring-1 ring-white/10 lg:aspect-[4/5]">
              <Image
                src="/img/inspector-wheel-arch.jpg"
                alt={t('home.land.photoInspectorAlt')}
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover object-[50%_40%]"
              />
            </div>
          </figure>
        </div>

        <div className="mt-14 lg:mt-16">
          <CheckRuler
            groups={groups}
            mode="standard"
            tone="ink"
            height={96}
            labels
            label={t('home.land.rulerStandard', { critical: CRITICAL_ITEMS })}
          />
          {/* The category names do not fit under a 15-tick group on a phone,
              so below md they are a legend instead. */}
          <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 md:hidden">
            {groups.map((g) => (
              <li key={g.key} className="min-w-0 text-caption">
                <span className="block font-bold text-white">{g.label}</span>
                <span className="block tabular-nums text-white/60">{g.meta}</span>
              </li>
            ))}
          </ul>
        </div>

        {showLink ? (
        <p className="mt-12">
          <Link
            href="/how-it-works#standard"
            className="group -my-2 inline-flex items-center gap-1.5 py-2 text-body font-bold text-white underline decoration-white/30 decoration-2 underline-offset-[6px] transition-colors hover:decoration-white"
          >
            {t('home.inspection.link')}
            <Icon name="arrow-right" size={16} aria-hidden="true" className="transition-transform duration-300 ease-brand group-hover:translate-x-0.5" />
          </Link>
        </p>
        ) : null}
      </Container>
    </section>
  )
}

export default Standard
