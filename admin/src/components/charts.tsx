'use client'

// ─────────────────────────────────────────────────────────────────────────────
// The chart kit for the Insights pages.
//
// Rules this file enforces, so no page has to remember them:
//
//  • Data is never drawn in Signal Red. Series take --data-1…5 in a fixed order
//    (blue, aqua, amber, violet, magenta) and the previous period is a
//    recessive grey. Red stays the colour of the primary action and of an SLA
//    breach, so a chart never reads as an alarm.
//  • Identity is never colour alone. Two or more series get a legend; the
//    previous period is also dashed (lines) or thinner (bars); every value is
//    reachable as text — on hover, on keyboard focus, and in a table view.
//  • One axis. Two measures of different scale are two charts.
//  • Numbers are tabular so columns of figures do not shimmer.
//
// Colours were checked with the dataviz skill's validator against the console's
// own card surfaces (#FFFFFF light, #1E1A18 dark). See globals.css.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { Icon } from './Icon'
import { fmtDayMonth, fmtInt, fmtWeekday } from '@/lib/format'

export type Tone = 1 | 2 | 3 | 4 | 5
const toneRgb = (t: Tone | 'prev', alpha = 1) => `rgb(var(--data-${t}) / ${alpha})`
const PREV_LINE = 'rgb(var(--content-muted) / 0.7)'

// ─── Numbers ─────────────────────────────────────────────────────────────────

/** A round axis maximum: 1, 2, 2.5 or 5 × 10ⁿ at or above `v`. */
function niceMax(v: number): number {
  if (v <= 0) return 1
  const exp = Math.floor(Math.log10(v))
  const base = 10 ** exp
  for (const m of [1, 2, 2.5, 5, 10]) if (m * base >= v) return m * base
  return 10 * base
}

/**
 * Axis ticks on round steps (1, 2 or 5 × 10ⁿ), about four of them. Counts are
 * whole numbers, so the step never drops below 1 — an axis reading
 * 0, 1, 3, 4, 5 (quarters of 5, rounded) is worse than no axis.
 */
function niceTicks(dataMax: number, target = 4): number[] {
  const raw = Math.max(dataMax, 1) / target
  const exp = Math.floor(Math.log10(raw))
  const base = 10 ** exp
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * base).find((c) => c >= raw) ?? 10 * base)
  const top = Math.max(step, Math.ceil(Math.max(dataMax, 1) / step) * step)
  const out: number[] = []
  for (let t = 0; t <= top + step / 2; t += step) out.push(t)
  return out
}

/** Percentage change, or null when there is nothing to compare against. */
export function pctChange(current: number, previous: number | null | undefined): number | null {
  if (previous == null || previous === 0) return null
  return Math.round(((current - previous) / Math.abs(previous)) * 100)
}

// ─── Delta ───────────────────────────────────────────────────────────────────

/**
 * "↑ 12% vs previous 30 days". The period is part of the label, always: a bare
 * "↑15" beside "10" read as a contradiction on the old Action Center.
 * Good movement is green, bad is amber — never red (see ui.tsx Delta).
 */
export function PeriodDelta({
  current, previous, goodDirection = 'up', periodLabel, compact = false,
}: {
  current: number
  previous: number | null | undefined
  goodDirection?: 'up' | 'down'
  periodLabel: string
  compact?: boolean
}) {
  if (previous == null) return null
  const pct = pctChange(current, previous)
  const vs = compact ? '' : ` vs ${periodLabel}`
  if (current === previous) {
    return <span className="text-caption font-semibold text-content-muted">No change{vs}</span>
  }
  if (pct == null) {
    return <span className="text-caption font-semibold text-content-muted">New · none in {periodLabel}</span>
  }
  const rising = current > previous
  const good = rising === (goodDirection === 'up')
  return (
    <span className={`inline-flex items-center gap-1 text-caption font-bold ${good ? 'text-success-text' : 'text-warning-text'}`}>
      <Icon name={rising ? 'arrow-up' : 'arrow-down'} size={12} />
      <span className="tnum">{Math.abs(pct)}%</span>
      <span className="font-semibold text-content-muted">{vs}</span>
    </span>
  )
}

// ─── Sparkline (current vs previous) ─────────────────────────────────────────

