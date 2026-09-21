import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

// The admin's shared primitives — one card grammar, one stat tile, one status
// pill, one page header, so twelve pages read as one professional tool.

// ─── Money ───────────────────────────────────────────────────────────────────
// Amounts arrive as integers in the currency named by the row's `currency`
// column (migration 0006). RWF is the default for anything new; rows written
// before the conversion are still marked USD until scripts/convert-to-rwf.js has
// been run with an agreed rate.
//
// There used to be a hardcoded `RWF_RATE = 1300` here and another copy in
// src/data/marketData.js, and fmtRWF multiplied by it at render time. Three
// things were wrong with that: the two copies could disagree, the figure drifted
// from reality as the rate moved with nothing to signal it, and — worst — it
// presented a converted estimate in the same typography as a real amount, so an
// operator could not tell a fact from an approximation. No rate is applied
// anywhere in this file now. An amount is rendered in the currency it is stored
// in, or not at all.
export type Currency = 'RWF' | 'USD'

/** Normalise whatever the API sent. Unknown or missing is treated as RWF —
 *  the column is NOT NULL with a RWF default, so a missing value means the
 *  caller forgot to select it, not that the currency is unknown. */
export function asCurrency(v?: string | null): Currency {
  return v === 'USD' ? 'USD' : 'RWF'
}

/**
 * Format an amount in its own currency.
 *
 * `currency` is REQUIRED and deliberately has no default: a default is exactly
 * how every legacy USD row would have been silently relabelled as francs. Making
 * it required means the compiler lists every call site that has not been told
 * which currency it is printing.
 *
 * RWF has no minor unit in circulation, so there are no decimals to show.
 */
export function fmtMoney(n: number | null | undefined, currency: Currency | string): string {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  const amount = Math.round(Number(n))
  const cur = asCurrency(typeof currency === 'string' ? currency : currency)
  if (cur === 'USD') return `$${amount.toLocaleString('en-US')}`
  return `RWF ${amount.toLocaleString('en-US')}`
}

/** Form helper: accept spaces/commas operators naturally type in large RWF
 * values, while keeping the submitted value an integer string. */
export function parseRwfInput(value: string): number {
  const cleaned = value.replace(/[\s,]/g, '')
  return /^\d+$/.test(cleaned) ? Number(cleaned) : Number.NaN
}

export function formatRwfInput(value: string): string {
  const amount = parseRwfInput(value)
  return Number.isFinite(amount) ? Math.round(amount).toLocaleString('en-RW') : value
}

/** Compact form for stat tiles, where "RWF 41,000,000" will not fit. Only ever
 *  abbreviates — never converts. */
