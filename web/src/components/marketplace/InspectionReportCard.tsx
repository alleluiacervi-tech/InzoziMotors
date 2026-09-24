import { Badge, Card, Icon } from '@/components/ui'
import { formatDate, inspectionGrade } from '@/lib/business'
import type { InspectionReport } from '@/lib/types'
import { getServerT } from '@/lib/i18n/server'
import { SCORE_MAX, summariseReport } from './inspection'

// ─────────────────────────────────────────────────────────────────────────────
// The 150-point report, published in full.
//
// Publishing the flags is the whole point of the exercise: a report that only
// ever showed green would be marketing. Every item the mechanic marked flag or
// fail is listed by name, above the fold of the card, before the score has
// finished being admired.
// ─────────────────────────────────────────────────────────────────────────────

const GRADE_TONE = {
  A: { bar: 'bg-success', text: 'text-success' },
  B: { bar: 'bg-success', text: 'text-success' },
  C: { bar: 'bg-warning', text: 'text-warning-text' },
  D: { bar: 'bg-danger', text: 'text-danger' },
} as const

export async function InspectionReportCard({ report }: { report: InspectionReport | null }) {
  const summary = summariseReport(report)
  if (!summary || !report) return null
  const t = await getServerT()

  const grade = inspectionGrade(summary.score)
  const tone = GRADE_TONE[grade]
  const percent = Math.max(0, Math.min(100, Math.round((summary.score / SCORE_MAX) * 100)))

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line-soft p-5 sm:p-6">
        <p className="text-caption font-bold text-brand">{t('cars.report.eyebrow')}</p>
        <h2 className="mt-2 text-title font-extrabold text-content">
          {t('cars.report.title')}
        </h2>

        <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
          <p className="flex items-baseline gap-1.5">
            <span className={`text-4xl font-extrabold tracking-[-0.03em] ${tone.text}`}>
              {summary.score}
            </span>
            <span className="text-lg font-bold text-content-muted">/ {SCORE_MAX}</span>
          </p>
          <Badge tone={grade === 'A' || grade === 'B' ? 'success' : grade === 'C' ? 'warning' : 'danger'}>
            {t('cars.report.grade', { grade })}
          </Badge>
          <p className="text-caption text-content-secondary">
            {t('cars.report.checksRecorded', { count: summary.checked })}
            {report.completed_at ? ` · ${formatDate(report.completed_at)}` : ''}
          </p>
        </div>

        <div
          className="mt-4 h-2 overflow-hidden rounded-pill bg-surface-alt"
          role="img"
          aria-label={t('cars.report.scoreAria', { score: summary.score, max: SCORE_MAX })}
        >
          <div className={`h-full rounded-pill ${tone.bar}`} style={{ width: `${percent}%` }} />
        </div>

        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-caption font-semibold">
          <span className="inline-flex items-center gap-1.5 text-success">
            <Icon name="check-circle" size={14} />
            {t('cars.report.passed', { count: summary.pass })}
          </span>
          <span className="inline-flex items-center gap-1.5 text-warning-text">
            <Icon name="alert" size={14} />
            {t('cars.report.flagged', { count: summary.flag })}
          </span>
          <span className="inline-flex items-center gap-1.5 text-danger">
            <Icon name="close-circle" size={14} />
            {t('cars.report.failed', { count: summary.fail })}
          </span>
        </p>
      </div>

      <ul className="divide-y divide-line-soft">
        {summary.categories.map((category) => {
          const width = Math.max(0, Math.min(100, Math.round((category.earned / category.weight) * 100)))
          return (
            <li key={category.id} className="px-5 py-4 sm:px-6">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-body font-bold text-content">{category.name}</p>
                <p className="shrink-0 text-caption font-bold text-content-secondary">
                  {category.earned}
                  <span className="font-semibold text-content-muted"> / {category.weight}</span>
                </p>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-surface-alt">
                <div
                  className={`h-full rounded-pill ${
                    category.fail ? 'bg-danger' : category.flag ? 'bg-warning' : 'bg-success'
                  }`}
                  style={{ width: `${width}%` }}
                />
              </div>

              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-micro font-semibold">
                <span className="text-success">{t('cars.report.passed', { count: category.pass })}</span>
                {category.flag ? (
                  <span className="text-warning-text">{t('cars.report.flagged', { count: category.flag })}</span>
                ) : null}
                {category.fail ? <span className="text-danger">{t('cars.report.failed', { count: category.fail })}</span> : null}
              </p>

              {category.issues.length ? (
                <ul className="mt-3 space-y-1.5">
                  {category.issues.map((issue) => (
                    <li
                      key={issue.item}
                      className="flex items-start gap-2 text-caption leading-relaxed text-content-secondary"
                    >
                      <Icon
                        name={issue.verdict === 'fail' ? 'close-circle' : 'alert'}
                        size={14}
                        className={`mt-0.5 ${issue.verdict === 'fail' ? 'text-danger' : 'text-warning-text'}`}
                      />
                      <span>
                        {issue.item}
                        <span className="text-content-muted">
                          {issue.verdict === 'fail' ? t('cars.report.itemFailed') : t('cars.report.itemFlagged')}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ul>

      {report.notes ? (
        <div className="border-t border-line-soft bg-surface-alt px-5 py-4 sm:px-6">
          <p className="text-micro font-bold text-content-muted">
            {t('cars.report.notesTitle')}
          </p>
          <p className="mt-1.5 whitespace-pre-line text-caption leading-relaxed text-content-secondary">
            {report.notes}
          </p>
        </div>
      ) : null}

      <p className="border-t border-line-soft px-5 py-4 text-micro leading-relaxed text-content-muted sm:px-6">
        {t('cars.report.footer')}
      </p>
    </Card>
  )
}

export default InspectionReportCard