function MiniLines({ current, previous }: { current: number[]; previous?: number[] | null }) {
  if (current.length < 2) return null
  const all = [...current, ...(previous ?? [])]
  const max = Math.max(...all, 1)
  const W = 100
  const H = 28
  const pts = (vals: number[]) => vals
    .map((v, i) => `${((i / (vals.length - 1)) * W).toFixed(2)},${(H - 2 - (v / max) * (H - 4)).toFixed(2)}`)
    .join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-7 w-full overflow-visible" aria-hidden>
      {previous && previous.length > 1 ? (
        <polyline points={pts(previous)} fill="none" stroke={PREV_LINE} strokeWidth="1.25" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      ) : null}
      <polyline points={`0,${H} ${pts(current)} ${W},${H}`} fill={toneRgb(1, 0.1)} stroke="none" />
      <polyline points={pts(current)} fill="none" stroke={toneRgb(1)} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// ─── KPI tile ────────────────────────────────────────────────────────────────

export function KpiTile({
  label, value, current, previous, goodDirection = 'up', periodLabel, compare = true,
  series, previousSeries, href, hint,
}: {
  label: string
  /** The formatted headline. */
  value: string
  current: number
  previous?: number | null
  goodDirection?: 'up' | 'down'
  periodLabel: string
  compare?: boolean
  series?: number[]
  previousSeries?: number[] | null
  href?: string
  hint?: string
}) {
  const body = (
    <div className="flex h-full flex-col gap-2.5 p-4 sm:p-5">
      <p className="text-label font-semibold text-content-muted">{label}</p>
      <p className="tnum text-stat font-extrabold leading-none text-content">{value}</p>
      {compare ? (
        <PeriodDelta current={current} previous={previous} goodDirection={goodDirection} periodLabel={periodLabel} />
      ) : null}
      {series && series.length > 1 ? (
        <div className="mt-auto pt-1"><MiniLines current={series} previous={compare ? previousSeries : null} /></div>
      ) : null}
      {hint ? <p className="text-caption leading-snug text-content-muted">{hint}</p> : null}
    </div>
  )
  const cls = 'block h-full rounded-2xl border border-line-soft bg-surface shadow-card'
  return href
    ? <Link href={href} className={`${cls} transition-colors hover:border-line`}>{body}</Link>
    : <div className={cls}>{body}</div>
}

// ─── Legend ──────────────────────────────────────────────────────────────────

export type LegendItem = { label: string; tone: Tone | 'prev'; shape?: 'line' | 'dash' | 'square' }

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-label="Legend">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5 text-caption font-semibold text-content-secondary">
          {it.shape === 'square' ? (
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: it.tone === 'prev' ? toneRgb('prev') : toneRgb(it.tone) }} aria-hidden />
          ) : (
            <svg width="18" height="8" aria-hidden>
              <line x1="1" y1="4" x2="17" y2="4" strokeWidth="2" strokeLinecap="round"
                stroke={it.tone === 'prev' ? PREV_LINE : toneRgb(it.tone)}
                strokeDasharray={it.shape === 'dash' || it.tone === 'prev' ? '3 3' : undefined} />
            </svg>
          )}
          {it.label}
        </li>
      ))}
    </ul>
  )
}

// ─── Chart frame: title, legend, chart/table toggle ──────────────────────────

export type TableColumn = { key: string; label: string; align?: 'left' | 'right'; format?: (v: any, row: any) => ReactNode }

