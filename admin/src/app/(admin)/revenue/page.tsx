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
// Sponsored placements have no line here on purpose: no fee is charged for a
// placement yet — the reassessment recommends holding that line until there
// is an audience worth selling. Import-order margin lives on each order's
// own page (/imports/:id), not here: quote and cost move on different
// timelines per order, not as a monthly aggregate.
//
// "Needs attention" below is the one collection gap this database can
// actually detect: a completed walk-in inspection with no live fee row. A
// fee this table has no row for AT ALL leaves no trace by definition — see
// GET /admin/revenue's own comment on why that's the only checkable gap.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api, downloadUrl } from '@/lib/api'
import { BarChart, Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader, fmtMoney, fmtMoneyShort } from '@/components/ui'
import { fmtDate, fmtMonth } from '@/lib/format'
import { BarList, DownloadLink, KpiTile } from '@/components/charts'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5)) - 1] || ym} ’${ym.slice(2, 4)}`
// The Kigali calendar month — the boundary GET /admin/revenue groups by, so a
// fee collected at 01:00 on the 1st is this month here too.
const thisMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kigali', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7)
const lastMonth = () => {
  const [y, m] = thisMonth().split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

const TYPE_LABEL: Record<string, string> = {
  inspection: 'Walk-in inspections',
  report: 'Report resale',
  rental_subscription: 'Rental listing subscriptions',
  commission: 'Commission (retired)',
  certification: 'Certification (retired)',
  featured: 'Sponsored placement',
}

export default function RevenuePage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.revenue>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [showAllGaps, setShowAllGaps] = useState(false)
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
  const months = [...rwfByMonth.keys()].sort().slice(-12)
  const monthly = months.map((m) => ({ label: monthLabel(m), value: rwfByMonth.get(m) || 0 }))

  const nonRwf = byType.filter((t) => t.currency !== 'RWF')
  const rwfTypes = byType.filter((t) => t.currency === 'RWF')

  const currentMonthTotal = rwfByMonth.get(thisMonth()) || 0
  const lastMonthTotal = rwfByMonth.get(lastMonth()) || 0
  const allTimeTotal = rwfTypes.reduce((sum, t) => sum + t.total, 0)
  const currentMonthCount = fees.filter((f) => f.month === thisMonth() && f.currency === 'RWF').reduce((n, f) => n + f.count, 0)
    + subs.filter((s) => s.month === thisMonth()).reduce((n, s) => n + s.count, 0)
  const gaps = data?.gaps?.standalone_inspections_missing_fee || []

  return (
    <div>
      <PageHeader
        title="Revenue"
        description="Fee revenue Sawa actually collected — walk-in inspections, report resale, rental listing subscriptions. Never a vehicle's asking or sale price."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <DownloadLink href={downloadUrl.revenueStatement(lastMonth())} icon="document">{fmtMonth(`${lastMonth()}-01`)} statement (PDF)</DownloadLink>
            <Link href="/insights/reports#revenue" className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-label font-bold text-content hover:bg-surface-alt"><Icon name="file-spreadsheet" size={15} />Export CSV</Link>
            <button type="button" onClick={load} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-label font-bold text-content hover:bg-surface-alt"><Icon name="refresh" size={15} />Refresh</button>
          </div>
        }
      />

      <section className="mb-7 grid gap-4 sm:grid-cols-3">
        <KpiTile label="This month so far" value={fmtMoneyShort(currentMonthTotal, 'RWF')} current={currentMonthTotal} periodLabel="" compare={false}
          hint={`${fmtMoney(currentMonthTotal, 'RWF')} from ${currentMonthCount} paid entr${currentMonthCount === 1 ? 'y' : 'ies'}`} />
        <KpiTile label={`Last month (${fmtMonth(`${lastMonth()}-01`)})`} value={fmtMoneyShort(lastMonthTotal, 'RWF')} current={lastMonthTotal} periodLabel="" compare={false}
          hint={fmtMoney(lastMonthTotal, 'RWF')} />
        <KpiTile label="All time" value={fmtMoneyShort(allTimeTotal, 'RWF')} current={allTimeTotal} periodLabel="" compare={false}
          hint={`${rwfTypes.length} priced line${rwfTypes.length === 1 ? '' : 's'} · in RWF`} />
      </section>

      {gaps.length ? (
        <section className="mb-7">
          <div className="mb-3">
            <h2 className="text-section font-extrabold text-content">Needs attention</h2>
            <p className="mt-0.5 text-caption text-content-muted">
              {gaps.length} completed walk-in inspection{gaps.length === 1 ? '' : 's'} with no fee recorded. The customer has their report either way — this is bookkeeping catching up, not a hold on anyone.
            </p>
          </div>
          <Card className="p-2">
            <ul>
              {(showAllGaps ? gaps : gaps.slice(0, 5)).map((g) => (
                <li key={g.id} className="border-b border-line-soft last:border-0">
                  <Link
                    href={`/inspections/${g.id}`}
                    className="flex items-center justify-between gap-3 p-3 hover:bg-surface-alt"
                  >
                    <div>
                      <p className="font-bold text-content">{[g.vehicle_year, g.vehicle_make, g.vehicle_model].filter(Boolean).join(' ') || 'Walk-in inspection'}</p>
                      <p className="text-caption text-content-muted">{g.customer_name || 'No customer name'} · completed {fmtDate(g.completed_at)}</p>
                    </div>
                    <span className="whitespace-nowrap rounded-lg bg-warning-tint px-3 py-1.5 text-caption font-bold text-warning-text">Record fee →</span>
                  </Link>
                </li>
              ))}
            </ul>
            {gaps.length > 5 ? (
              <button type="button" onClick={() => setShowAllGaps((v) => !v)} aria-expanded={showAllGaps}
                className="m-1 rounded-lg px-3 py-2 text-label font-bold text-content-secondary hover:bg-surface-alt">
                {showAllGaps ? 'Show the first five' : `Show all ${gaps.length}`}
              </button>
            ) : null}
          </Card>
        </section>
      ) : null}

      <section className="mb-7">
        <div className="mb-3">
          <h2 className="text-section font-extrabold text-content">Monthly total</h2>
          <p className="mt-0.5 text-caption text-content-muted">All RWF lines combined, last 12 months with revenue. Each bar has the month before it beside it.</p>
        </div>
        <Card className="p-5">
          <BarChart data={monthly} height={230} compare seriesLabel="Collected" compareLabel="Month before" formatValue={(v) => fmtMoneyShort(v, 'RWF')} emptyLabel="No revenue recorded yet" />
        </Card>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-section font-extrabold text-content">By line</h2>
          <p className="mt-0.5 text-caption text-content-muted">All time, ranked</p>
        </div>
        <Card className="p-5">
          {rwfTypes.length ? (
            <BarList
              items={rwfTypes.map((t) => ({ key: t.type, label: TYPE_LABEL[t.type] || t.type, value: t.total, note: `${t.count} paid entr${t.count === 1 ? 'y' : 'ies'}` }))}
              format={(v) => fmtMoney(v, 'RWF')}
            />
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
