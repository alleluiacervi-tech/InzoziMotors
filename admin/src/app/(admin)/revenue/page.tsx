'use client'

// ─────────────────────────────────────────────────────────────────────────────
// What the business actually earned.
//
// Five monetizable lines were built (walk-in inspection, report resale,
// rental listing subscription, sponsored placement, import order) and until
// now nowhere showed them together. This reads GET /admin/revenue, which
// only counts money actually collected — paid fees, non-voided rental
// subscriptions — never a due-but-unpaid fee and never a vehicle's asking
// price. That distinction matters here specifically: the marketplace
// analytics page carries the opposite disclaimer ("transaction value is
// never represented as Sawa revenue") because THAT page shows listing
// prices. This page shows the other thing — fees Sawa itself received.
//
// Sponsored placements and import-order margin have no line here yet: no fee
// is charged for a placement (the reassessment recommends holding that until
// there is an audience), and an import order's cost isn't split from its
// quote (a separate piece of work).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { BarChart, Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader, fmtMoney, fmtMoneyShort } from '@/components/ui'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5)) - 1] || ym} ’${ym.slice(2, 4)}`
const thisMonth = () => new Date().toISOString().slice(0, 7)

const TYPE_LABEL: Record<string, string> = {
  inspection: 'Walk-in inspections',
  report: 'Report resale',
  rental_subscription: 'Rental listing subscriptions',
  commission: 'Commission (retired)',
  certification: 'Certification (retired)',
  featured: 'Sponsored placement',
}

function HBar({ label, value, max, detail }: { label: string; value: number; max: number; detail?: string }) {
  const width = value ? Math.max(4, Math.round(value / Math.max(max, 1) * 100)) : 0
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-caption">
        <span className="font-semibold text-content-secondary">{label}</span>
        <span className="font-extrabold text-content">{fmtMoney(value, 'RWF')}{detail ? <span className="ml-1 font-medium text-content-muted">{detail}</span> : null}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-alt" role="img" aria-label={`${label}: ${fmtMoney(value, 'RWF')}`}>
        <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

export default function RevenuePage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.revenue>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const load = () => { setLoading(true); setError(null); api.revenue().then(setData).catch(setError).finally(() => setLoading(false)) }
  useEffect(load, [])
  if (loading) return <LoadingState rows={6} />
  if (error) return <ErrorState error={error} title="Couldn’t load revenue" onRetry={load} />

  const fees = data?.fees || []
  const subs = data?.rental_subscriptions || []
  const byType = data?.totals_by_type || []

  // Only RWF rows chart on one axis. A USD row (a historical fee, pre-0006)
  // would double-count if summed in blind — shown separately below instead.
  const rwfByMonth = new Map<string, number>()
  for (const row of fees) {
    if (row.currency !== 'RWF') continue
    rwfByMonth.set(row.month, (rwfByMonth.get(row.month) || 0) + Number(row.total))
  }
  for (const row of subs) {
    rwfByMonth.set(row.month, (rwfByMonth.get(row.month) || 0) + Number(row.total))
  }
  const months = [...rwfByMonth.keys()].sort().slice(-6)
  const monthly = months.map((m) => ({ label: monthLabel(m), value: rwfByMonth.get(m) || 0 }))

  const nonRwf = byType.filter((t) => t.currency !== 'RWF')
  const rwfTypes = byType.filter((t) => t.currency === 'RWF')
  const maxType = Math.max(...rwfTypes.map((t) => t.total), 1)

  const currentMonthTotal = rwfByMonth.get(thisMonth()) || 0
  const allTimeTotal = rwfTypes.reduce((sum, t) => sum + t.total, 0)
  const currentMonthCount = fees.filter((f) => f.month === thisMonth() && f.currency === 'RWF').reduce((n, f) => n + f.count, 0)
    + subs.filter((s) => s.month === thisMonth()).reduce((n, s) => n + s.count, 0)

  return (
    <div>
      <PageHeader
        title="Revenue"
        description="Fee revenue Sawa actually collected — walk-in inspections, report resale, rental listing subscriptions. Never a vehicle's asking or sale price."
        action={<button type="button" onClick={load} className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-label font-bold text-content hover:bg-surface-alt"><Icon name="refresh" size={16} />Refresh</button>}
      />

      <section className="mb-7 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-caption font-bold uppercase tracking-[0.08em] text-content-muted">This month</p>
          <p className="mt-3 text-[28px] font-extrabold leading-none tracking-[-0.03em] text-content">{fmtMoneyShort(currentMonthTotal, 'RWF')}</p>
          <p className="mt-2 text-caption text-content-muted">{currentMonthCount} paid transaction{currentMonthCount === 1 ? '' : 's'}</p>
        </Card>
        <Card className="p-5">
          <p className="text-caption font-bold uppercase tracking-[0.08em] text-content-muted">All time (RWF)</p>
          <p className="mt-3 text-[28px] font-extrabold leading-none tracking-[-0.03em] text-content">{fmtMoneyShort(allTimeTotal, 'RWF')}</p>
          <p className="mt-2 text-caption text-content-muted">Across every line below</p>
        </Card>
        <Card className="p-5">
          <p className="text-caption font-bold uppercase tracking-[0.08em] text-content-muted">Priced lines live</p>
          <p className="mt-3 text-[28px] font-extrabold leading-none tracking-[-0.03em] text-content">{rwfTypes.length}</p>
          <p className="mt-2 text-caption text-content-muted">Sponsored placement and import margin aren’t priced yet</p>
        </Card>
      </section>

      <section className="mb-7">
        <div className="mb-3">
          <h2 className="text-section font-extrabold text-content">Monthly total</h2>
          <p className="mt-0.5 text-caption text-content-muted">All RWF lines combined, last 6 months</p>
        </div>
        <Card className="p-5">
          <BarChart data={monthly} height={210} formatValue={(v) => fmtMoneyShort(v, 'RWF')} emptyLabel="No revenue recorded yet" />
        </Card>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-section font-extrabold text-content">By line</h2>
          <p className="mt-0.5 text-caption text-content-muted">All time, ranked</p>
        </div>
        <Card className="p-5">
          {rwfTypes.length ? (
            <div className="space-y-4">
              {rwfTypes.map((t) => (
                <HBar key={t.type} label={TYPE_LABEL[t.type] || t.type} value={t.total} max={maxType} detail={`· ${t.count} paid`} />
              ))}
            </div>
          ) : (
            <EmptyState icon="cash" title="No revenue recorded yet" description="Record a walk-in inspection fee, a report sale or a rental subscription to see it here." />
          )}
        </Card>
      </section>

      {nonRwf.length ? (
        <section className="mt-7">
          <div className="mb-3">
            <h2 className="text-section font-extrabold text-content">Other currencies</h2>
            <p className="mt-0.5 text-caption text-content-muted">Historical fees recorded before RWF became canonical — not summed with the figures above.</p>
          </div>
          <Card className="p-5">
            <div className="space-y-2">
              {nonRwf.map((t) => (
                <div key={`${t.type}:${t.currency}`} className="flex items-center justify-between text-label">
                  <span className="text-content-secondary">{TYPE_LABEL[t.type] || t.type}</span>
                  <span className="font-extrabold text-content">{fmtMoney(t.total, t.currency)} <span className="font-medium text-content-muted">· {t.count} paid</span></span>
                </div>
              ))}
            </div>
          </Card>
        </section>
      ) : null}
    </div>
  )
}
