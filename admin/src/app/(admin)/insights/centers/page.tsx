'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Insights · Center performance. Throughput, utilisation, pass rate, no-shows
// and fee revenue per inspection center, side by side. Capacity and opening
// are edited on Center setup (/centers); this page only reads.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import { api, type InsightsCenters, type RangeQuery } from '@/lib/api'
import { fmtMoney, Icon } from '@/components/ui'
import { BarList, ChartFrame, DataTable } from '@/components/charts'
import { InsightsShell, Windowed, useWindowed } from '@/components/InsightsShell'
import { fmtInt } from '@/lib/format'

const pct = (v: number | null) => (v == null ? '—' : `${v}%`)

export default function CenterPerformancePage() {
  return (
    <InsightsShell
      title="Center performance"
      description={() => 'Inspections completed, how full each center ran, pass rates, no-shows and the fees each center collected, for the window.'}
      actions={() => (
        <Link href="/centers" className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-label font-bold text-content transition-colors hover:bg-surface-alt">
          <Icon name="settings" size={15} />Center setup
        </Link>
      )}
    >
      {({ range }) => <Centers range={range} />}
    </InsightsShell>
  )
}

function Centers({ range }: { range: RangeQuery }) {
  const state = useWindowed(api.insightsCenters, range)
  return <Windowed state={state}>{(d) => <Body d={d} />}</Windowed>
}

function Body({ d }: { d: InsightsCenters }) {
  if (!d.centers.length) {
    return <p className="rounded-2xl border border-line-soft bg-surface p-10 text-center text-label text-content-muted shadow-card">No inspection centers yet. Add one on Center setup.</p>
  }
  return (
    <>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <ChartFrame title="Inspections completed" hint={`${d.working_days} working days in the window (Monday to Saturday)`}
          table={{ columns: [{ key: 'center', label: 'Center' }, { key: 'completed', label: 'Completed', align: 'right' }, { key: 'capacity', label: 'Capacity', align: 'right', format: (v) => (v == null ? '—' : fmtInt(v)) }], rows: d.centers }}>
          <BarList items={d.centers.map((c) => ({
            key: c.center, label: c.center, value: c.completed,
            note: c.capacity ? `${pct(c.utilisation)} of ${fmtInt(c.capacity)} slots used` : 'No daily capacity set',
          }))} limit={8} moreLabel="more centers" />
        </ChartFrame>
        <ChartFrame title="Fees collected by center" hint="Paid walk-in inspection and report fees tied to the center’s inspections"
          table={{ columns: [{ key: 'center', label: 'Center' }, { key: 'revenue_rwf', label: 'Collected', align: 'right', format: (v) => fmtMoney(v, 'RWF') }], rows: d.centers }}>
          <BarList items={[...d.centers].sort((a, b) => b.revenue_rwf - a.revenue_rwf).map((c) => ({ key: c.center, label: c.center, value: c.revenue_rwf }))}
            format={(v) => fmtMoney(v, 'RWF')} tone={2} emptyLabel="No fees collected in this window" limit={8} moreLabel="more centers" />
        </ChartFrame>
      </div>

      <section aria-labelledby="centers-table" className="mt-5 min-w-0 rounded-2xl border border-line-soft bg-surface p-5 shadow-card">
        <h2 id="centers-table" className="mb-4 text-label font-extrabold text-content">Side by side</h2>
        <DataTable caption="Center performance" rows={d.centers} columns={[
          { key: 'center', label: 'Center', format: (v, r) => <span>{v}{r.area ? <span className="ml-1.5 font-normal text-content-muted">{r.area}</span> : null}{r.active === false ? <span className="ml-1.5 font-normal text-content-muted">(closed)</span> : null}</span> },
          { key: 'completed', label: 'Completed', align: 'right', format: (v) => fmtInt(v) },
          { key: 'utilisation', label: 'Utilisation', align: 'right', format: (v) => pct(v) },
          { key: 'pass_rate', label: 'Pass rate', align: 'right', format: (v) => pct(v) },
          { key: 'avg_score', label: 'Avg score', align: 'right' },
          { key: 'no_shows', label: 'No-shows', align: 'right', format: (v) => fmtInt(v) },
          { key: 'upcoming', label: 'Booked ahead', align: 'right', format: (v) => fmtInt(v) },
          { key: 'revenue_rwf', label: 'Fees', align: 'right', format: (v) => fmtMoney(v, 'RWF') },
        ]} />
        <p className="mt-3 text-caption text-content-muted">A no-show is a booking in the window whose day has passed and which is still marked scheduled. Booked ahead counts bookings from today on.</p>
      </section>
    </>
  )
}
