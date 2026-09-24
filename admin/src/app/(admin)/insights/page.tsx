'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Insights · Overview — how the business did in a window, against the window
// before it. Every figure names its window; every chart has a table view;
// revenue is money Sawa collected, never a vehicle's price.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { api, downloadUrl, type InsightsDay, type InsightsOverview, type RangeQuery } from '@/lib/api'
import { fmtMoney, fmtMoneyShort, Icon, type IconName } from '@/components/ui'
import { BarList, ChartFrame, DownloadLink, KpiTile, LineChart, pctChange } from '@/components/charts'
import {
  CHANNEL_LABEL, InsightsShell, LINE_LABEL, METHOD_LABEL, SectionTitle, Windowed, useWindowed, windowText,
} from '@/components/InsightsShell'
import { fmtDate, fmtInt } from '@/lib/format'

type SeriesKey = 'contacts' | 'submissions' | 'published' | 'saves' | 'new_users' | 'revenue_rwf'
const METRICS: { key: SeriesKey; label: string; money?: boolean }[] = [
  { key: 'contacts', label: 'Contact requests' },
  { key: 'submissions', label: 'Submissions' },
  { key: 'published', label: 'Listings published' },
  { key: 'saves', label: 'Saves' },
  { key: 'new_users', label: 'New accounts' },
  { key: 'revenue_rwf', label: 'Revenue collected', money: true },
]

/** Long windows read better as weekly totals than as 365 jittering days. */
function bucket(days: InsightsDay[], key: SeriesKey, size: number) {
  const dates: string[] = []
  const values: number[] = []
  for (let i = 0; i < days.length; i += size) {
    const chunk = days.slice(i, i + size)
    dates.push(chunk[0].date)
    values.push(chunk.reduce((n, d) => n + Number(d[key] || 0), 0))
  }
  return { dates, values }
}

const pctText = (v: number | null | undefined) => (v == null ? '—' : `${v}%`)

export default function InsightsOverviewPage() {
  return (
    <InsightsShell
      title="Business overview"
      description={() => 'Supply, demand and money for the window you choose, against the same number of days before it. Kigali time.'}
      actions={({ range }) => <DownloadLink href={downloadUrl.businessReport(range)} icon="document">Business report (PDF)</DownloadLink>}
    >
      {(ctx) => <Overview {...ctx} />}
    </InsightsShell>
  )
}

function Overview({ range, compare, periodLabel, query }: { range: RangeQuery; compare: boolean; periodLabel: string; query: string }) {
  const state = useWindowed(api.insightsOverview, range)
  return (
    <Windowed state={state} rows={8}>
      {(d) => <OverviewBody data={d} compare={compare} periodLabel={periodLabel} query={query} />}
    </Windowed>
  )
}

