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

export function PageHeader({
  title, description, action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-page-title font-extrabold text-content">{title}</h1>
        {description ? <p className="mt-1 text-label text-content-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
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
 */
export function Sparkline({ series, className = '' }: { series: number[]; className?: string }) {
  if (series.length < 2) return null
  const max = Math.max(...series)
  const min = Math.min(...series)
  const span = max - min || 1
  const step = 100 / (series.length - 1)
  const points = series
    .map((value, index) => `${(index * step).toFixed(2)},${(22 - ((value - min) / span) * 20).toFixed(2)}`)
    .join(' ')
  return (
    <svg
      viewBox="0 0 100 24" preserveAspectRatio="none" fill="none" aria-hidden
      className={`h-6 w-full text-gray-400 ${className}`}
    >
      <polyline
        points={points} stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
      />
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
  const body = trend ? (
    <div className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-label font-semibold text-content-muted">{label}</p>
        <span className="shrink-0 text-gray-400"><Icon name={icon} size={15} /></span>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-stat font-extrabold tabular-nums text-content">{value}</p>
        <Delta value={trend.delta} goodDirection={trend.goodDirection} />
      </div>
      <Sparkline series={trend.series} />
      {sub ? <p className="text-caption text-content-muted">{sub}</p> : null}
    </div>
  ) : (
    <div className="flex items-start gap-4 p-5">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon name={icon} size={19} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-label font-semibold text-content-muted">{label}</p>
        <p className="mt-1 text-stat font-extrabold text-content">
          {value}
        </p>
        {sub ? <p className="mt-1.5 text-caption text-content-muted">{sub}</p> : null}
      </div>
    </div>
  )
  const cls =
    'block rounded-2xl border border-line-soft bg-surface shadow-card transition-all duration-200 ' +
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

export function Pill({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-caption font-bold leading-none ${
        PILL_TONES[status] ?? 'bg-surface-alt text-content-muted'
      }`}
    >
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
  compare = false,
}: {
  data: { label: string; value: number }[]
  height?: number
  formatValue?: (v: number) => string
  emptyLabel?: string
  /** Draw each column against the one before it as a ghost bar. A bar on its
   *  own says how big; a bar beside its predecessor says which way things are
   *  going, which is the only reason to look at a time series at all. */
  compare?: boolean
}) {
  const max = Math.max(...data.map((d) => d.value), 0)
  if (!data.length || max === 0) {
    return <EmptyState icon="chart" title={emptyLabel} description="This chart fills in as real activity is recorded." />
  }
  const plot = height - 40
  return (
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
          return (
            <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-micro font-bold tabular-nums text-content-secondary">{formatValue(d.value)}</span>
              <div className="flex w-full items-end justify-center gap-[3px]">
                {previous == null ? null : (
                  <div className="w-2 shrink-0 rounded-t-sm bg-line-soft" style={{ height: ghost }} aria-hidden />
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
  )
}

export { Icon }
export type { IconName }
