'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { BarChart, Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader, fmtMoneyShort, type IconName } from '@/components/ui'

const FUNNEL_ORDER = ['draft', 'under_review', 'scheduled', 'inspecting', 'approved', 'live', 'paused', 'sold', 'rejected', 'archived']
const FUNNEL_LABELS: Record<string, string> = { draft: 'Draft', under_review: 'Under review', scheduled: 'Inspection booked', inspecting: 'Being inspected', approved: 'Approved', live: 'Live', paused: 'Paused', sold: 'Marked sold', rejected: 'Rejected', archived: 'Archived' }
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5)) - 1] || ym} ’${ym.slice(2, 4)}`

function Metric({ label, value, detail, icon, tone = 'neutral', href }: { label: string; value: string; detail: string; icon: IconName; tone?: 'neutral'|'good'|'warn'|'danger'; href?: string }) {
  const colors = { neutral: 'bg-surface-alt text-content-secondary', good: 'bg-success-tint text-success-text', warn: 'bg-warning-tint text-warning-text', danger: 'bg-danger-tint text-danger-strong' }
  const body = <div className="p-5"><div className="flex items-start justify-between gap-3"><p className="text-caption font-bold uppercase tracking-[0.08em] text-content-muted">{label}</p><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors[tone]}`}><Icon name={icon} size={17} /></span></div><p className="mt-3 text-[28px] font-extrabold leading-none tracking-[-0.03em] text-content">{value}</p><p className="mt-2 text-caption leading-relaxed text-content-muted">{detail}</p></div>
  return href ? <Link href={href} className="rounded-2xl border border-line-soft bg-surface shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-card-lg">{body}</Link> : <Card>{body}</Card>
}

