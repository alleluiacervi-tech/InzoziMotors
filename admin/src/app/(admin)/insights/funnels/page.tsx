'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Insights · Funnels. Cohorts, not snapshots: everything that STARTED in the
// window, followed to the furthest stage it has reached by today. A step can
// therefore never exceed the one before it — the flaw behind the old
// "164% of drafts reach approval", which divided two stage counts taken at
// the same moment.
// ─────────────────────────────────────────────────────────────────────────────

import { api, type FunnelStep, type RangeQuery } from '@/lib/api'
import { ChartFrame, Funnel } from '@/components/charts'
import { InsightsShell, Windowed, useWindowed, windowText } from '@/components/InsightsShell'
import { fmtInt } from '@/lib/format'

const table = (steps: FunnelStep[]) => ({
  columns: [
    { key: 'label', label: 'Stage' },
    { key: 'count', label: 'Reached', align: 'right' as const, format: (v: number) => fmtInt(v) },
    { key: 'of_start', label: 'Of the cohort', align: 'right' as const, format: (v: number | null) => (v == null ? '—' : `${v}%`) },
    { key: 'from_previous', label: 'Of the step before', align: 'right' as const, format: (v: number | null) => (v == null ? '—' : `${v}%`) },
    { key: 'median_days', label: 'Median days', align: 'right' as const, format: (v: number | null) => (v == null ? '—' : v) },
  ],
  rows: steps,
})

export default function FunnelsPage() {
  return (
    <InsightsShell
      title="Funnels"
      description={() => 'Everything that started in the window, followed to the furthest stage it has reached by today. The step that loses the most is named under each funnel.'}
    >
      {({ range }) => <Funnels range={range} />}
    </InsightsShell>
  )
}

function Funnels({ range }: { range: RangeQuery }) {
  const state = useWindowed(api.insightsFunnels, range)
  return (
    <Windowed state={state}>
      {(d) => (
        <div className="grid gap-5">
          <ChartFrame
            title="Sellers: submission to sale"
            hint={`${fmtInt(d.seller.steps[0]?.count ?? 0)} submissions received ${windowText(d.range)}${d.seller.rejected ? ` · ${fmtInt(d.seller.rejected)} rejected at review` : ''}. Median days are counted from submission (sold: from publication).`}
            table={table(d.seller.steps)}
          >
            <Funnel steps={d.seller.steps} unit="submissions" />
          </ChartFrame>
          <div className="grid gap-5 xl:grid-cols-2">
            <ChartFrame
              title="Buyers: sign-up to contact"
              hint={`${fmtInt(d.buyers.steps[0]?.count ?? 0)} buyer accounts created ${windowText(d.range)}. Website visits are not measured yet, so the funnel starts at sign-up.`}
              table={table(d.buyers.steps)}
            >
              <Funnel steps={d.buyers.steps} unit="buyer sign-ups" />
            </ChartFrame>
            <ChartFrame
              title="Imports: enquiry to delivery"
              hint={`${fmtInt(d.imports.steps[0]?.count ?? 0)} import enquiries opened ${windowText(d.range)}. A cancelled order still counts for how far it got.`}
              table={table(d.imports.steps)}
            >
              <Funnel steps={d.imports.steps} unit="import enquiries" />
            </ChartFrame>
          </div>
        </div>
      )}
    </Windowed>
  )
}
