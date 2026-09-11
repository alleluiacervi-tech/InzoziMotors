import Link from 'next/link'
import { Container, Icon, Section, SectionHeading } from '@/components/ui'
import { getServerT } from '@/lib/i18n/server'

// ─────────────────────────────────────────────────────────────────────────────
// The 150 points, as the 150 points.
//
// This section and the four-pillar grid above it used to make the same
// argument twice across three and a half phone screens, in prose, using
// specifics nobody outside the building could check: "Hunter Optical Rack
// #02", "Hunter computerized 4-wheel laser alignment", "a comprehensive
// 2-hour physical diagnostic", "Cryptographic Odometer Audit", "Algorithmic
// mileage regression analysis". Some of the underlying work is real — the
// checklist genuinely grades an OBD scan (el06), wheel alignment behaviour
// (b24) and brake-rotor wear (b05) — but the equipment names and the two-hour
// figure were not in the repository anywhere, and the system's own integrity
// check flags an inspection as too fast under TWENTY minutes. Publishing a
// number the software never verifies is how a trust product loses trust.
//
// What replaced all of it is the checklist's own shape. Every figure below is
// transcribed from backend/src/lib/inspection-policy.js, which throws at
// require-time if its own counts do not reconcile — so these numbers cannot
// drift from the inspection a mechanic actually performs. Seven categories,
// their real weights, and the 49 items that are marked critical, meaning one
// failure blocks publication at any score.
//
// It is also roughly a quarter of the words, because a table of true numbers
// needs no adjectives. That is the trade this whole pass is built on.
//
// KEEPING IT HONEST: if the checklist changes, these counts must change with
// it. They are duplicated here rather than fetched because the homepage must
// render during a backend outage — but backend/test/inspection-policy.test.js
// pins the totals, so a change there fails CI and sends someone to this file.
// ─────────────────────────────────────────────────────────────────────────────

/** Transcribed from inspection-policy.js CATEGORIES. 150 points, 49 critical. */
const CATEGORIES = [
  { key: 'engine', points: 25, critical: 4 },
  { key: 'brakes', points: 25, critical: 14 },
  { key: 'body', points: 20, critical: 7 },
  { key: 'interior', points: 20, critical: 0 },
  { key: 'electronics', points: 20, critical: 8 },
  { key: 'tyres', points: 15, critical: 8 },
  { key: 'documentation', points: 25, critical: 8 },
] as const

const TOTAL = CATEGORIES.reduce((n, c) => n + c.points, 0)
const CRITICAL = CATEGORIES.reduce((n, c) => n + c.critical, 0)

export async function InspectionShowcase() {
  const t = await getServerT()

  return (
    <Section tone="surface">
      <Container>
        <SectionHeading
          eyebrow={t('home.inspection.eyebrow')}
          title={t('home.inspection.title')}
          description={t('home.inspection.description')}
          layout="split"
        />

        {/* A ledger, not six cards. Each row carries its own weight as a bar,
            so the shape of the inspection is readable before any of it is
            read: brakes and documentation are the heaviest sections, interior
            is the only one with nothing critical in it. */}
        <ul className="mt-12">
          {CATEGORIES.map((cat) => (
            <li
              key={cat.key}
              className="grid grid-cols-[1fr_auto] items-center gap-x-5 gap-y-2 border-t border-line-soft py-4 sm:grid-cols-[minmax(0,15rem)_1fr_auto]"
            >
              <h3 className="min-w-0 text-body font-bold text-content">
                {t(`home.inspection.category.${cat.key}`)}
              </h3>

              {/* Weight as a proportion of the whole check. Neutral ink, not
                  the accent: this is information, and red is for prices and
                  actions. */}
              <div
                className="order-3 col-span-2 flex items-center gap-3 sm:order-none sm:col-span-1"
                aria-hidden
              >
                <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-surface-alt">
                  <div
                    className="h-full rounded-pill bg-ink-700"
                    style={{ width: `${(cat.points / 25) * 100}%` }}
                  />
                </div>
              </div>

              <p className="whitespace-nowrap text-right text-caption tabular-nums text-content-secondary">
                <span className="font-bold text-content">{cat.points}</span>
                {cat.critical > 0 ? (
                  <>
                    {' · '}
                    <span className="text-warning-text">
                      {t('home.inspection.criticalCount', { count: cat.critical })}
                    </span>
                  </>
                ) : null}
              </p>
            </li>
          ))}
        </ul>

        {/* The two rules that make the score mean something. Stated once. */}
        <div className="mt-8 grid gap-x-10 gap-y-4 border-t-2 border-ink-900 pt-6 sm:grid-cols-2">
          <p className="text-caption leading-relaxed text-content-secondary">
            {t('home.inspection.ruleScore', { total: TOTAL, threshold: 105 })}
          </p>
          <p className="text-caption leading-relaxed text-content-secondary">
            {t('home.inspection.ruleCritical', { critical: CRITICAL })}
          </p>
        </div>

        <p className="mt-8 text-body">
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-1.5 font-bold text-brand hover:underline"
          >
            {t('home.inspection.link')}
            <Icon name="arrow-right" size={16} />
          </Link>
        </p>
      </Container>
    </Section>
  )
}

export default InspectionShowcase