function HBar({ label, value, max, detail }: { label: string; value: number; max: number; detail?: string }) {
  const width = value ? Math.max(4, Math.round(value / Math.max(max, 1) * 100)) : 0
  return <div><div className="mb-1.5 flex items-baseline justify-between gap-3 text-caption"><span className="font-semibold text-content-secondary">{label}</span><span className="font-extrabold text-content">{value}{detail ? <span className="ml-1 font-medium text-content-muted">{detail}</span> : null}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-surface-alt" role="img" aria-label={`${label}: ${value}`}><div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${width}%` }} /></div></div>
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const load = () => { setLoading(true); setError(null); api.analytics().then(setData).catch(setError).finally(() => setLoading(false)) }
  useEffect(load, [])
  if (loading) return <LoadingState rows={8} />
  if (error) return <ErrorState error={error} title="Couldn’t load analytics" onRetry={load} />

  const health = data?.health || {}
  const total = Number(health.total_submissions) || 0
  const reached = Number(health.reached_market) || 0
  const rejected = Number(health.rejected) || 0
  const conversion = total ? Math.round(reached / total * 100) : 0
  const rejectionRate = total ? Math.round(rejected / total * 100) : 0
  const overdue = Number(health.overdue_reviews) || 0
  const awaiting = Number(health.awaiting_review) || 0
  const avgHours = Number(health.avg_review_hours) || 0
  const salesCurrency = data?.salesCurrency || 'RWF'
  const monthly = (data?.monthlySales || []).map((m: any) => ({ label: monthLabel(m.month), value: Number(m.total_value) || 0, sold: Number(m.total_sold) || 0 }))
  const current = monthly.at(-1)
  const previous = monthly.at(-2)
  const trend = previous?.value ? Math.round(((current?.value || 0) - previous.value) / previous.value * 100) : null
  const funnelRaw = new Map((data?.pipelineFunnel || []).map((f: any) => [f.status, Number(f.count) || 0]))
  const funnel = FUNNEL_ORDER.filter((s) => funnelRaw.has(s)).map((s) => ({ label: FUNNEL_LABELS[s] || s, value: Number(funnelRaw.get(s)) }))
  const makes = (data?.topMakes || []).map((m: any) => ({ label: m.make, value: Number(m.count) || 0 }))
  const centers = data?.centers || []
  return <div>
    <PageHeader title="Marketplace intelligence" description="Inventory, review throughput and seller-reported outcomes. Transaction value is never represented as Sawa revenue." action={<button type="button" onClick={load} className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-label font-bold text-content hover:bg-surface-alt"><Icon name="refresh" size={16} />Refresh</button>} />

    <section aria-labelledby="pulse-title" className="mb-7"><div className="mb-3 flex items-center justify-between"><div><h2 id="pulse-title" className="text-section font-extrabold text-content">Executive pulse</h2><p className="mt-0.5 text-caption text-content-muted">A fast read on inventory outcomes, conversion and service quality.</p></div><span className="rounded-pill bg-success-tint px-3 py-1 text-caption font-bold text-success-text">Live data</span></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Listings marked sold" value={String(current?.sold || 0)} detail="A seller-reported outcome, not a transaction processed by Sawa" icon="trending-up" tone="neutral" />
        <Metric label="Reported listing value" value={fmtMoneyShort(current?.value || 0, salesCurrency)} detail="Sum of asking prices on listings marked sold; not verified sale proceeds" icon="chart" tone="neutral" />
        <Metric label="Market conversion" value={`${conversion}%`} detail={`${reached} of ${total} submissions reached live or sold`} icon="gauge" tone={conversion >= 60 ? 'good' : conversion >= 35 ? 'warn' : 'danger'} />
        <Metric label="Review response" value={avgHours ? `${avgHours}h` : '—'} detail={`${overdue} overdue of ${awaiting} awaiting review`} icon="clock" tone={overdue ? 'danger' : 'good'} href="/submissions" />
      </div>
    </section>

    {(overdue > 0 || rejectionRate >= 25) ? <section aria-labelledby="attention-title" className="mb-7"><h2 id="attention-title" className="mb-3 text-section font-extrabold text-content">Needs attention</h2><div className="grid gap-3 lg:grid-cols-2">
      {overdue > 0 ? <Link href="/submissions" className="flex gap-3 rounded-2xl border border-danger/20 bg-danger-tint p-4"><span className="text-danger-strong"><Icon name="alert" size={20} /></span><span><strong className="block text-label text-danger-strong">{overdue} overdue review{overdue === 1 ? '' : 's'}</strong><span className="text-caption text-danger-strong/80">Past the 24-hour seller promise. Open oldest first.</span></span></Link> : null}
      {rejectionRate >= 25 ? <Link href="/submissions" className="flex gap-3 rounded-2xl border border-warning-border bg-warning-tint p-4"><span className="text-warning-text"><Icon name="trending-down" size={20} /></span><span><strong className="block text-label text-warning-text">{rejectionRate}% rejection rate</strong><span className="text-caption text-warning-text/80">Review reasons for recurring seller friction.</span></span></Link> : null}
    </div></section> : null}

    <section aria-labelledby="performance-title" className="mb-7"><div className="mb-3"><h2 id="performance-title" className="text-section font-extrabold text-content">Performance</h2><p className="mt-0.5 text-caption text-content-muted">Volume and value over the last six months.</p></div><div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
      <Card className="p-5"><div className="mb-5 flex items-start justify-between gap-4"><div><h3 className="text-label font-extrabold text-content">Seller-reported listing value</h3><p className="mt-1 text-caption text-content-muted">Asking prices on listings marked sold · {salesCurrency}</p></div>{trend != null ? <span className={`rounded-pill px-3 py-1 text-caption font-bold ${trend >= 0 ? 'bg-success-tint text-success-text' : 'bg-danger-tint text-danger-strong'}`}>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%</span> : null}</div><BarChart data={monthly} height={210} formatValue={(v) => fmtMoneyShort(v, salesCurrency)} emptyLabel="No listings marked sold yet" /></Card>
      <Card className="p-5"><div className="mb-5"><h3 className="text-label font-extrabold text-content">Listings marked sold</h3><p className="mt-1 text-caption text-content-muted">Reported status changes by month</p></div><BarChart data={monthly.map((m: any) => ({ label: m.label, value: m.sold }))} height={210} emptyLabel="No listings marked sold yet" /></Card>
    </div></section>

    <section aria-labelledby="operations-title"><div className="mb-3"><h2 id="operations-title" className="text-section font-extrabold text-content">Marketplace operations</h2><p className="mt-0.5 text-caption text-content-muted">Where inventory sits, what customers prefer, and center throughput.</p></div><div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5"><div className="mb-5"><h3 className="text-label font-extrabold text-content">Submission pipeline</h3><p className="mt-1 text-caption text-content-muted">Stage distribution · all time</p></div>{funnel.length ? <div className="space-y-4">{funnel.map((f) => <HBar key={f.label} {...f} max={Math.max(...funnel.map((x) => x.value), 1)} />)}</div> : <EmptyState icon="document" title="No submissions yet" />}</Card>
      <Card className="p-5"><div className="mb-5"><h3 className="text-label font-extrabold text-content">Inventory mix</h3><p className="mt-1 text-caption text-content-muted">Most represented makes · live and sold</p></div>{makes.length ? <div className="space-y-4">{makes.map((m: any) => <HBar key={m.label} {...m} max={Math.max(...makes.map((x: any) => x.value), 1)} />)}</div> : <EmptyState icon="car" title="No inventory yet" />}</Card>
      <Card className="p-5 lg:col-span-2"><div className="mb-5"><h3 className="text-label font-extrabold text-content">Inspection throughput</h3><p className="mt-1 text-caption text-content-muted">Appointments and completion rate by center</p></div>{centers.length ? <div className="grid gap-5 md:grid-cols-3">{centers.map((c: any) => { const scheduled = Number(c.scheduled) || 0, completed = Number(c.completed) || 0, rate = scheduled ? Math.round(completed / scheduled * 100) : 0; return <div key={c.center} className="rounded-2xl border border-line-soft bg-surface-alt p-4"><div className="flex items-start justify-between"><div><p className="font-extrabold text-content">{c.center}</p><p className="mt-1 text-caption text-content-muted">{completed} of {scheduled} completed</p></div><span className="text-section font-extrabold text-brand">{rate}%</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-brand" style={{ width: `${rate}%` }} /></div></div>})}</div> : <EmptyState icon="location" title="No inspections booked yet" />}</Card>
    </div></section>
  </div>
}