export function DataTable({ columns, rows, caption }: { columns: TableColumn[]; rows: Record<string, any>[]; caption: string }) {
  // Click a heading to sort by it; again to reverse. Numbers sort as numbers,
  // blanks sink to the bottom either way.
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const sorted = useMemo(() => {
    if (!sort) return rows
    return [...rows].sort((a, b) => {
      const x = a[sort.key]
      const y = b[sort.key]
      if (x == null && y == null) return 0
      if (x == null) return 1
      if (y == null) return -1
      const nx = Number(x)
      const ny = Number(y)
      const cmp = !Number.isNaN(nx) && !Number.isNaN(ny) && typeof x !== 'boolean'
        ? nx - ny
        : String(x).localeCompare(String(y), 'en-GB', { numeric: true })
      return cmp * sort.dir
    })
  }, [rows, sort])
  return (
    <div className="max-h-[420px] overflow-auto rounded-xl border border-line-soft">
      <table className="w-full min-w-[420px] border-collapse text-label">
        <caption className="sr-only">{caption}. Select a column heading to sort.</caption>
        <thead className="sticky top-0 z-[1] bg-surface-alt">
          <tr>
            {columns.map((c) => {
              const on = sort?.key === c.key
              return (
                <th key={c.key} scope="col" aria-sort={on ? (sort!.dir === 1 ? 'ascending' : 'descending') : 'none'}
                  className={`px-3 py-2 text-caption font-bold text-content-muted ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                  <button type="button" onClick={() => setSort(on ? { key: c.key, dir: sort!.dir === 1 ? -1 : 1 } : { key: c.key, dir: c.align === 'right' ? -1 : 1 })}
                    className={`inline-flex items-center gap-1 rounded hover:text-content ${on ? 'text-content' : ''}`}>
                    {c.label}
                    <Icon name={on ? (sort!.dir === 1 ? 'arrow-up' : 'arrow-down') : 'arrow-up-down'} size={11} className={on ? '' : 'opacity-40'} />
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={i} className="border-t border-line-soft">
              {columns.map((c, j) => {
                const v = c.format ? c.format(r[c.key], r) : r[c.key]
                const Cell = j === 0 ? 'th' : 'td'
                return (
                  <Cell key={c.key} {...(j === 0 ? { scope: 'row' } : {})}
                    className={`px-3 py-2 ${j === 0 ? 'font-semibold text-content' : 'text-content-secondary'} ${c.align === 'right' ? 'tnum text-right' : 'text-left'}`}>
                    {v ?? '—'}
                  </Cell>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ChartFrame({
  title, hint, legend, table, actions, toolbar, children, className = '',
}: {
  title: string
  hint?: string
  /** Controls that change what the chart shows (a measure switch). Sits above the legend. */
  toolbar?: ReactNode
  legend?: LegendItem[]
  table?: { columns: TableColumn[]; rows: Record<string, any>[] }
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={`min-w-0 rounded-2xl border border-line-soft bg-surface shadow-card ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pb-3 pt-4">
        <div className="min-w-0">
          <h2 id={headingId} className="text-label font-extrabold text-content">{title}</h2>
          {hint ? <p className="mt-0.5 text-caption text-content-muted">{hint}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {table ? (
            <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label={`${title}: view as`}>
              {(['chart', 'table'] as const).map((v) => (
                <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v}
                  className={`flex h-7 items-center gap-1 rounded-md px-2 text-caption font-bold transition-colors ${view === v ? 'bg-surface-alt text-content' : 'text-content-muted hover:text-content'}`}>
                  <Icon name={v === 'chart' ? 'chart-line' : 'table'} size={13} />
                  {v === 'chart' ? 'Chart' : 'Table'}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {toolbar ? <div className="px-5 pb-3">{toolbar}</div> : null}
      {legend && legend.length > 1 && view === 'chart' ? <div className="px-5 pb-2"><Legend items={legend} /></div> : null}
      <div className="px-5 pb-5">
        {view === 'table' && table ? <DataTable caption={title} columns={table.columns} rows={table.rows} /> : children}
      </div>
    </section>
  )
}

// ─── Line chart with crosshair ───────────────────────────────────────────────

export type LineSeries = {
  key: string
  label: string
  values: number[]
  /** A categorical slot, or 'prev' for the previous-period comparison. */
  tone: Tone | 'prev'
  /** Dates for this series' points, for the tooltip. Defaults to the chart's. */
  dates?: string[]
}

function useWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setWidth(Math.max(240, Math.round(el.getBoundingClientRect().width)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

export function LineChart({
  dates, series, format = (v) => fmtInt(v), height = 260, label,
}: {
  dates: string[]
  series: LineSeries[]
  format?: (v: number) => string
  height?: number
  /** One sentence naming what is plotted, for assistive tech. */
  label: string
}) {
  const [wrapRef, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const n = dates.length
  const PAD = { l: 52, r: 14, t: 12, b: 28 }
  const plotW = width - PAD.l - PAD.r
  const plotH = height - PAD.t - PAD.b
  const ticks = niceTicks(Math.max(0, ...series.flatMap((s) => s.values)))
  const max = ticks[ticks.length - 1]
  const x = (i: number) => PAD.l + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const y = (v: number) => PAD.t + plotH - (v / max) * plotH
  const xTicks = useMemo(() => {
    if (n <= 1) return [0]
    const count = Math.min(n, width < 480 ? 3 : 6)
    return Array.from({ length: count }, (_, k) => Math.round((k / (count - 1)) * (n - 1)))
  }, [n, width])

  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const primary = series.find((s) => s.tone !== 'prev')

  const onPointer = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left
    const i = Math.round(((px - PAD.l) / Math.max(plotW, 1)) * (n - 1))
    setActive(Math.min(n - 1, Math.max(0, i)))
  }
  const onKey = (e: KeyboardEvent) => {
    const cur = active ?? n - 1
    const next = e.key === 'ArrowLeft' ? cur - 1 : e.key === 'ArrowRight' ? cur + 1
      : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null
    if (next == null) return
    e.preventDefault()
    setActive(Math.min(n - 1, Math.max(0, next)))
  }

  const tipLeft = active == null ? 0 : x(active)
  const flip = tipLeft > width * 0.62

  return (
    <div ref={wrapRef} className="relative">
      <div
        role="img"
        aria-label={`${label}. Use the left and right arrow keys to read each day.`}
        tabIndex={0}
        onKeyDown={onKey}
        onFocus={() => setActive((a) => a ?? n - 1)}
        onBlur={() => setActive(null)}
        className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <svg width={width} height={height} className="block touch-pan-y select-none"
          onPointerMove={(e) => onPointer(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerDown={(e) => onPointer(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setActive(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={width - PAD.r} y1={y(t)} y2={y(t)} stroke="rgb(var(--line-soft))" strokeWidth="1" />
              <text x={PAD.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-content-muted text-[11px] tnum">{format(t)}</text>
            </g>
          ))}
          {xTicks.map((i) => (
            <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
              className="fill-content-muted text-[11px]">{fmtDayMonth(dates[i])}</text>
          ))}
          {primary && n > 1 ? (
            <path d={`${path(primary.values)} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={toneRgb(primary.tone as Tone, 0.08)} />
          ) : null}
          {series.map((s) => (
            <path key={s.key} d={path(s.values)} fill="none"
              stroke={s.tone === 'prev' ? PREV_LINE : toneRgb(s.tone)}
              strokeWidth={s.tone === 'prev' ? 1.75 : 2.25} strokeDasharray={s.tone === 'prev' ? '4 4' : undefined}
              strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {n === 1 ? series.map((s) => (
            <circle key={s.key} cx={x(0)} cy={y(s.values[0] ?? 0)} r="4" fill={s.tone === 'prev' ? PREV_LINE : toneRgb(s.tone)} />
          )) : null}
          {active != null ? (
            <g aria-hidden>
              <line x1={x(active)} x2={x(active)} y1={PAD.t} y2={PAD.t + plotH} stroke="rgb(var(--content-muted) / 0.6)" strokeWidth="1" />
              {series.map((s) => (
                <circle key={s.key} cx={x(active)} cy={y(s.values[active] ?? 0)} r="4.5"
                  fill={s.tone === 'prev' ? 'rgb(var(--content-muted))' : toneRgb(s.tone)}
                  stroke="rgb(var(--surface))" strokeWidth="2" />
              ))}
            </g>
          ) : null}
        </svg>
      </div>
      {active != null ? (
        <div role="status" aria-live="polite"
          className="pointer-events-none absolute top-2 z-10 min-w-[170px] rounded-xl border border-line bg-surface px-3 py-2.5 shadow-card-lg"
          style={flip ? { right: width - tipLeft + 12 } : { left: tipLeft + 12 }}>
          <p className="mb-1.5 text-caption font-bold text-content">{fmtWeekday(dates[active])}</p>
          <ul className="space-y-1">
            {series.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-4 text-caption">
                <span className="flex items-center gap-1.5 text-content-secondary">
                  <svg width="12" height="6" aria-hidden><line x1="1" y1="3" x2="11" y2="3" strokeWidth="2" strokeLinecap="round" stroke={s.tone === 'prev' ? PREV_LINE : toneRgb(s.tone)} strokeDasharray={s.tone === 'prev' ? '2 2' : undefined} /></svg>
                  {s.label}{s.dates?.[active] ? <span className="text-content-muted">· {fmtDayMonth(s.dates[active])}</span> : null}
                </span>
                <span className="tnum font-bold text-content">{format(s.values[active] ?? 0)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

// ─── Horizontal bars with a previous-period marker ───────────────────────────

export type BarItem = { key: string; label: string; value: number; previous?: number | null; href?: string; note?: string }

export function BarList({
  items, format = (v) => fmtInt(v), tone = 1, compare = false, periodLabel = 'previous period', emptyLabel = 'Nothing recorded in this window',
  limit, moreLabel = 'more',
}: {
  items: BarItem[]
  format?: (v: number) => string
  tone?: Tone
  compare?: boolean
  periodLabel?: string
  emptyLabel?: string
  /** Show the first N and say how many more the table view holds. */
  limit?: number
  moreLabel?: string
}) {
  const max = Math.max(1, ...items.map((i) => Math.max(i.value, compare ? i.previous ?? 0 : 0)))
  if (!items.length || items.every((i) => !i.value && !(compare && i.previous))) {
    return <p className="py-8 text-center text-label text-content-muted">{emptyLabel}</p>
  }
  const shown = limit ? items.slice(0, limit) : items
  const hidden = items.length - shown.length
  return (
    <ul className="space-y-3.5">
      {shown.map((it) => {
        const w = it.value ? Math.max(1.5, (it.value / max) * 100) : 0
        const pw = compare && it.previous ? Math.max(1.5, (it.previous / max) * 100) : 0
        const row = (
          <>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-label font-semibold text-content-secondary">{it.label}</span>
              <span className="shrink-0 text-label">
                <span className="tnum font-extrabold text-content">{format(it.value)}</span>
                {compare && it.previous != null ? (
                  <span className="tnum ml-1.5 text-caption text-content-muted">({format(it.previous)} before)</span>
                ) : null}
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-surface-alt">
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${w}%`, background: toneRgb(tone) }} />
            </div>
            {compare && it.previous != null ? (
              <div className="mt-[3px] h-[3px] rounded-full" style={{ width: `${pw}%`, background: toneRgb('prev') }} aria-hidden />
            ) : null}
            {it.note ? <p className="mt-1 text-caption text-content-muted">{it.note}</p> : null}
          </>
        )
        const aria = `${it.label}: ${format(it.value)}${compare && it.previous != null ? `, ${format(it.previous)} in the ${periodLabel}` : ''}`
        return (
          <li key={it.key} aria-label={aria}>
            {it.href ? <Link href={it.href} className="block rounded-lg outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand">{row}</Link> : row}
          </li>
        )
      })}
      {hidden > 0 ? (
        <li className="text-caption text-content-muted">
          {hidden} {moreLabel} with smaller values. Switch to Table to see every row.
        </li>
      ) : null}
    </ul>
  )
}

// ─── Column chart (ordered bins) ─────────────────────────────────────────────

export function ColumnChart({
  items, format = (v) => fmtInt(v), height = 180, label, flag,
}: {
  /** `muted` draws a bin in neutral grey: it sits outside the order (e.g. "not recorded"). */
  items: { key: string; label: string; value: number; muted?: boolean }[]
  format?: (v: number) => string
  height?: number
  label: string
  /** Bins to mark with a status label, e.g. scores below the publish line. */
  flag?: { keys: string[]; text: string }
}) {
  const max = niceMax(Math.max(1, ...items.map((i) => i.value)))
  const [hover, setHover] = useState<string | null>(null)
  return (
    <figure className="m-0" aria-label={label}>
      <div className="flex items-end gap-2" style={{ height }}>
        {items.map((it, i) => {
          const h = it.value ? Math.max(4, (it.value / max) * (height - 34)) : 0
          const flagged = flag?.keys.includes(it.key)
          const shade = (Math.min(5, 2 + Math.round((i / Math.max(1, items.length - 1)) * 3))) as 1 | 2 | 3 | 4 | 5
          return (
            <div key={it.key} tabIndex={0} aria-label={`${it.label}: ${format(it.value)}${flagged ? `. ${flag?.text}` : ''}`}
              onMouseEnter={() => setHover(it.key)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(it.key)} onBlur={() => setHover(null)}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand">
              <span className={`tnum text-caption font-bold ${hover === it.key ? 'text-content' : 'text-content-secondary'}`}>{format(it.value)}</span>
              <div className="w-full max-w-[56px] rounded-t-[4px]"
                style={{ height: h, background: flagged ? 'rgb(var(--warning))' : it.muted ? 'rgb(var(--content-muted) / 0.45)' : `rgb(var(--ramp-${shade}))`, opacity: hover && hover !== it.key ? 0.55 : 1 }} />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-2 border-t border-line pt-1.5">
        {items.map((it) => (
          <span key={it.key} className="min-w-0 flex-1 truncate text-center text-caption text-content-muted">{it.label}</span>
        ))}
      </div>
      {flag && items.some((i) => flag.keys.includes(i.key) && i.value) ? (
        <p className="mt-2 flex items-center gap-1.5 text-caption font-semibold text-warning-text">
          <Icon name="alert" size={13} />{flag.text}
        </p>
      ) : null}
    </figure>
  )
}

// ─── Funnel ──────────────────────────────────────────────────────────────────

export type FunnelStepView = {
  key: string; label: string; count: number
  of_start: number | null; from_previous: number | null; median_days: number | null
}

/**
 * A cohort funnel. Bars are the share of the starting cohort, in one hue from
 * dark (everyone) to light (the few who got furthest). The step that loses the
 * most people is named in words, with an icon — not just a paler bar.
 */
export function Funnel({ steps, unit = 'submissions' }: { steps: FunnelStepView[]; unit?: string }) {
  const start = steps[0]?.count ?? 0
  if (!start) return <p className="py-8 text-center text-label text-content-muted">No {unit} started in this window.</p>
  // The biggest drop: the lowest step conversion after the first step.
  const hasMedians = steps.some((s) => s.median_days != null)
  const worst = steps.slice(1).reduce<FunnelStepView | null>((w, s) =>
    s.from_previous != null && (w == null || (w.from_previous ?? 101) > s.from_previous) ? s : w, null)
  return (
    <ol className="space-y-2.5">
      {steps.map((s, i) => {
        const w = s.of_start ?? 0
        const shade = Math.max(1, 5 - Math.floor((i / Math.max(1, steps.length - 1)) * 4)) as 1 | 2 | 3 | 4 | 5
        const isWorst = worst?.key === s.key && (s.from_previous ?? 100) < 100
        return (
          <li key={s.key} className={`grid grid-cols-[minmax(120px,170px)_1fr] items-center gap-x-3 gap-y-1 ${hasMedians ? 'sm:grid-cols-[170px_1fr_7rem_6rem]' : 'sm:grid-cols-[170px_1fr_7rem]'}`}>
            <div className="min-w-0">
              <p className="truncate text-label font-semibold text-content">{s.label}</p>
              {i > 0 ? (
                <p className={`flex items-center gap-1 text-caption ${isWorst ? 'font-bold text-warning-text' : 'text-content-muted'}`}>
                  {isWorst ? <Icon name="trending-down" size={12} /> : null}
                  <span className="tnum">{s.from_previous == null ? '—' : `${s.from_previous}%`}</span> of the step before
                  {isWorst ? <span className="sr-only">. The biggest drop in this funnel.</span> : null}
                </p>
              ) : <p className="text-caption text-content-muted">The cohort</p>}
            </div>
            {/* The figure sits beside the bar, never on it: white on the
                mid-blue step measured 4.4:1, and the dark theme's ramp runs
                the other way, so no one text colour is safe on every step. */}
            <div className="h-3 rounded-full bg-surface-alt" aria-hidden>
              <div className="h-full rounded-full" style={{ width: `${Math.max(w ? 1 : 0, w)}%`, background: `rgb(var(--ramp-${shade}))` }} />
            </div>
            <p className="tnum text-label sm:text-right">
              <span className="font-extrabold text-content">{fmtInt(s.count)}</span>
              <span className="ml-1.5 text-caption text-content-muted">{s.of_start ?? 0}%</span>
            </p>
            {hasMedians ? (
              <p className="text-caption text-content-muted sm:text-right">
                {s.median_days != null ? <>median <span className="tnum font-semibold text-content-secondary">{s.median_days} d</span></> : null}
              </p>
            ) : null}
          </li>
        )
      })}
      {worst && (worst.from_previous ?? 100) < 100 ? (
        <li className="pt-1 text-caption text-content-secondary">
          Biggest drop: <strong className="text-content">{worst.label}</strong> — {worst.from_previous}% of the previous step got there.
        </li>
      ) : null}
    </ol>
  )
}

// ─── Range control ───────────────────────────────────────────────────────────

export type RangeValue = { days?: number; from?: string; to?: string }
const PRESETS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '12 months' },
]

export function rangeLabel(r: RangeValue): string {
  if (r.from && r.to) return 'the previous period'
  const d = r.days ?? 30
  return d === 365 ? 'previous 12 months' : `previous ${d} days`
}

/**
 * The one control row above every Insights page: presets, a custom window and
 * the comparison switch. The window lives in the URL, so a view is a link that
 * can be bookmarked or sent to someone.
 */
export function RangeControl({
  value, onChange, compare, onCompareChange, extra,
}: {
  value: RangeValue
  onChange: (r: RangeValue) => void
  compare: boolean
  onCompareChange: (c: boolean) => void
  extra?: ReactNode
}) {
  const custom = Boolean(value.from && value.to)
  const [open, setOpen] = useState(custom)
  const [from, setFrom] = useState(value.from ?? '')
  const [to, setTo] = useState(value.to ?? '')
  useEffect(() => { setFrom(value.from ?? ''); setTo(value.to ?? '') }, [value.from, value.to])
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from <= to
  const fromId = useId()
  const toId = useId()
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap rounded-xl border border-line bg-surface p-1" role="group" aria-label="Reporting window">
        {PRESETS.map((p) => {
          const on = !custom && (value.days ?? 30) === p.days
          return (
            <button key={p.days} type="button" aria-pressed={on} onClick={() => { setOpen(false); onChange({ days: p.days }) }}
              className={`h-8 rounded-lg px-3 text-label font-bold transition-colors ${on ? 'bg-ink-900 text-white dark:bg-surface-alt dark:text-content' : 'text-content-secondary hover:bg-surface-alt'}`}>
              {p.label}
            </button>
          )
        })}
        <button type="button" aria-pressed={custom} aria-expanded={open} onClick={() => setOpen((o) => !o)}
          className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-label font-bold transition-colors ${custom ? 'bg-ink-900 text-white dark:bg-surface-alt dark:text-content' : 'text-content-secondary hover:bg-surface-alt'}`}>
          <Icon name="calendar" size={14} />Custom
        </button>
      </div>
      {open ? (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (valid) onChange({ from, to }) }}>
          <label htmlFor={fromId} className="sr-only">From</label>
          <input id={fromId} type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)}
            className="h-10 rounded-xl border border-line bg-surface px-3 text-label text-content" />
          <span className="pb-2.5 text-caption text-content-muted" aria-hidden>to</span>
          <label htmlFor={toId} className="sr-only">To</label>
          <input id={toId} type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)}
            className="h-10 rounded-xl border border-line bg-surface px-3 text-label text-content" />
          <button type="submit" disabled={!valid}
            className="h-10 rounded-xl border border-line bg-surface px-3 text-label font-bold text-content hover:bg-surface-alt disabled:opacity-50">Apply</button>
        </form>
      ) : null}
      <label className="flex cursor-pointer items-center gap-2 text-label font-semibold text-content-secondary">
        <input type="checkbox" checked={compare} onChange={(e) => onCompareChange(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--data-1))]" />
        Compare with the previous period
      </label>
      {extra ? <div className="ml-auto flex flex-wrap items-center gap-2">{extra}</div> : null}
    </div>
  )
}

/** A small action link styled as a secondary button (downloads). */
export function DownloadLink({ href, children, icon = 'download' }: { href: string; children: ReactNode; icon?: 'download' | 'document' | 'file-spreadsheet' }) {
  return (
    <a href={href} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-label font-bold text-content transition-colors hover:bg-surface-alt">
      <Icon name={icon} size={15} />{children}
    </a>
  )
}