export function fmtMoneyShort(n: number | null | undefined, currency: Currency | string): string {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  const amount = Math.round(Number(n))
  const cur = asCurrency(typeof currency === 'string' ? currency : currency)
  const sym = cur === 'USD' ? '$' : 'RWF '
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`
  if (abs >= 10_000) return `${sym}${Math.round(amount / 1000)}k`
  return `${sym}${amount.toLocaleString('en-US')}`
}

// ─── Layout ──────────────────────────────────────────────────────────────────

/**
 * The opening of every page in the console.
 *
 * It was a bare h1 and a grey line, which meant thirty pages started with no
 * edge between the chrome above and the work below — on a dense queue the eye
 * had nothing to anchor on. It now sits on a hairline with the title's measure
 * capped, so a long description wraps into a readable column instead of running
 * the full 1280px and hitting 160 characters a line.
 *
 * `eyebrow` is optional and carries the thing a title cannot: what kind of page
 * this is, or how many records are behind it.
 */
export function PageHeader({
  title, description, eyebrow, action,
}: {
  title: string
  description?: string
  eyebrow?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 border-b border-line-soft pb-5 sm:mb-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1.5 text-micro font-bold uppercase tracking-[0.14em] text-content-muted">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-page-title font-extrabold tracking-[-0.02em] text-content">{title}</h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-label leading-relaxed text-content-muted">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  )
}

export function Card({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={`rounded-2xl border border-line-soft bg-surface shadow-card ${className}`}>
      {children}
    </div>
  )
}

/**
 * A titled band at the top of a Card.
 *
 * Pages were each hand-rolling this — a flex row, a bold span, sometimes a
 * border, sometimes not — so no two panels in the console lined up. One
 * component means the heading level, the rule and the padding are the same on
 * every page, and `hint` gives a panel somewhere to put its count or its
 * caveat without inventing another row.
 */
export function CardHeader({
  title, hint, action, as: Tag = 'h2', id,
}: {
  title: string
  hint?: string
  action?: ReactNode
  as?: 'h2' | 'h3'
  id?: string
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line-soft px-5 py-4">
      <div className="min-w-0">
        <Tag id={id} className="truncate text-label font-extrabold text-content">{title}</Tag>
        {hint ? <p className="mt-0.5 truncate text-caption text-content-muted">{hint}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

// ─── Direction ───────────────────────────────────────────────────────────────
// A count says how much is waiting. It cannot say whether that is better or
// worse than yesterday, which is the fact that decides what to do about it.

/** Which way this number is supposed to move. A backlog falling is good news;
 *  listings published falling is not. Without this the same arrow would have to
 *  mean both, so it would mean nothing. */
export type GoodDirection = 'up' | 'down'

export type Trend = {
  series: number[]
  delta: number
  goodDirection: GoodDirection
  kind?: 'flow' | 'backlog'
  /** What the current window totalled. Only a flow has one — a backlog's
   *  present value is the count on the tile, not a sum over days. */
  recent?: number
  previous?: number | null
}

/**
 * A movement, coloured by whether it is the movement you wanted.
 *
 * Deliberately NOT red when the news is bad: red is reserved across this
 * product for money, primary actions and blocking states, and a backlog that
 * grew by two is none of those. Amber carries "look at this"; red would
 * cry wolf on every ordinary Tuesday.
 */
export function Delta({ value, goodDirection, suffix = '' }: {
  value: number
  goodDirection: GoodDirection
  suffix?: string
}) {
  if (!value) {
    return <span className="text-caption font-semibold text-content-muted">no change</span>
  }
  const rising = value > 0
  const good = rising === (goodDirection === 'up')
  return (
    <span className={`inline-flex items-center gap-0.5 text-caption font-bold ${good ? 'text-success-text' : 'text-warning-text'}`}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={rising ? 'M6 15l6-6 6 6' : 'M18 9l-6 6-6-6'} />
      </svg>
      {Math.abs(value)}{suffix}
    </span>
  )
}

/**
 * Fourteen days of shape, in the space of a line of text.
 *
 * No axis, no labels, no tooltip — it is not there to be read off, it is there
 * so a glance answers "steady, climbing or falling" before the number is even
 * parsed. A flat series still draws a flat line rather than disappearing.
 *
 * It used to be a bare hairline in mid-grey, which on four cards in a row read
 * as decoration rather than data. Three things fix that without making it
 * loud: a soft fill anchored to the series floor, so the shape has a body; a
 * baseline, so a rise reads as a rise rather than a squiggle; and a solid dot
 * on the final point, because "where it ended" is the one value a glance
 * actually wants.
 */
export function Sparkline({ series, className = '' }: { series: number[]; className?: string }) {
  if (series.length < 2) return null
  const max = Math.max(...series)
  const min = Math.min(...series)
  const span = max - min || 1
  const step = 100 / (series.length - 1)
  const H = 24
  const TOP = 2
  const FLOOR = 22
  const y = (v: number) => FLOOR - ((v - min) / span) * (FLOOR - TOP)
  const pts = series.map((v, i) => [i * step, y(v)] as const)
  const line = pts.map(([x, py]) => `${x.toFixed(2)},${py.toFixed(2)}`).join(' ')
  const area = `0,${FLOOR} ${line} 100,${FLOOR}`
  const [lastX, lastY] = pts[pts.length - 1]
  const id = `spark-${series.length}-${Math.round(min)}-${Math.round(max)}`
  return (
    <svg
      viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" fill="none" aria-hidden
      className={`h-6 w-full overflow-visible text-content-muted ${className}`}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.20" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* The floor the fill sits on — without it a rise and a fall look alike. */}
      <line x1="0" y1={FLOOR} x2="100" y2={FLOOR} stroke="currentColor" strokeOpacity="0.22" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <polygon points={area} fill={`url(#${id})`} />
      <polyline
        points={line} stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
      />
      {/* Where it ended. Drawn in the viewBox's own units on x, but given a
          non-scaling stroke ring so the preserveAspectRatio="none" squash
          cannot turn it into an ellipse. */}
      <circle cx={lastX} cy={lastY} r="2" fill="currentColor" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// ─── Stat tile ───────────────────────────────────────────────────────────────

export function StatCard({
  label, value, sub, icon, tone = 'neutral', href, trend,
}: {
  label: string
  value: string | number
  sub?: string
  icon: IconName
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'info'
  href?: string
  trend?: Trend
}) {
  const tones = {
    neutral: 'bg-surface-alt text-content-secondary',
    brand: 'bg-brand-tint text-brand',
    success: 'bg-success-tint text-success-text',
    warning: 'bg-warning-tint text-warning-text',
    info: 'bg-info-tint text-info',
  }
  // With a trend the icon becomes a quiet corner mark rather than a tinted
  // block: four identical coloured squircles in a row were the loudest thing
  // on the dashboard and the least informative.
  //
  // Both variants share one geometry now — label row, then the number, then
  // the supporting line — so a row that mixes trended and untrended tiles has
  // its numbers on one baseline instead of two. They did not before: the
  // untrended tile put its icon in the reading path, which pushed its label
  // and its value right by 56px and made a four-tile row look ragged.
  const body = (
    <div className="flex h-full flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-label font-semibold text-content-muted">{label}</p>
        <span className={`shrink-0 ${trend ? 'text-gray-400' : `flex h-7 w-7 items-center justify-center rounded-lg ${tones[tone]}`}`}>
          <Icon name={icon} size={trend ? 15 : 15} />
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        {/* tnum, always: these tiles poll, and proportional digits make a row
            of counts shimmer sideways every time one of them ticks over. */}
        <p className="tnum text-stat font-extrabold leading-none text-content">{value}</p>
        {trend ? <Delta value={trend.delta} goodDirection={trend.goodDirection} /> : null}
      </div>

      {trend ? <Sparkline series={trend.series} /> : null}

      {/* mt-auto pins the supporting line to the bottom edge, so tiles with and
          without a sparkline still end level in the same grid row. */}
      {sub ? <p className="mt-auto text-caption leading-snug text-content-muted">{sub}</p> : null}
    </div>
  )
  const cls =
    'group block h-full rounded-2xl border border-line-soft bg-surface shadow-card transition-all duration-200 ' +
    (href ? 'hover:-translate-y-0.5 hover:border-line hover:shadow-card-lg' : '')
  return href ? <a href={href} className={cls}>{body}</a> : <div className={cls}>{body}</div>
}

// ─── Status pill — same vocabulary as the website's StatusPill ───────────────

const PILL_TONES: Record<string, string> = {
  live: 'bg-success-tint text-success-text', complete: 'bg-success-tint text-success-text',
  approved: 'bg-success-tint text-success-text', resolved: 'bg-success-tint text-success-text',
  active: 'bg-success-tint text-success-text', paid: 'bg-success-tint text-success-text',
  confirmed: 'bg-info-tint text-info', scheduled: 'bg-info-tint text-info',
  inspecting: 'bg-info-tint text-info', inspected: 'bg-info-tint text-info',
  upcoming: 'bg-info-tint text-info',
  under_review: 'bg-warning-tint text-warning-text', pending: 'bg-warning-tint text-warning-text',
  open: 'bg-warning-tint text-warning-text', due: 'bg-warning-tint text-warning-text',
  reserved: 'bg-[#F5F3FF] text-[#7C3AED]',
  // Contract lifecycle. 'signed' is the terminal good state (a paper copy exists),
  // 'draft' means a number is held but no PDF was written, and superseded/void
  // numbers stay in the register greyed out — they are history, not failures.
  signed: 'bg-success-tint text-success-text', issued: 'bg-info-tint text-info',
  draft: 'bg-warning-tint text-warning-text',
  superseded: 'bg-surface-alt text-content-muted', void: 'bg-surface-alt text-content-muted',
  sold: 'bg-surface-alt text-content-muted', archived: 'bg-surface-alt text-content-muted',
  cancelled: 'bg-surface-alt text-content-muted', waived: 'bg-surface-alt text-content-muted',
  retired: 'bg-surface-alt text-content-muted', maintenance: 'bg-warning-tint text-warning-text',
  rejected: 'bg-danger-tint text-danger-strong',
}

/**
 * Status, as a pill.
 *
 * The dot is not decoration. A tinted pill distinguishes eleven states by
 * background colour alone, which fails for the ~8% of men with a colour vision
 * deficiency and for anyone reading a printed queue — and this console runs
 * eleven of them in one table. The dot repeats the state as a second, stronger
 * channel (it is `currentColor`, so it always carries the pill's own semantic
 * hue at full strength against the tint), and the text has always been the
 * third. Colour is now the reinforcement, not the message.
 */
export function Pill({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-bold leading-none ${
        PILL_TONES[status] ?? 'bg-surface-alt text-content-muted'
      }`}
    >
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
      {label ?? status.replace(/_/g, ' ')}
    </span>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

export function EmptyState({
  icon = 'search', title, description,
}: {
  icon?: IconName
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-alt text-content-muted">
        <Icon name={icon} size={22} />
      </span>
      <p className="text-body font-bold text-content">{title}</p>
      {description ? <p className="mt-1 max-w-xs text-caption leading-relaxed text-content-muted">{description}</p> : null}
    </div>
  )
}

// ─── Loading / error ─────────────────────────────────────────────────────────
// These did not exist. `EmptyState` was the only state primitive, used on 3 of
// 17 pages, and there was no error state at all — so seven pages did this:
//
//   catch (e) { console.error(e.message) }        // then rendered "No listings."
//
// which makes an outage, an expired session and a genuinely empty queue look
// identical. That is how someone makes a confident wrong decision. `ErrorState`
// exists so a failure has somewhere to go.

/** Row-shaped placeholder. Matches the final layout so nothing jumps when the
 *  real content arrives — a centred spinner reflows the whole page. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-alt ${className}`} />
}

export function LoadingState({ rows = 5, label = 'Loading…' }: { rows?: number; label?: string }) {
  return (
    <div className="space-y-2 p-1" role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  )
}

/**
 * A failure the operator can act on: what broke, whether retrying is worth it,
 * and a button that does it.
 *
 * `error` may be an ApiError, so a dead session is named as such instead of
 * being reported as a generic failure — the layout will bounce to /login, and
 * saying "your session expired" explains why the screen is about to change.
 */
export function ErrorState({
  error, onRetry, title,
}: {
  error: unknown
  onRetry?: () => void
  title?: string
}) {
  const status = (error as { status?: number } | null)?.status
  const message =
    error instanceof Error ? error.message : 'Something went wrong loading this page.'

  const unreachable = status === 0 || status === 502 || status === 504
  const expired = status === 401
  const heading =
    title ?? (unreachable ? 'Cannot reach the API' : expired ? 'Session expired' : 'Could not load this')

  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-tint text-danger-strong">
        <Icon name="alert" size={22} />
      </span>
      <p className="text-body font-bold text-content">{heading}</p>
      <p className="mt-1.5 max-w-sm text-caption leading-relaxed text-content-secondary">
        {expired
          ? 'Sign in again to continue.'
          : unreachable
            ? 'The dashboard could not reach the Sawa API. Nothing you are seeing is current.'
            : message}
      </p>
      {/* Retrying a 401 just fails again — the layout handles that redirect. */}
      {onRetry && !expired ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-ink-900 px-4 text-label font-semibold text-white transition-colors hover:bg-ink-800"
        >
          <Icon name="refresh" size={15} />
          Try again
        </button>
      ) : null}
    </div>
  )
}