function OverviewBody({ data, compare, periodLabel, query }: { data: InsightsOverview; compare: boolean; periodLabel: string; query: string }) {
  const [metric, setMetric] = useState<SeriesKey>('contacts')
  const cur = data.kpis.current
  const prev = data.kpis.previous
  const size = data.range.days > 120 ? 7 : 1
  const spark = (key: SeriesKey) => data.series.current.map((d) => Number(d[key] || 0))
  const sparkPrev = (key: SeriesKey) => data.series.previous.map((d) => Number(d[key] || 0))

  const chart = useMemo(() => {
    const c = bucket(data.series.current, metric, size)
    const p = bucket(data.series.previous, metric, size)
    return { c, p }
  }, [data, metric, size])
  const m = METRICS.find((x) => x.key === metric)!
  const fmt = (v: number) => (m.money ? fmtMoneyShort(v, 'RWF') : fmtInt(v))
  const totalCur = chart.c.values.reduce((a, b) => a + b, 0)
  const totalPrev = chart.p.values.reduce((a, b) => a + b, 0)
  const change = pctChange(totalCur, totalPrev)

  const tile = (label: string, key: keyof typeof cur, opts: { money?: boolean; spark?: SeriesKey; href?: string; hint?: string; good?: 'up' | 'down'; pct?: boolean } = {}) => {
    const c = Number(cur[key] ?? 0)
    const p = prev[key] == null ? null : Number(prev[key])
    return (
      <KpiTile
        label={label}
        value={opts.pct ? pctText(cur[key] as number | null) : opts.money ? fmtMoneyShort(c, 'RWF') : fmtInt(c)}
        current={c}
        previous={cur[key] == null ? null : p}
        goodDirection={opts.good ?? 'up'}
        periodLabel={periodLabel}
        compare={compare}
        series={opts.spark ? spark(opts.spark) : undefined}
        previousSeries={opts.spark ? sparkPrev(opts.spark) : undefined}
        href={opts.href}
        hint={opts.hint}
      />
    )
  }

  const channelItems = data.contacts_by_channel.map((c) => ({ key: c.channel, label: CHANNEL_LABEL[c.channel] || c.channel, value: c.current, previous: c.previous }))
  const moneyTotal = data.money.by_line.reduce((n, r) => n + r.total, 0)

  return (
    <>
      <p className="mb-4 text-caption text-content-muted">
        {windowText(data.range)}{compare ? <> · compared with {fmtDate(data.range.previous.from)} to {fmtDate(data.range.previous.to)}</> : null}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {tile('Revenue collected', 'revenue_rwf', { money: true, spark: 'revenue_rwf', href: `/revenue`, hint: fmtMoney(cur.revenue_rwf, 'RWF') })}
        {tile('Listings published', 'published', { spark: 'published', href: '/listings' })}
        {tile('Contact requests', 'contacts', { spark: 'contacts', hint: 'Seller details shared with signed-in buyers' })}
        {tile('Submissions received', 'submissions', { spark: 'submissions', href: '/submissions' })}
      </div>

      <ChartFrame
        className="mt-5"
        title={`${m.label}, ${size === 7 ? 'week by week' : 'day by day'}`}
        hint={`${m.money ? fmtMoney(totalCur, 'RWF') : fmtInt(totalCur)} in this window${compare ? ` · ${m.money ? fmtMoney(totalPrev, 'RWF') : fmtInt(totalPrev)} in the ${periodLabel}${change == null ? '' : ` (${change > 0 ? '+' : ''}${change}%)`}` : ''}`}
        legend={compare ? [{ label: 'This window', tone: 1, shape: 'line' }, { label: periodLabel[0].toUpperCase() + periodLabel.slice(1), tone: 'prev', shape: 'dash' }] : undefined}
        table={{
          columns: [
            { key: 'date', label: size === 7 ? 'Week starting' : 'Day', format: (v) => fmtDate(v) },
            { key: 'value', label: 'This window', align: 'right', format: (v) => fmt(v) },
            ...(compare ? [
              { key: 'pdate', label: 'Compared with', format: (v: string) => fmtDate(v) },
              { key: 'pvalue', label: 'Previous', align: 'right' as const, format: (v: number) => fmt(v) },
            ] : []),
          ],
          rows: chart.c.dates.map((date, i) => ({ date, value: chart.c.values[i], pdate: chart.p.dates[i], pvalue: chart.p.values[i] ?? 0 })),
        }}
        toolbar={
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Measure to chart">
            {METRICS.map((x) => (
              <button key={x.key} type="button" aria-pressed={metric === x.key} onClick={() => setMetric(x.key)}
                className={`h-8 rounded-lg px-3 text-caption font-bold transition-colors ${metric === x.key ? 'bg-surface-alt text-content ring-1 ring-inset ring-line' : 'text-content-muted hover:text-content'}`}>
                {x.label}
              </button>
            ))}
          </div>
        }
      >
        <LineChart
          dates={chart.c.dates}
          format={fmt}
          label={`${m.label} ${size === 7 ? 'per week' : 'per day'}, ${fmtDate(data.range.from)} to ${fmtDate(data.range.to)}${compare ? ', with the previous period dashed' : ''}`}
          series={[
            ...(compare ? [{ key: 'prev', label: 'Previous', values: chart.p.values, tone: 'prev' as const, dates: chart.p.dates }] : []),
            { key: 'cur', label: 'This window', values: chart.c.values, tone: 1 as const },
          ]}
        />
      </ChartFrame>

      <SectionTitle hint="Vehicles moving from submission to a live listing.">Supply</SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {tile('Reviewed within 24 hours', 'review_sla_rate', { pct: true, hint: `${fmtInt(cur.reviewed)} submissions reviewed` })}
        {tile('Inspections completed', 'inspections_completed', { href: '/insights/quality?' + query, hint: `Pass rate ${pctText(cur.pass_rate)}` })}
        {tile('Median days to live', 'median_days_to_live', { good: 'down', hint: 'From submission to publication, for listings published in the window' })}
        {tile('Listings marked sold', 'marked_sold', { hint: 'Reported by the seller. Sawa is not a party to the sale.' })}
      </div>

      <SectionTitle hint="People finding, saving and asking about vehicles.">Demand</SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {tile('Saves', 'saves', { spark: 'saves' })}
        {tile('New buyers', 'new_buyers', { href: '/users' })}
        {tile('New sellers', 'new_sellers', { href: '/users' })}
        <KpiTile label="Rental and import enquiries" value={fmtInt(cur.rental_inquiries + cur.import_enquiries)}
          current={cur.rental_inquiries + cur.import_enquiries} previous={prev.rental_inquiries + prev.import_enquiries}
          periodLabel={periodLabel} compare={compare}
          hint={`${fmtInt(cur.rental_inquiries)} rental · ${fmtInt(cur.import_enquiries)} import`} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <ChartFrame title="Contact requests by channel" hint={compare ? `Grey bar: the ${periodLabel}` : 'Which channel buyers asked for'}
          table={{ columns: [{ key: 'label', label: 'Channel' }, { key: 'value', label: 'This window', align: 'right' }, ...(compare ? [{ key: 'previous', label: 'Previous', align: 'right' as const }] : [])], rows: channelItems }}>
          <BarList items={channelItems} compare={compare} periodLabel={periodLabel} />
        </ChartFrame>
        <ChartFrame title="Revenue by line" hint={moneyTotal ? `${fmtMoney(moneyTotal, 'RWF')} collected · Sawa's own fees, never a vehicle's price` : 'Sawa’s own fees, never a vehicle’s price'}
          table={{ columns: [{ key: 'label', label: 'Line' }, { key: 'value', label: 'Collected', align: 'right', format: (v) => fmtMoney(v, 'RWF') }], rows: data.money.by_line.map((r) => ({ label: LINE_LABEL[r.key] || r.key, value: r.total })) }}>
          <BarList items={data.money.by_line.map((r) => ({ key: r.key, label: LINE_LABEL[r.key] || r.key, value: r.total }))} format={(v) => fmtMoney(v, 'RWF')} tone={1} emptyLabel="No revenue collected in this window" />
        </ChartFrame>
        <ChartFrame title="Revenue by payment method" hint="How the money arrived"
          table={{ columns: [{ key: 'label', label: 'Method' }, { key: 'value', label: 'Collected', align: 'right', format: (v) => fmtMoney(v, 'RWF') }], rows: data.money.by_method.map((r) => ({ label: METHOD_LABEL[r.key] || r.key, value: r.total })) }}>
          <BarList items={data.money.by_method.map((r) => ({ key: r.key, label: METHOD_LABEL[r.key] || r.key, value: r.total }))} format={(v) => fmtMoney(v, 'RWF')} tone={1} emptyLabel="No revenue collected in this window" />
        </ChartFrame>
      </div>

      <SectionTitle hint="Live counts, not limited to the window.">Right now</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <NowCard icon="car" label="Live listings" value={data.snapshot.live_inventory} href="/listings" />
        <NowCard icon="document" label="Submissions awaiting review" value={data.snapshot.awaiting_review} href="/submissions"
          alert={data.snapshot.reviews_breached ? `${fmtInt(data.snapshot.reviews_breached)} past the 24-hour promise` : undefined} />
        <NowCard icon="id-card" label="Identity checks waiting" value={data.snapshot.identity_queue} href="/users?tab=verification" />
        <NowCard icon="flag" label="Reported conversations open" value={data.snapshot.open_reports} href="/reports" />
      </div>
    </>
  )
}

function NowCard({ icon, label, value, href, alert }: { icon: IconName; label: string; value: number; href: string; alert?: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 rounded-2xl border border-line-soft bg-surface p-4 shadow-card transition-colors hover:border-line">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-alt text-content-secondary"><Icon name={icon} size={18} /></span>
      <span className="min-w-0">
        <span className="tnum block text-section font-extrabold text-content">{fmtInt(value)}</span>
        <span className="block truncate text-caption text-content-muted">{label}</span>
        {alert ? (
          <span className="mt-0.5 flex items-center gap-1 text-caption font-bold text-danger-strong"><Icon name="timer" size={12} />{alert}</span>
        ) : null}
      </span>
    </Link>
  )
}
