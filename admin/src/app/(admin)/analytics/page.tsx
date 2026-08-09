'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, PageHeader, EmptyState, BarChart, fmtMoneyShort } from '@/components/ui'

// Same funnel order + labels as the dashboard — a funnel reads in pipeline
// order (top of funnel first), never sorted by count.
const FUNNEL_ORDER = ['under_review', 'pending', 'scheduled', 'inspecting', 'inspected', 'live', 'sold', 'rejected']
const FUNNEL_LABELS: Record<string, string> = {
  under_review: 'Under review', pending: 'Pending', scheduled: 'Inspection booked',
  inspecting: 'Being inspected', inspected: 'Inspected', live: 'Live', sold: 'Sold', rejected: 'Rejected',
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthLabel = (ym: string) => {
  const m = parseInt(ym.slice(5), 10)
  return `${MONTH_NAMES[m - 1] ?? ym} ’${ym.slice(2, 4)}`
}

function HBar({ label, value, max, detail }: { label: string; value: number; max: number; detail?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-semibold text-content-secondary">{label}</span>
        <span className="font-bold text-content">
          {value}
          {detail ? <span className="ml-1 font-medium text-content-muted">{detail}</span> : null}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
        <div
          className="h-full rounded-full bg-gray-500"
          style={{ width: `${Math.max(3, Math.round((value / Math.max(max, 1)) * 100))}%` }}
        />
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.analytics()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-sm text-content-muted">Loading analytics…</div>
  if (error) {
    return (
      <Card>
        <EmptyState icon="alert" title="Couldn’t load analytics" description={error} />
      </Card>
    )
  }

  const { topMakes = [], pipelineFunnel = [], centers = [], monthlySales = [] } = data || {}

  const funnelRaw = new Map(pipelineFunnel.map((f: any) => [f.status, Number(f.count) || 0]))
  const funnel = FUNNEL_ORDER.filter((st) => funnelRaw.has(st)).map((st) => ({
    label: FUNNEL_LABELS[st] ?? st,
    value: funnelRaw.get(st) as number,
  }))
  const funnelMax = Math.max(...funnel.map((f) => f.value), 1)

  const makes = topMakes.map((m: any) => ({ label: m.make, value: Number(m.count) || 0 }))
  const makesMax = Math.max(...makes.map((m: { value: number }) => m.value), 1)

  const monthlyCount = monthlySales.map((m: any) => ({ label: monthLabel(m.month), value: Number(m.total_sold) || 0 }))
  // Named by the API — /admin/analytics groups by currency and returns the
  // dominant one, so the chart never plots francs added to dollars.
  const salesCurrency: string = data?.salesCurrency || 'RWF'
  const monthlyValue = monthlySales.map((m: any) => ({ label: monthLabel(m.month), value: Number(m.total_value) || 0 }))

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="How the marketplace and the inspection pipeline are performing."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Monthly sales — cars */}
        <Card className="p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-content">Cars sold per month</h2>
            <span className="text-xs text-content-muted">last 6 months</span>
          </div>
          <BarChart data={monthlyCount} height={150} emptyLabel="No completed sales yet" />
        </Card>

        {/* Monthly sales — value */}
        <Card className="p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-content">Sales value per month</h2>
            <span className="text-xs text-content-muted">USD</span>
          </div>
          <BarChart data={monthlyValue} height={150} formatValue={(v) => fmtMoneyShort(v, salesCurrency)} emptyLabel="No completed sales yet" />
        </Card>

        {/* Pipeline funnel */}
        <Card className="p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-content">Submission pipeline</h2>
            <span className="text-xs text-content-muted">all time</span>
          </div>
          {funnel.length === 0 ? (
            <EmptyState icon="document" title="No submissions yet" description="Seller submissions appear here as they enter the pipeline." />
          ) : (
            <div className="space-y-3">
              {funnel.map((f) => (
                <HBar key={f.label} label={f.label} value={f.value} max={funnelMax} />
              ))}
            </div>
          )}
        </Card>

        {/* Top makes */}
        <Card className="p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-content">Top makes</h2>
            <span className="text-xs text-content-muted">live + sold</span>
          </div>
          {makes.length === 0 ? (
            <EmptyState icon="car" title="No listings yet" description="Makes rank here once cars are live on the marketplace." />
          ) : (
            <div className="space-y-3">
              {makes.map((m: { label: string; value: number }) => (
                <HBar key={m.label} label={m.label} value={m.value} max={makesMax} />
              ))}
            </div>
          )}
        </Card>

        {/* Inspection centers */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-content">Inspection centers</h2>
            <span className="text-xs text-content-muted">scheduled vs completed</span>
          </div>
          {centers.length === 0 ? (
            <EmptyState
              icon="location"
              title="No inspections booked yet"
              description="Center workload shows here once sellers book inspection appointments."
            />
          ) : (
            <div className="space-y-3">
              {centers.map((c: any) => (
                <HBar
                  key={c.center}
                  label={c.center}
                  value={Number(c.scheduled) || 0}
                  max={Math.max(...centers.map((x: any) => Number(x.scheduled) || 0), 1)}
                  detail={`· ${Number(c.completed) || 0} completed`}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
