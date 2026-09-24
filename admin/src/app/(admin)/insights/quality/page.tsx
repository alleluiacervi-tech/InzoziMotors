'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Insights · Inspection quality. The 150-point inspection is the product's
// evidence, so its own quality is measured: how scores spread, which checklist
// items fail most, and how each inspector scores. A very narrow score spread
// across many inspections is worth a look — real cars vary.
// ─────────────────────────────────────────────────────────────────────────────

import { api, type InsightsQuality, type RangeQuery } from '@/lib/api'
import { BarList, ChartFrame, ColumnChart, DataTable, KpiTile } from '@/components/charts'
import { InsightsShell, Windowed, useWindowed } from '@/components/InsightsShell'
import { fmtInt } from '@/lib/format'

export default function QualityPage() {
  return (
    <InsightsShell
      title="Inspection quality"
      description={() => 'Scores, the checklist items that fail most, and each inspector’s pattern, for inspections completed in the window.'}
    >
      {({ range }) => <Quality range={range} />}
    </InsightsShell>
  )
}

function Quality({ range }: { range: RangeQuery }) {
  const state = useWindowed(api.insightsQuality, range)
  return <Windowed state={state}>{(d) => <Body d={d} />}</Windowed>
}

function Body({ d }: { d: InsightsQuality }) {
  const kpi = (label: string, value: string, hint?: string, href?: string) => (
    <KpiTile label={label} value={value} current={0} periodLabel="" compare={false} hint={hint} href={href} />
  )
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {kpi('Inspections completed', fmtInt(d.completed), undefined, '/inspections')}
        {kpi('Pass rate', d.pass_rate == null ? '—' : `${d.pass_rate}%`, `Passing needs ${d.publish_threshold} of ${d.score_max} and no critical failure`)}
        {kpi('Average score', d.avg_score == null ? '—' : `${d.avg_score} / ${d.score_max}`)}
        {kpi('With a critical failure', fmtInt(d.with_critical), `${fmtInt(d.submissions_rejected)} submissions were rejected at review in the same window`)}
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[2fr_3fr]">
        <ChartFrame title="Score distribution" hint={`Out of ${d.score_max}. A listing can only be published at ${d.publish_threshold} or above.`}
          table={{ columns: [{ key: 'label', label: 'Score' }, { key: 'count', label: 'Inspections', align: 'right' }], rows: d.distribution }}>
          <ColumnChart label="Completed inspections by score band" height={220}
            items={d.distribution.map((b) => ({ key: b.key, label: b.label, value: b.count }))}
            flag={{ keys: ['below'], text: `Below ${d.publish_threshold}: cannot be published` }} />
        </ChartFrame>
        <ChartFrame title="Checklist items that fail most" hint="Across completed inspections in the window"
          table={{
            columns: [
              { key: 'label', label: 'Item' },
              { key: 'category', label: 'Category' },
              { key: 'critical', label: 'Critical', format: (v) => (v ? 'Yes' : 'No') },
              { key: 'fails', label: 'Failed', align: 'right' },
              { key: 'flags', label: 'Flagged', align: 'right' },
            ],
            rows: d.top_issues,
          }}>
          <BarList
            items={d.top_issues.map((r) => ({
              key: r.item_id,
              label: r.label,
              value: r.fails,
              note: `${r.category ?? 'Uncategorised'}${r.critical ? ' · critical item: one failure blocks publication' : ''}${r.flags ? ` · flagged ${r.flags}×` : ''}`,
            }))}
            tone={1}
            emptyLabel="No checklist item failed in this window"
          />
        </ChartFrame>
      </div>

      <section aria-labelledby="inspectors-title" className="mt-5 min-w-0 rounded-2xl border border-line-soft bg-surface p-5 shadow-card">
        <h2 id="inspectors-title" className="text-label font-extrabold text-content">By inspector</h2>
        <p className="mb-4 mt-0.5 max-w-3xl text-caption text-content-muted">
          Spread is the standard deviation of an inspector’s scores. Real cars vary, so a spread close to zero across many inspections is worth a second look at those records.
        </p>
        {d.inspectors.length ? (
          <DataTable caption="Inspection results by inspector" rows={d.inspectors} columns={[
            { key: 'name', label: 'Inspector' },
            { key: 'completed', label: 'Completed', align: 'right', format: (v) => fmtInt(v) },
            { key: 'avg_score', label: 'Average score', align: 'right' },
            { key: 'score_spread', label: 'Spread', align: 'right' },
            { key: 'pass_rate', label: 'Pass rate', align: 'right', format: (v) => (v == null ? '—' : `${v}%`) },
          ]} />
        ) : <p className="py-8 text-center text-label text-content-muted">No inspections were completed in this window.</p>}
      </section>
    </>
  )
}
