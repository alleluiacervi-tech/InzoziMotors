'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api, type ActionCenterResponse } from '@/lib/api'
import {
  Card, StatCard, PageHeader, EmptyState, BarChart, Icon,
  fmtMoneyShort, type IconName,
} from '@/components/ui'

interface Stats {
  liveListings: number
  pendingSubmissions: number
  pendingInquiries: number
  pendingIdVerifications: number
}

interface Analytics {
  monthlySales: { month: string; total_sold: string | number; total_value: string | number }[]
  salesCurrency?: string
  pipelineFunnel: { status: string; count: string | number }[]
  topMakes: { make: string; count: string | number }[]
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthLabel = (ym: string) => {
  const m = parseInt(ym.slice(5), 10)
  return `${MONTH_NAMES[m - 1] ?? ym} ’${ym.slice(2, 4)}`
}

// Fixed pipeline order — a funnel reads top-of-funnel first, not by count.
const FUNNEL_ORDER = ['draft', 'under_review', 'scheduled', 'inspecting', 'approved', 'live', 'paused', 'sold', 'rejected', 'archived']
const FUNNEL_LABELS: Record<string, string> = {
  draft: 'Draft', under_review: 'Under review', scheduled: 'Inspection booked',
  inspecting: 'Being inspected', approved: 'Approved', live: 'Live', paused: 'Paused',
  sold: 'Marked sold', rejected: 'Rejected', archived: 'Archived',
}

const QUICK_ACTIONS: { href: string; label: string; sub: string; icon: IconName }[] = [
  { href: '/listings/new', label: 'Create a listing', sub: 'Publish an inspected car', icon: 'plus' },
  { href: '/submissions', label: 'Review submissions', sub: 'Approve or schedule', icon: 'document' },
  { href: '/rentals/inquiries', label: 'Rental inquiries', sub: 'Coordinate availability requests', icon: 'calendar' },
  { href: '/users', label: 'ID verification queue', sub: 'Approve sellers', icon: 'user' },
]

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [activity, setActivity] = useState<{ kind: string; title: string; detail: string; happened_at: string; href: string }[]>([])
  const [actions, setActions] = useState<ActionCenterResponse | null>(null)
  const [actionFilter, setActionFilter] = useState<'all' | 'urgent' | 'attention'>('all')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.stats(), api.analytics().catch(() => null), api.activity().catch(() => []), api.actionCenter().catch(() => null)])
      .then(([s, a, recent, actionCenter]) => { setStats(s); setAnalytics(a); setActivity(recent); setActions(actionCenter) })
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
  const salesCurrency: string = analytics?.salesCurrency || 'RWF'
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
  const visibleActions = (actions?.items ?? []).filter((item) => actionFilter === 'all' || item.priority === actionFilter)
  const actionTone = {
    urgent: { dot: 'bg-danger-strong', badge: 'bg-danger-tint text-danger-strong', label: 'Urgent' },
    attention: { dot: 'bg-warning', badge: 'bg-warning-tint text-warning-text', label: 'Attention' },
    routine: { dot: 'bg-info', badge: 'bg-info-tint text-info', label: 'Routine' },
  } as const
  const ageLabel = (hours: number) => hours < 1 ? 'Just now' : hours < 24 ? `${hours}h waiting` : `${Math.floor(hours / 24)}d waiting`

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

      {/* The Super Admin's working surface: decisions before reporting. */}
      <Card className="mb-6 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line-soft px-5 py-5 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-tint text-brand">
                <Icon name="bell" size={18} />
              </span>
              <div>
                <h2 className="text-body font-extrabold text-content">Action Center</h2>
                <p className="text-caption text-content-muted">Your live operating queue, ordered by urgency.</p>
              </div>
            </div>
          </div>
          {actions && (
            <div className="flex items-center gap-2" aria-label="Action center summary">
              <span className="rounded-full bg-danger-tint px-2.5 py-1 text-caption font-bold text-danger-strong">{actions.summary.urgent} urgent</span>
              <span className="rounded-full bg-warning-tint px-2.5 py-1 text-caption font-bold text-warning-text">{actions.summary.attention} attention</span>
            </div>
          )}
        </div>

        {!actions ? (
          <div className="px-6 py-5 text-caption text-content-muted">Action Center is temporarily unavailable. The rest of the dashboard is current.</div>
        ) : actions.summary.total === 0 ? (
          <EmptyState icon="check-circle" title="Everything is under control" description="There are no approvals, exceptions or overdue workflows requiring action." />
        ) : (
          <>
            <div className="flex gap-1 overflow-x-auto border-b border-line-soft px-5 py-3" role="tablist" aria-label="Filter actions">
              {([
                ['all', 'All', actions.summary.total],
                ['urgent', 'Urgent', actions.summary.urgent],
                ['attention', 'Attention', actions.summary.attention],
              ] as const).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={actionFilter === key}
                  onClick={() => setActionFilter(key)}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-caption font-bold transition-colors ${actionFilter === key ? 'bg-ink-900 text-white' : 'text-content-muted hover:bg-surface-alt hover:text-content'}`}
                >
                  {label} <span className="ml-1 opacity-70">{count}</span>
                </button>
              ))}
            </div>
            {visibleActions.length ? (
              <ul className="divide-y divide-line-soft">
                {visibleActions.slice(0, 8).map((action) => {
                  const tone = actionTone[action.priority]
                  return (
                    <li key={action.id}>
                      <Link href={action.href} className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-alt sm:px-6">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-label font-bold text-content">{action.title}</span>
                            <span className={`rounded-full px-2 py-0.5 text-micro font-bold ${tone.badge}`}>{tone.label}</span>
                          </span>
                          <span className="mt-0.5 block truncate text-caption text-content-muted">{action.kind} · {action.detail}</span>
                        </span>
                        <span className="hidden shrink-0 text-caption font-semibold text-content-muted sm:block">{ageLabel(action.age_hours)}</span>
                        <span className="text-content-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand"><Icon name="chevron-right" size={16} /></span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="px-6 py-8 text-center text-caption text-content-muted">No {actionFilter} actions right now.</div>
            )}
            {visibleActions.length > 8 && (
              <div className="border-t border-line-soft bg-surface-alt px-6 py-3 text-center text-caption font-semibold text-content-muted">
                Showing the 8 most important of {visibleActions.length} actions
              </div>
            )}
          </>
        )}
      </Card>

      {/* Operational counts — each one is a doorway, not a decoration */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Live listings" value={s.liveListings} icon="car" href="/listings" />
        <StatCard label="Pending submissions" value={s.pendingSubmissions} icon="document" href="/submissions" sub="awaiting review" />
        <StatCard label="Rental inquiries" value={s.pendingInquiries} icon="calendar" href="/rentals/inquiries" sub="awaiting a response" />
        <StatCard label="ID queue" value={s.pendingIdVerifications} icon="user" href="/users" sub="sellers waiting" />
      </div>

      {/* Charts */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-content">Seller-reported listing value</h2>
            <span className="text-caption text-content-muted">last 6 months, {salesCurrency}</span>
          </div>
          <BarChart
            data={monthly}
            height={160}
            formatValue={(v) => fmtMoneyShort(v, salesCurrency)}
            emptyLabel="No listings have been marked sold yet"
          />
          {monthly.length > 0 && (
            <p className="mt-3 text-xs text-content-muted">
              {monthly.reduce((n, m) => n + m.sold, 0)} listing
              {monthly.reduce((n, m) => n + m.sold, 0) === 1 ? '' : 's'} marked sold in this window. Sawa Cars does not process or verify the sale transaction.
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

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      {/* Quick actions */}
      <Card className="p-5">
        <h2 className="mb-4 text-sm font-bold text-content">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2">
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
      <Card className="overflow-hidden">
        <div className="border-b border-line-soft px-5 py-4">
          <h2 className="text-sm font-bold text-content">Recent operational activity</h2>
          <p className="mt-0.5 text-xs text-content-muted">Latest movement across the whole workflow</p>
        </div>
        {activity.length ? <ul className="divide-y divide-line-soft">{activity.slice(0, 7).map((item, index) => (
          <li key={`${item.kind}-${item.happened_at}-${index}`}>
            <Link href={item.href} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-alt">
              <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden />
              <span className="min-w-0 flex-1"><span className="block truncate text-label font-semibold text-content">{item.title}</span><span className="block truncate text-caption text-content-muted">{item.kind} · {item.detail.replaceAll('_', ' ')}</span></span>
              <time className="shrink-0 text-caption text-content-muted" dateTime={item.happened_at}>{new Date(item.happened_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time>
            </Link>
          </li>
        ))}</ul> : <EmptyState icon="chart" title="No activity yet" description="Workflow changes will collect here." />}
      </Card>
      </div>
    </div>
  )
}
