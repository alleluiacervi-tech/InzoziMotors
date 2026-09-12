'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api, type ActionCenterResponse } from '@/lib/api'
import {
  Card, StatCard, PageHeader, EmptyState, BarChart, Icon, Delta, Sparkline,
  LoadingState, Skeleton, fmtMoneyShort, type IconName, type Trend,
} from '@/components/ui'

interface Stats {
  liveListings: number
  pendingSubmissions: number
  pendingInquiries: number
  pendingIdVerifications: number
  // Derived server-side from timestamps that already exist — see the comment
  // above the trend queries in backend/src/routes/admin.js. Optional, because
  // an older API build simply will not send them and the page must still work.
  trends?: {
    days: string[]
    liveListings: Trend
    pendingSubmissions: Trend
    pendingInquiries: Trend
    pendingIdVerifications: Trend
  }
  pace?: {
    medianDaysToPublish: number | null
    medianDaysToPublishPrevious: number | null
    sampleSize: number
    marketplaceValue: number
    marketplaceValueCurrency: string
    marketplaceListings: number
  }
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

// A funnel measures FLOW: each stage is work on its way to the next one, so a
// stage-to-stage drop is meaningful. These five are that.
const WORKFLOW_STAGES = ['draft', 'under_review', 'scheduled', 'inspecting', 'approved']

// These are where a submission ENDS UP, not a further step. Counting them as
// funnel stages is what produced a "-574% drop" between 19 approved and 128
// live on a real screen: `live` is every listing on the marketplace, a
// standing total, not the 19 that just came through review. They are shown as
// outcomes, separately, and never carry a drop.
const OUTCOME_STAGES = ['live', 'paused', 'sold', 'rejected', 'archived']

const FUNNEL_LABELS: Record<string, string> = {
  draft: 'Draft', under_review: 'Under review', scheduled: 'Inspection booked',
  inspecting: 'Being inspected', approved: 'Approved', live: 'Live', paused: 'Paused',
  sold: 'Marked sold', rejected: 'Rejected', archived: 'Archived',
}

const QUICK_ACTIONS: { href: string; label: string; sub: string; icon: IconName }[] = [
  { href: '/listings/new', label: 'Create a listing', sub: 'Starts from a passed inspection', icon: 'plus' },
  { href: '/submissions', label: 'Take in a vehicle', sub: 'Files the submission for a walk-in seller', icon: 'document' },
  { href: '/inspections', label: 'Book an inspection', sub: 'Listing or standalone walk-in', icon: 'settings' },
  { href: '/users', label: 'Verify an identity', sub: 'Sellers cannot publish until you do', icon: 'user' },
]

export default function DashboardPage() {
  const router = useRouter()
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

  // ─── Work that arrives while you are looking at the page ───────────────────
  // Nothing reorders under the operator's cursor: new items are held aside and
  // announced, and it takes a deliberate click to merge them into the list they
  // are reading. A queue that rearranges itself mid-decision is how the wrong
  // row gets clicked.
  const [incoming, setIncoming] = useState<ActionCenterResponse['items']>([])
  const knownIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!actions) return
    if (!knownIds.current.size) actions.items.forEach((item) => knownIds.current.add(item.id))
  }, [actions])

  useEffect(() => {
    if (loading || !actions) return
    const poll = window.setInterval(() => {
      api.actionCenter()
        .then((fresh) => {
          const arrived = fresh.items.filter((item) => !knownIds.current.has(item.id))
          if (arrived.length) setIncoming(arrived)
        })
        .catch(() => { /* the badge simply does not update; the page is unharmed */ })
    }, 60_000)
    return () => window.clearInterval(poll)
  }, [loading, actions])

  const mergeIncoming = useCallback(() => {
    if (!incoming.length) return
    incoming.forEach((item) => knownIds.current.add(item.id))
    setActions((current) => current && {
      ...current,
      items: [...incoming, ...current.items],
      summary: {
        ...current.summary,
        total: current.summary.total + incoming.length,
        urgent: current.summary.urgent + incoming.filter((i) => i.priority === 'urgent').length,
        attention: current.summary.attention + incoming.filter((i) => i.priority === 'attention').length,
      },
    })
    setIncoming([])
  }, [incoming])

  const s = stats
  const visibleActions = useMemo(
    () => (actions?.items ?? []).filter((item) => actionFilter === 'all' || item.priority === actionFilter).slice(0, 8),
    [actions, actionFilter],
  )

  // ─── Keyboard ──────────────────────────────────────────────────────────────
  // The same grammar as the inspection checklist: hands stay on the keys. j and
  // k walk the queue, Enter opens what is under the cursor.
  const [cursor, setCursor] = useState(-1)
  useEffect(() => { setCursor(-1) }, [actionFilter])
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (!visibleActions.length) return
      if (event.key === 'j') {
        event.preventDefault()
        setCursor((current) => Math.min(visibleActions.length - 1, current + 1))
      } else if (event.key === 'k') {
        event.preventDefault()
        setCursor((current) => Math.max(0, current - 1))
      } else if (event.key === 'Enter' && cursor >= 0 && visibleActions[cursor]) {
        event.preventDefault()
        router.push(visibleActions[cursor].href)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [visibleActions, cursor, router])

  if (loading) {
    return (
      <div>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2"><Skeleton className="h-7 w-40" /><Skeleton className="h-4 w-72" /></div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="mb-6 h-28 w-full rounded-2xl" />
        <Card className="mb-6 p-5"><LoadingState rows={5} label="Loading the action queue…" /></Card>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((n) => <Skeleton key={n} className="h-32 rounded-2xl" />)}
        </div>
      </div>
    )
  }
  if (error || !s) {
    return (
      <Card>
        <EmptyState icon="alert" title="Couldn’t load the dashboard" description={error || 'The API did not respond.'} />
      </Card>
    )
  }

  const salesCurrency: string = analytics?.salesCurrency || 'RWF'
  const monthly = (analytics?.monthlySales ?? []).map((m) => ({
    label: monthLabel(m.month),
    value: Number(m.total_value) || 0,
    sold: Number(m.total_sold) || 0,
  }))
  const funnelRaw = new Map((analytics?.pipelineFunnel ?? []).map((f) => [f.status, Number(f.count) || 0]))
  const toRow = (st: string) => ({ label: FUNNEL_LABELS[st] ?? st, value: funnelRaw.get(st)! })
  const funnel = WORKFLOW_STAGES.filter((st) => funnelRaw.has(st)).map(toRow)
  const outcomes = OUTCOME_STAGES.filter((st) => funnelRaw.has(st) && funnelRaw.get(st)! > 0).map(toRow)
  const funnelMax = Math.max(...funnel.map((f) => f.value), 1)
  // The gap between two stages is the thing worth acting on; the counts on
  // their own only say how busy the pipeline is. The widest gap is named so an
  // operator is not left to eyeball which bar shrank most.
  //
  // A stage can legitimately be BIGGER than the one above it — a backlog
  // clearing, or a batch arriving — so a negative "drop" is real and must not
  // be reported as one. Those read as growth and are excluded from the widest-
  // gap comparison, which is about where work is getting stuck.
  const drops = funnel.slice(1).map((stage, index) => {
    const previous = funnel[index].value
    return previous > 0 ? Math.round(((previous - stage.value) / previous) * 100) : 0
  })
  const widestDrop = drops.length ? Math.max(...drops, 0) : 0
  // Reaching approval is the pipeline's job. Measuring to the last row of a
  // list that ended in "rejected" measured the opposite.
  const throughput = funnel.length > 1 && funnel[0].value > 0
    ? Math.round((funnel[funnel.length - 1].value / funnel[0].value) * 100)
    : null

  const pace = s.pace
  const trends = s.trends
  // A median under a day rounds to "0 days", which reads as a broken figure
  // rather than a fast one. Below a day the same number is told in hours, and
  // the movement is told in the same unit so the two agree.
  const paceIn = (days: number | null | undefined, asHours: boolean) =>
    days == null ? null : asHours ? Math.max(1, Math.round(days * 24)) : Math.round(days * 10) / 10
  const paceAsHours = pace?.medianDaysToPublish != null && pace.medianDaysToPublish < 1
  const paceValue = paceIn(pace?.medianDaysToPublish, paceAsHours)
  const pacePrevious = paceIn(pace?.medianDaysToPublishPrevious, paceAsHours)
  const paceUnit = paceValue == null ? '' : paceAsHours ? (paceValue === 1 ? 'hour' : 'hours') : (paceValue === 1 ? 'day' : 'days')
  const ageRule = (hours: number) =>
    hours >= 48 ? 'bg-danger-strong' : hours >= 24 ? 'bg-warning' : 'bg-line'
  const ageText = (hours: number) =>
    hours >= 48 ? 'font-bold text-danger-strong' : hours >= 24 ? 'font-bold text-warning-text' : 'text-content-muted'
  const ageLabel = (hours: number) => hours < 1 ? 'Just now' : hours < 24 ? `${hours}h waiting` : `${Math.floor(hours / 24)}d waiting`
  const priorityLabel = { urgent: 'Urgent', attention: 'Attention', routine: 'Routine' } as const
  const priorityBadge = {
    urgent: 'bg-danger-tint text-danger-strong',
    attention: 'bg-warning-tint text-warning-text',
    routine: 'bg-surface-alt text-content-secondary',
  } as const

  return (
    <div>
      <PageHeader
        title="Action Center"
        description="Everything moving through the pipeline right now."
        action={
          <Link
            href="/listings/new"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-label font-bold text-brand-on shadow-card transition-colors hover:bg-brand-deep"
          >
            <Icon name="plus" size={16} />
            New listing
          </Link>
        }
      />

      {/* ─── Today ────────────────────────────────────────────────────────────
          The page could say what was queued and never what was happening. These
          three answer "how is the business moving" before any queue is opened,
          and they are the only figures on the page at the largest type tier. */}
      {trends || pace ? (
        <div className="mb-6 grid gap-px overflow-hidden rounded-2xl border border-line bg-line-soft sm:grid-cols-3">
          <div className="flex flex-col gap-2.5 bg-surface px-6 py-5">
            <span className="text-micro font-bold uppercase tracking-[0.1em] text-content-muted">Live on the marketplace</span>
            <div className="flex items-end justify-between gap-4">
              <div className="flex items-baseline gap-2.5">
                <span className="text-stat-lg font-extrabold tabular-nums text-content">{s.liveListings}</span>
                {trends ? <Delta value={trends.liveListings.delta} goodDirection="up" /> : null}
              </div>
              {trends ? <div className="w-20 shrink-0"><Sparkline series={trends.liveListings.series} /></div> : null}
            </div>
            <span className="text-caption text-content-muted">
              {trends ? `${trends.liveListings.recent ?? 0} published in the last seven days` : 'vehicles a buyer can see today'}
            </span>
          </div>

          <div className="flex flex-col gap-2.5 bg-surface px-6 py-5">
            <span className="text-micro font-bold uppercase tracking-[0.1em] text-content-muted">Seller-stated value listed</span>
            <div className="flex items-end justify-between gap-4">
              <span className="text-stat-lg font-extrabold tabular-nums text-brand">
                {pace ? fmtMoneyShort(pace.marketplaceValue, pace.marketplaceValueCurrency) : '—'}
              </span>
            </div>
            <span className="text-caption text-content-muted">
              across {pace?.marketplaceListings ?? 0} live listings · Sawa is not a party to any sale
            </span>
          </div>

          <div className="flex flex-col gap-2.5 bg-surface px-6 py-5">
            <span className="text-micro font-bold uppercase tracking-[0.1em] text-content-muted">Submission to published</span>
            <div className="flex items-end justify-between gap-4">
              <div className="flex items-baseline gap-2.5">
                <span className="text-stat-lg font-extrabold tabular-nums text-content">
                  {paceValue ?? '—'}
                  {paceValue != null ? <span className="text-section font-bold text-content-secondary"> {paceUnit}</span> : null}
                </span>
                {paceValue != null && pacePrevious != null ? (
                  <Delta value={Math.round((paceValue - pacePrevious) * 10) / 10} goodDirection="down" />
                ) : null}
              </div>
            </div>
            <span className="text-caption text-content-muted">
              {pace?.sampleSize ? `median of ${pace.sampleSize} published in the last 30 days` : 'nothing published in the last 30 days yet'}
            </span>
          </div>
        </div>
      ) : null}

      {/* ─── The focal object ─────────────────────────────────────────────────
          Deeper shadow, a full border and a brand hairline along the top edge.
          Every other card on this page steps down from here deliberately: the
          Action Center used to be made of exactly the same material as Quick
          actions, so nothing on the screen claimed to matter more. */}
      <div className="mb-7 overflow-hidden rounded-2xl border border-line border-t-2 border-t-brand bg-surface shadow-card-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-4 pt-5">
          <div>
            <h2 className="text-section font-extrabold text-content">Waiting on you</h2>
            <p className="text-caption text-content-muted">Oldest and most urgent first.</p>
          </div>
          <div className="flex items-center gap-2">
            {incoming.length ? (
              <button
                type="button"
                onClick={mergeIncoming}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-caption font-bold text-content-secondary transition-colors hover:border-content-muted"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                {incoming.length} new since you opened
              </button>
            ) : null}

          </div>
        </div>

        {!actions ? (
          <div className="px-6 py-5 text-caption text-content-muted">Action Center is temporarily unavailable. The rest of the dashboard is current.</div>
        ) : actions.summary.total === 0 ? (
          <EmptyState icon="check-circle" title="Everything is under control" description="There are no approvals, exceptions or overdue workflows requiring action." />
        ) : (
          <>
            <div className="flex gap-1.5 overflow-x-auto px-6 pb-3.5" role="tablist" aria-label="Filter actions">
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
                  {label}{' '}
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.5 text-micro tabular-nums ${
                      actionFilter === key
                        ? 'bg-white/15 text-white'
                        : key === 'urgent' ? 'bg-danger-tint text-danger-strong'
                        : key === 'attention' ? 'bg-warning-tint text-warning-text'
                        : 'bg-surface-alt text-content-secondary'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              ))}
            </div>
            {visibleActions.length ? (
              <ul>
                {visibleActions.map((action, index) => (
                  <li key={action.id}>
                    <Link
                      href={action.href}
                      onMouseEnter={() => setCursor(index)}
                      className={`group flex items-stretch gap-3.5 border-t border-line-soft px-6 py-3.5 transition-colors ${cursor === index ? 'bg-surface-alt' : 'hover:bg-surface-alt'}`}
                    >
                      {/* Waiting time, made pre-attentive. The old priority dot
                          repeated what the badge beside it already said; this
                          carries the one thing nothing else showed. */}
                      <span className={`w-[3px] shrink-0 rounded-full ${ageRule(action.age_hours)}`} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-label font-bold text-content">{action.title}</span>
                          <span className={`rounded-full px-2 py-0.5 text-micro font-bold ${priorityBadge[action.priority]}`}>{priorityLabel[action.priority]}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-caption text-content-muted">{action.kind} · {action.detail}</span>
                      </span>
                      <span className={`hidden shrink-0 self-center text-caption tabular-nums sm:block ${ageText(action.age_hours)}`}>{ageLabel(action.age_hours)}</span>
                      <span className="self-center text-content-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand"><Icon name="chevron-right" size={16} /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border-t border-line-soft px-6 py-8 text-center text-caption text-content-muted">No {actionFilter} actions right now.</div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft bg-surface-alt px-6 py-3">
              <span className="text-caption font-semibold text-content-muted">
                {actions.summary.total > visibleActions.length
                  ? `Showing the ${visibleActions.length} most important of ${actions.summary.total}`
                  : `${visibleActions.length} waiting on you`}
              </span>
              <span className="flex items-center gap-1.5 text-caption font-semibold text-content-muted">
                <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 text-micro">J</kbd>
                <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 text-micro">K</kbd>
                to move
                <kbd className="ml-1 rounded border border-line bg-surface px-1.5 py-0.5 text-micro">↵</kbd>
                to open
              </span>
            </div>
          </>
        )}
      </div>

      {/* Operational counts — each one is a doorway, and now says which way it is moving */}
      <div className="mb-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Live listings" value={s.liveListings} icon="car" href="/listings" trend={trends?.liveListings} sub={trends ? 'published per day, 14 days' : undefined} />
        <StatCard label="Pending submissions" value={s.pendingSubmissions} icon="document" href="/submissions" trend={trends?.pendingSubmissions} sub="awaiting review" />
        <StatCard label="Rental inquiries" value={s.pendingInquiries} icon="calendar" href="/rentals/inquiries" trend={trends?.pendingInquiries} sub="awaiting a response" />
        <StatCard label="Identity queue" value={s.pendingIdVerifications} icon="user" href="/users" trend={trends?.pendingIdVerifications} sub="sellers waiting" />
      </div>

      {/* Reporting tier — quiet material, but each chart now carries a comparison */}
      <div className="mb-7 grid items-start gap-4 lg:grid-cols-2">
        <Card className="border-line-soft p-5 shadow-none">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <h2 className="text-label font-bold text-content">Seller-stated listing value</h2>
            <span className="text-caption text-content-muted">six months, {salesCurrency}</span>
          </div>
          <p className="mb-4 text-caption text-content-muted">Each month against the one before it.</p>
          <BarChart
            data={monthly}
            height={170}
            compare
            formatValue={(v) => fmtMoneyShort(v, salesCurrency)}
            emptyLabel="No listings have been marked sold yet"
          />
          {monthly.length > 0 && (
            <p className="mt-3 text-caption text-content-muted">
              {monthly.reduce((n, m) => n + m.sold, 0)} listing
              {monthly.reduce((n, m) => n + m.sold, 0) === 1 ? '' : 's'} marked sold in this window. Sawa Cars does not process or verify the sale transaction.
            </p>
          )}
        </Card>

        <Card className="border-line-soft p-5 shadow-none">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <h2 className="text-label font-bold text-content">Submission pipeline</h2>
            <span className="text-caption text-content-muted">all time</span>
          </div>
          {funnel.length === 0 ? (
            <EmptyState icon="document" title="No submissions yet" description="Seller submissions appear here as they enter the pipeline." />
          ) : (
            <>
              <div className="mb-4 flex items-baseline gap-2.5">
                <span className="text-stat font-extrabold tabular-nums text-content">{throughput == null ? '—' : `${throughput}%`}</span>
                <span className="text-caption font-semibold text-content-muted">of drafts reach approval</span>
              </div>
              <div className="flex flex-col gap-1">
                {funnel.map((f, index) => (
                  <div key={f.label} className="flex flex-col gap-1.5">
                    {index > 0 ? (
                      <div className="flex justify-end">
                        {drops[index - 1] > 0 ? (
                          <span className={`text-micro font-bold tabular-nums ${drops[index - 1] === widestDrop ? 'text-warning-text' : 'text-content-muted'}`}>
                            {drops[index - 1]}% drop{drops[index - 1] === widestDrop ? ' · the widest gap' : ''}
                          </span>
                        ) : (
                          // More work sitting here than in the stage above it.
                          // That is a backlog forming, not a drop, and saying
                          // "-574% drop" is how the old version put it.
                          <span className="text-micro font-bold tabular-nums text-content-muted">
                            +{Math.abs(drops[index - 1])}% more waiting here
                          </span>
                        )}
                      </div>
                    ) : null}
                    <div className="flex items-baseline justify-between">
                      <span className="text-caption font-semibold text-content-secondary">{f.label}</span>
                      <span className="text-caption font-bold tabular-nums text-content">{f.value}</span>
                    </div>
                    <div
                      className={`h-2.5 rounded-full ${index === 0 ? 'bg-ink-900' : index < 3 ? 'bg-ink-700' : 'bg-content-muted'}`}
                      style={{ width: `${Math.max(4, Math.round((f.value / funnelMax) * 100))}%` }}
                    />
                  </div>
                ))}
              </div>

              {outcomes.length ? (
                <div className="mt-5 border-t border-line-soft pt-4">
                  <p className="mb-2.5 text-micro font-bold uppercase tracking-[0.1em] text-content-muted">
                    Where submissions ended up
                  </p>
                  <dl className="flex flex-wrap gap-x-6 gap-y-2">
                    {outcomes.map((o) => (
                      <div key={o.label} className="flex items-baseline gap-1.5">
                        <dt className="text-caption text-content-muted">{o.label}</dt>
                        <dd className="text-caption font-bold tabular-nums text-content">{o.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-2 text-micro text-content-muted">
                    Standing totals across the whole marketplace, not a next step in the queue above.
                  </p>
                </div>
              ) : null}
            </>
          )}
        </Card>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* Quick actions — a list, not four more tinted squircles */}
        <Card className="border-line-soft p-5 shadow-none">
          <h2 className="mb-3 text-label font-bold text-content">Start something</h2>
          <div className="flex flex-col">
            {QUICK_ACTIONS.map(({ href, label, sub }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 border-b border-line-soft py-2.5 last:border-0"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-label font-bold text-content group-hover:text-brand">{label}</span>
                  <span className="mt-0.5 block text-caption text-content-muted">{sub}</span>
                </span>
                <span className="text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand"><Icon name="chevron-right" size={15} /></span>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="border-line-soft p-5 shadow-none">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-label font-bold text-content">Recent operational activity</h2>
            <span className="text-caption text-content-muted">across the whole workflow</span>
          </div>
          {activity.length ? (
            <ul className="border-l border-line-soft pl-0">
              {activity.slice(0, 6).map((item, index) => (
                <li key={`${item.kind}-${item.happened_at}-${index}`} className="relative">
                  <Link href={item.href} className="flex items-baseline gap-3 py-2.5 pl-4">
                    {/* Ink, not brand red: "this one is the most recent" is
                        information, and red on this product means money, a
                        primary action or something blocking. Size and weight
                        carry the emphasis instead. */}
                    <span
                      className={`absolute top-4 rounded-full border-2 border-surface ${index === 0 ? '-left-[5px] h-[7px] w-[7px] bg-ink-900' : '-left-1 h-[5px] w-[5px] bg-gray-400'}`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-label font-semibold text-content">{item.title}</span>
                      <span className="block truncate text-caption text-content-muted">{item.kind} · {item.detail.replaceAll('_', ' ')}</span>
                    </span>
                    <time className="shrink-0 text-caption text-content-muted" dateTime={item.happened_at}>
                      {new Date(item.happened_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon="chart" title="No activity yet" description="Workflow changes will collect here." />}
        </Card>
      </div>
    </div>
  )
}
