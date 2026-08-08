import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

// The admin's shared primitives — one card grammar, one stat tile, one status
// pill, one page header, so twelve pages read as one professional tool.

// ─── Money ───────────────────────────────────────────────────────────────────
// Backend amounts are USD integers (cars.price, platform_fees.amount).
// The previous dashboard labelled them RWF — a 1300× misstatement.
export const RWF_RATE = 1300

export function fmtUSD(n?: number | null): string {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  return `$${Math.round(Number(n)).toLocaleString('en-US')}`
}

export function fmtRWF(usd?: number | null): string {
  if (usd == null || !Number.isFinite(Number(usd))) return '—'
  const rwf = Math.round(Number(usd) * RWF_RATE)
  return rwf >= 1_000_000 ? `RWF ${(rwf / 1_000_000).toFixed(1)}M` : `RWF ${rwf.toLocaleString('en-US')}`
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
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-content">{title}</h1>
        {description ? <p className="mt-1 text-sm text-content-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line-soft bg-surface shadow-card ${className}`}>
      {children}
    </div>
  )
}

// ─── Stat tile ───────────────────────────────────────────────────────────────

export function StatCard({
  label, value, sub, icon, tone = 'neutral', href,
}: {
  label: string
  value: string | number
  sub?: string
  icon: IconName
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'info'
  href?: string
}) {
  const tones = {
    neutral: 'bg-surface-alt text-content-secondary',
    brand: 'bg-brand-tint text-brand',
    success: 'bg-success-tint text-success',
    warning: 'bg-warning-tint text-warning-text',
    info: 'bg-info-tint text-info',
  }
  const body = (
    <div className="flex items-start gap-4 p-5">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon name={icon} size={19} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-content-muted">{label}</p>
        <p className="mt-1 text-[26px] font-extrabold leading-none tracking-[-0.02em] text-content">
          {value}
        </p>
        {sub ? <p className="mt-1.5 text-xs text-content-muted">{sub}</p> : null}
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
  live: 'bg-success-tint text-success', complete: 'bg-success-tint text-success',
  approved: 'bg-success-tint text-success', resolved: 'bg-success-tint text-success',
  active: 'bg-success-tint text-success', paid: 'bg-success-tint text-success',
  confirmed: 'bg-info-tint text-info', scheduled: 'bg-info-tint text-info',
  inspecting: 'bg-info-tint text-info', inspected: 'bg-info-tint text-info',
  upcoming: 'bg-info-tint text-info',
  under_review: 'bg-warning-tint text-warning-text', pending: 'bg-warning-tint text-warning-text',
  open: 'bg-warning-tint text-warning-text', due: 'bg-warning-tint text-warning-text',
  reserved: 'bg-[#F5F3FF] text-[#7C3AED]',
  // Contract lifecycle. 'signed' is the terminal good state (a paper copy exists),
  // 'draft' means a number is held but no PDF was written, and superseded/void
  // numbers stay in the register greyed out — they are history, not failures.
  signed: 'bg-success-tint text-success', issued: 'bg-info-tint text-info',
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
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold leading-none ${
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
      <p className="text-sm font-bold text-content">{title}</p>
      {description ? <p className="mt-1 max-w-xs text-xs text-content-muted">{description}</p> : null}
    </div>
  )
}

// ─── Bar chart (SVG, dependency-free, zero-state aware) ──────────────────────

export function BarChart({
  data, height = 140, formatValue = (v) => String(v), emptyLabel = 'No data yet',
}: {
  data: { label: string; value: number }[]
  height?: number
  formatValue?: (v: number) => string
  emptyLabel?: string
}) {
  const max = Math.max(...data.map((d) => d.value), 0)
  if (!data.length || max === 0) {
    return <EmptyState icon="chart" title={emptyLabel} description="This chart fills in as real activity is recorded." />
  }
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d) => {
        const h = Math.max(6, Math.round((d.value / max) * (height - 40)))
        return (
          <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-[10px] font-bold text-content-secondary">{formatValue(d.value)}</span>
            <div
              className={`w-full max-w-[44px] rounded-t-md ${d.value === max ? 'bg-gray-700' : 'bg-gray-300'}`}
              style={{ height: h }}
            />
            <span className="w-full truncate text-center text-[10px] text-content-muted">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export { Icon }
export type { IconName }
