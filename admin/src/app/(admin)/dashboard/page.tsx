'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import {
  Card, StatCard, PageHeader, EmptyState, BarChart, Icon,
  fmtUSD, fmtRWF, type IconName,
} from '@/components/ui'

interface Stats {
  liveListings: number
  pendingSubmissions: number
  pendingHandovers: number
  pendingIdVerifications: number
  totalSold: number
  totalGMV: number
  totalRevenue: number
  feesOutstanding: number
}

interface Analytics {
  monthlySales: { month: string; total_sold: string | number; total_value: string | number }[]
  pipelineFunnel: { status: string; count: string | number }[]
  topMakes: { make: string; count: string | number }[]
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthLabel = (ym: string) => {
  const m = parseInt(ym.slice(5), 10)
  return `${MONTH_NAMES[m - 1] ?? ym} ’${ym.slice(2, 4)}`
}

// Fixed pipeline order — a funnel reads top-of-funnel first, not by count.
const FUNNEL_ORDER = ['under_review', 'pending', 'scheduled', 'inspecting', 'inspected', 'live', 'sold', 'rejected']
const FUNNEL_LABELS: Record<string, string> = {
  under_review: 'Under review', pending: 'Pending', scheduled: 'Inspection booked',
  inspecting: 'Being inspected', inspected: 'Inspected', live: 'Live', sold: 'Sold', rejected: 'Rejected',
}

function RevenueCard({
  label, usd, sub, tone, href,
}: {
  label: string
  usd: number
  sub: string
  tone: 'brand' | 'neutral' | 'warning'
  href?: string
}) {
  const body = (
    <div className="p-6">
      <p className="text-[13px] font-semibold text-content-muted">{label}</p>
      <p className={`mt-2 text-[32px] font-extrabold leading-none tracking-[-0.02em] ${tone === 'brand' ? 'text-brand' : 'text-content'}`}>
        {fmtUSD(usd)}
      </p>
      <p className="mt-2 text-xs text-content-muted">
        ≈ {fmtRWF(usd)} · {sub}
      </p>
    </div>
  )
  const cls =
    'block rounded-2xl border border-line-soft bg-surface shadow-card transition-all duration-200 ' +
    (href ? 'hover:-translate-y-0.5 hover:shadow-card-lg' : '')
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>
}

const QUICK_ACTIONS: { href: string; label: string; sub: string; icon: IconName }[] = [
  { href: '/listings/new', label: 'Create a listing', sub: 'Publish an inspected car', icon: 'plus' },
  { href: '/submissions', label: 'Review submissions', sub: 'Approve or schedule', icon: 'document' },
  { href: '/handovers', label: 'Confirm handovers', sub: 'The sale event', icon: 'key' },
  { href: '/users', label: 'ID verification queue', sub: 'Approve sellers', icon: 'user' },
]

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.stats(), api.analytics().catch(() => null)])
      .then(([s, a]) => { setStats(s); setAnalytics(a) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-sm text-content-muted">Loading dashboard…</div>
  if (error || !stats) {
    return (
      <Card>
        <EmptyState icon="alert" title="Couldn’t load the dashboard" description={error || 'The API did not respond.'} />
      </Card>
    )
  }

  const s = stats
  const monthly = (analytics?.monthlySales ?? []).map((m) => ({
    label: monthLabel(m.month),
    value: Number(m.total_value) || 0,
    sold: Number(m.total_sold) || 0,
  }))
  const funnelRaw = new Map((analytics?.pipelineFunnel ?? []).map((f) => [f.status, Number(f.count) || 0]))
  const funnel = FUNNEL_ORDER.filter((st) => funnelRaw.has(st)).map((st) => ({
    label: FUNNEL_LABELS[st] ?? st,
    value: funnelRaw.get(st)!,
  }))
  const funnelMax = Math.max(...funnel.map((f) => f.value), 1)

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Everything moving through the pipeline right now."
        action={
          <Link
            href="/listings/new"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-card transition-colors hover:bg-brand-deep"
          >
            <Icon name="plus" size={16} />
            New listing
          </Link>
        }
      />

      {/* Money — Inzozi's earnings first, marketplace volume second */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RevenueCard
          label="Fee revenue (earned)"
          usd={s.totalRevenue}
          sub="certification + commission"
          tone="brand"
          href="/fees"
        />
        <RevenueCard
          label="Marketplace volume (GMV)"
          usd={s.totalGMV}
          sub={`${s.totalSold} car${s.totalSold === 1 ? '' : 's'} sold`}
          tone="neutral"
        />
        <RevenueCard
          label="Fees outstanding"
          usd={s.feesOutstanding}
          sub="due, not yet collected"
          tone={s.feesOutstanding > 0 ? 'warning' : 'neutral'}
          href="/fees"
        />
      </div>

      {/* Operational counts — each one is a doorway, not a decoration */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Live listings" value={s.liveListings} icon="car" href="/listings" />
        <StatCard label="Pending submissions" value={s.pendingSubmissions} icon="document" href="/submissions" sub="awaiting review" />
        <StatCard label="Pending handovers" value={s.pendingHandovers} icon="key" href="/handovers" sub="confirm to record the sale" />
        <StatCard label="ID queue" value={s.pendingIdVerifications} icon="user" href="/users" sub="sellers waiting" />
      </div>

      {/* Charts */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-content">Monthly sales value</h2>
            <span className="text-xs text-content-muted">last 6 months, USD</span>
          </div>
          <BarChart
            data={monthly}
            height={160}
            formatValue={(v) => fmtUSD(v)}
            emptyLabel="No completed sales yet"
          />
          {monthly.length > 0 && (
            <p className="mt-3 text-xs text-content-muted">
              {monthly.reduce((n, m) => n + m.sold, 0)} handover
              {monthly.reduce((n, m) => n + m.sold, 0) === 1 ? '' : 's'} confirmed in this window.
            </p>
          )}
        </Card>

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
                <div key={f.label}>
                  <div className="mb-1 flex items-baseline justify-between text-xs">
                    <span className="font-semibold text-content-secondary">{f.label}</span>
                    <span className="font-bold text-content">{f.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
                    <div
                      className="h-full rounded-full bg-gray-500"
                      style={{ width: `${Math.max(4, Math.round((f.value / funnelMax) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <Card className="p-5">
        <h2 className="mb-4 text-sm font-bold text-content">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {QUICK_ACTIONS.map(({ href, label, sub, icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-start gap-3 rounded-xl border border-line-soft p-4 transition-colors hover:border-brand hover:bg-brand-tint"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-content-secondary transition-colors group-hover:bg-white group-hover:text-brand">
                <Icon name={icon} size={17} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-content">{label}</span>
                <span className="mt-0.5 block text-xs text-content-muted">{sub}</span>
              </span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}
