import Link from 'next/link'
import { Container, Icon, Section } from '@/components/ui'
import type { IconName } from '@/components/ui'
import { CATEGORIES, CRITICAL_ITEMS, PASS_THRESHOLD, TOTAL_POINTS } from '@/lib/inspection-policy'
import { getServerT } from '@/lib/i18n/server'

// ─────────────────────────────────────────────────────────────────────────────
// The case for the inspection, made once.
//
// This used to be three sections arguing one point over three and a half phone
// screens: "Evidence before contact" (four controls), "What the score is made
// of" (the category ledger) and "How it works" (five steps). Now the controls
// sit beside the ledger they govern, and the step-by-step lives on
// /how-it-works where there is room for it.
//
// The ledger's bars are the checklist's real weights, from the same policy
// transcription the hero certificate's score ring uses
// (lib/inspection-policy.ts — which throws at import if the numbers stop
// reconciling, so a bad edit fails the build rather than the homepage).
// ─────────────────────────────────────────────────────────────────────────────

const CONTROLS: { icon: IconName; key: string }[] = [
  { icon: 'shield-check', key: 'independent' },
  { icon: 'document', key: 'evidence' },
  { icon: 'eye', key: 'publication' },
  { icon: 'user', key: 'direct' },
]

const HEAVIEST = Math.max(...CATEGORIES.map((c) => c.points))

export async function InspectionStory() {
  const t = await getServerT()

  return (
    <Section tone="surface">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="min-w-0 lg:col-span-5">
            <h2 className="text-headline font-extrabold text-content">{t('home.trust.title')}</h2>
            <p className="mt-4 max-w-prose text-title-sm leading-relaxed text-content-secondary">
              {t('home.trust.description')}
            </p>

            <ul className="mt-8 space-y-6">
              {CONTROLS.map((c) => (
                <li key={c.key} className="grid grid-cols-[auto_1fr] gap-x-4">
                  <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-full bg-surface-alt text-content-secondary">
                    <Icon name={c.icon} size={17} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-body font-extrabold text-content">
                      {t(`home.trust.ledger.${c.key}.claim`)}
                    </h3>
                    <p className="mt-1 text-caption leading-relaxed text-content-secondary">
                      {t(`home.trust.ledger.${c.key}.proof`)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-body">
              <Link href="/promise" className="-my-2 inline-flex items-center gap-1.5 py-2 font-bold text-brand hover:underline">
                {t('home.trust.link')}
                <Icon name="arrow-right" size={16} aria-hidden="true" />
              </Link>
              <Link href="/how-it-works" className="-my-2 inline-flex items-center gap-1.5 py-2 font-bold text-content hover:underline">
                {t('home.howItWorks.link')}
              </Link>
            </p>
          </div>

          <div className="min-w-0 lg:col-span-7">
            <h3 className="text-title font-extrabold text-content">{t('home.inspection.title')}</h3>
            <p className="mt-2 text-body text-content-secondary">{t('home.inspection.description')}</p>

            <ul className="mt-6">
              {CATEGORIES.map((cat) => (
                <li
                  key={cat.key}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-5 gap-y-2 border-t border-line-soft py-3.5 sm:grid-cols-[minmax(0,13rem)_1fr_auto]"
                >
                  <span className="min-w-0 text-body font-bold text-content">
                    {t(`home.inspection.category.${cat.key}`)}
                  </span>
                  <span className="order-3 col-span-2 h-1.5 overflow-hidden rounded-pill bg-surface-alt sm:order-none sm:col-span-1" aria-hidden="true">
                    <span className="block h-full rounded-pill bg-content-secondary" style={{ width: `${(cat.points / HEAVIEST) * 100}%` }} />
                  </span>
                  <span className="whitespace-nowrap text-right text-caption tabular-nums text-content-secondary">
                    <span className="font-bold text-content">{cat.points}</span>
                    {cat.critical > 0 ? (
                      <span className="text-warning-text">
                        {', '}
                        {t('home.inspection.criticalCount', { count: cat.critical })}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 grid gap-x-10 gap-y-3 border-t-2 border-content pt-5 sm:grid-cols-2">
              <p className="text-caption leading-relaxed text-content-secondary">
                {t('home.inspection.ruleScore', { total: TOTAL_POINTS, threshold: PASS_THRESHOLD })}
              </p>
              <p className="text-caption leading-relaxed text-content-secondary">
                {t('home.inspection.ruleCritical', { critical: CRITICAL_ITEMS })}
              </p>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  )
}

export default InspectionStory