/**
 * The whole load lifecycle in one place, so a page cannot accidentally collapse
 * error into empty: pass all three and it is structurally impossible.
 */
export function AsyncState({
  loading, error, isEmpty, onRetry, empty, rows, children,
}: {
  loading: boolean
  error: unknown
  isEmpty: boolean
  onRetry?: () => void
  empty: ReactNode
  rows?: number
  children: ReactNode
}) {
  if (loading) return <LoadingState rows={rows} />
  if (error) return <ErrorState error={error} onRetry={onRetry} />
  if (isEmpty) return <>{empty}</>
  return <>{children}</>
}

// ─── Bar chart (SVG, dependency-free, zero-state aware) ──────────────────────

export function BarChart({
  data, height = 140, formatValue = (v) => String(v), emptyLabel = 'No data yet',
  compare = false, seriesLabel = 'Value', compareLabel = 'Previous period',
}: {
  data: { label: string; value: number }[]
  height?: number
  formatValue?: (v: number) => string
  emptyLabel?: string
  /** Draw each column against the one before it as a ghost bar. A bar on its
   *  own says how big; a bar beside its predecessor says which way things are
   *  going, which is the only reason to look at a time series at all. */
  compare?: boolean
  /** Names the two marks. Two marks on a plot need a legend — without one the
   *  ghost bar is an unexplained shape. */
  seriesLabel?: string
  compareLabel?: string
}) {
  const max = Math.max(...data.map((d) => d.value), 0)
  if (!data.length || max === 0) {
    return <EmptyState icon="chart" title={emptyLabel} description="This chart fills in as real activity is recorded." />
  }
  const plot = height - 40

  // One sentence that carries the chart's point in text. A bar chart is a
  // picture; a screen reader gets nothing from it, and neither does anyone
  // reading a printout. The table below is the exact-value fallback.
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a))
  const first = data[0]
  const last = data[data.length - 1]
  const summary =
    `${seriesLabel} across ${data.length} periods, ${first.label} to ${last.label}. ` +
    `Highest ${peak.label} at ${formatValue(peak.value)}. ` +
    `Latest ${last.label} at ${formatValue(last.value)}.`

  return (
    <figure className="m-0">
      {compare ? (
        <div className="mb-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5 text-micro font-semibold text-content-muted">
            <span className="h-2.5 w-2.5 rounded-sm bg-content-muted" aria-hidden />
            {seriesLabel}
          </span>
          <span className="flex items-center gap-1.5 text-micro font-semibold text-content-muted">
            <span className="h-2.5 w-2.5 rounded-sm bg-line-soft ring-1 ring-inset ring-line" aria-hidden />
            {compareLabel}
          </span>
        </div>
      ) : null}

      <div className="relative" style={{ height }}>
        {/* One dashed line at the maximum and one solid rule at the floor. Both
            sit behind the bars so a value can be read against something rather
            than floating. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-line" />
        <div className="pointer-events-none absolute inset-x-0 border-t border-line" style={{ bottom: 18 }} />
        <div className="flex h-full items-end gap-2">
          {data.map((d, index) => {
            const h = Math.max(6, Math.round((d.value / max) * plot))
            const previous = compare && index > 0 ? data[index - 1].value : null
            const ghost = previous == null ? 0 : Math.max(3, Math.round((previous / max) * plot))
            const delta = previous == null || previous === 0 ? null
              : Math.round(((d.value - previous) / previous) * 100)
            // Focusable, so the exact values are reachable from the keyboard
            // and not only from a pointer that happens to hover.
            const tip = previous == null
              ? `${d.label}: ${formatValue(d.value)}`
              : `${d.label}: ${formatValue(d.value)} · ${compareLabel.toLowerCase()} ${formatValue(previous)}` +
                (delta == null ? '' : ` · ${delta > 0 ? '+' : ''}${delta}%`)
            return (
              <div
                key={d.label}
                tabIndex={0}
                title={tip}
                aria-label={tip}
                className="group relative flex min-w-0 flex-1 cursor-default flex-col items-center justify-end gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {/* Hover and focus both raise it. A tooltip only a mouse can
                    reach is not a tooltip. */}
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink-900 px-2.5 py-1.5 text-micro font-semibold text-white shadow-card-lg group-hover:block group-focus-visible:block"
                >
                  {tip}
                </span>
                <span className="text-micro font-bold tabular-nums text-content-secondary">{formatValue(d.value)}</span>
                <div className="flex w-full items-end justify-center gap-[3px]">
                  {previous == null ? null : (
                    <div className="w-2 shrink-0 rounded-t-sm bg-line-soft ring-1 ring-inset ring-line" style={{ height: ghost }} aria-hidden />
                  )}
                  <div
                    // A bar is a graphic, so 3:1 against the surface is the floor.
                    // gray-300 measured 1.27:1 — present in the DOM, absent to the
                    // eye. Solid content-muted is 4.90:1 and still reads as clearly
                    // secondary next to the ink-800 maximum at 15.5:1.
                    className={`w-full max-w-[36px] rounded-t-md ${d.value === max ? 'bg-ink-800' : 'bg-content-muted'}`}
                    style={{ height: h }}
                  />
                </div>
                <span className="w-full truncate text-center text-micro text-content-muted">{d.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* The exact numbers, for a screen reader and for anyone who wants to
          read rather than estimate off a bar. Visually hidden, never absent. */}
      <figcaption className="sr-only">{summary}</figcaption>
      <table className="sr-only">
        <caption>{seriesLabel} by period</caption>
        <thead>
          <tr><th scope="col">Period</th><th scope="col">{seriesLabel}</th></tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}><th scope="row">{d.label}</th><td>{formatValue(d.value)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

export { Icon }
export type { IconName }
