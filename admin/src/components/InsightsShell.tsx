'use client'

import { Suspense, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PageHeader, LoadingState, ErrorState } from './ui'
import { RangeControl } from './charts'
import { Icon, type IconName } from './Icon'
import { useInsightsRange } from './useInsightsRange'
import type { InsightsRange, RangeQuery } from '@/lib/api'
import { fmtDate } from '@/lib/format'

export const LINE_LABEL: Record<string, string> = {
  inspection: 'Walk-in inspections',
  report: 'Report resale',
  rental_subscription: 'Rental listing subscriptions',
  featured: 'Sponsored placement',
  rental: 'Rental fees (legacy)',
  commission: 'Commission (retired)',
  certification: 'Certification (retired)',
}
export const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash', mobile_money: 'Mobile money', bank_transfer: 'Bank transfer', unrecorded: 'Not recorded',
}
export const CHANNEL_LABEL: Record<string, string> = { whatsapp: 'WhatsApp', phone: 'Phone call', in_app: 'In-app message' }

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: '/insights', label: 'Overview', icon: 'layout-dashboard' },
  { href: '/insights/funnels', label: 'Funnels', icon: 'funnel' },
  { href: '/insights/inventory', label: 'Inventory', icon: 'warehouse' },
  { href: '/insights/quality', label: 'Quality', icon: 'badge-check' },
  { href: '/insights/centers', label: 'Centers', icon: 'building' },
  { href: '/insights/reports', label: 'Reports', icon: 'file-spreadsheet' },
]

const STORE_KEY = 'sawa-insights-window'

/** "1 Sept 2026 to 30 Sept 2026" */
export const windowText = (r: InsightsRange) => `${fmtDate(r.from)} to ${fmtDate(r.to)}`

export type InsightsContext = {
  range: RangeQuery
  compare: boolean
  query: string
  periodLabel: string
}

function Shell({
  title, description, actions, children,
}: {
  title: string
  description: (ctx: InsightsContext) => string | undefined
  actions?: (ctx: InsightsContext) => ReactNode
  children: (ctx: InsightsContext) => ReactNode
}) {
  const pathname = usePathname()
  const { range, setRange, compare, setCompare, query } = useInsightsRange()
  const [copied, setCopied] = useState(false)

  // Carry the window between Insights pages opened from the sidebar, whose
  // links have no query. Per-browser convenience only; the URL stays the truth.
  useEffect(() => {
    try {
      const hasWindow = /[?&](days|from)=/.test(window.location.search)
      const saved = window.sessionStorage.getItem(STORE_KEY)
      if (!hasWindow && saved) {
        const r = JSON.parse(saved) as RangeQuery
        if (r && (r.days || (r.from && r.to))) setRange(r)
      }
    } catch { /* storage unavailable: the default window stands */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    try { window.sessionStorage.setItem(STORE_KEY, JSON.stringify(range)) } catch { /* ignore */ }
  }, [range])

  const periodLabel = range.from && range.to ? 'the previous period' : range.days === 365 ? 'previous 12 months' : `previous ${range.days} days`
  const ctx: InsightsContext = { range, compare, query, periodLabel }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard blocked; the address bar still has it */ }
  }

  return (
    <div>
      <PageHeader title={title} description={description(ctx)} action={
        <div className="flex flex-wrap items-center gap-2">
          {actions?.(ctx)}
          <button type="button" onClick={copyLink}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-label font-bold text-content transition-colors hover:bg-surface-alt">
            <Icon name={copied ? 'check' : 'link'} size={15} />
            <span aria-live="polite">{copied ? 'Link copied' : 'Copy link to this view'}</span>
          </button>
        </div>
      } />
      <nav aria-label="Insights sections" className="-mt-2 mb-5 overflow-x-auto">
        <ul className="flex min-w-max gap-1 border-b border-line-soft">
          {TABS.map((t) => {
            const on = pathname === t.href
            return (
              <li key={t.href}>
                <Link href={`${t.href}?${query}`} aria-current={on ? 'page' : undefined}
                  className={`relative flex h-10 items-center gap-1.5 px-3 text-label font-bold transition-colors ${on ? 'text-content' : 'text-content-muted hover:text-content'}`}>
                  <Icon name={t.icon} size={15} />{t.label}
                  {on ? <span aria-hidden className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" /> : null}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <RangeControl value={range} onChange={setRange} compare={compare} onCompareChange={setCompare} />
      {children(ctx)}
    </div>
  )
}

/** Every Insights page: header, section tabs, the window control, then the page. */
export function InsightsShell(props: Parameters<typeof Shell>[0]) {
  return (
    <Suspense fallback={<LoadingState rows={6} />}>
      <Shell {...props} />
    </Suspense>
  )
}

/** Fetch-on-window-change with loading and error states that cannot collapse into "empty". */
export function useWindowed<T>(fetcher: (r: RangeQuery) => Promise<T>, range: RangeQuery) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const key = JSON.stringify(range)
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    let live = true
    setLoading(true)
    setError(null)
    fetcher(range)
      .then((d) => { if (live) setData(d) })
      .catch((e) => { if (live) setError(e) })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce])
  return { data, error, loading, retry: () => setNonce((n) => n + 1) }
}

export function Windowed<T>({ state, children, rows = 6 }: {
  state: { data: T | null; error: unknown; loading: boolean; retry: () => void }
  children: (data: T) => ReactNode
  rows?: number
}) {
  if (state.error) return <ErrorState error={state.error} onRetry={state.retry} />
  if (state.loading && !state.data) return <LoadingState rows={rows} />
  if (!state.data) return null
  return <div className={state.loading ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={state.loading}>{children(state.data)}</div>
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3 mt-8 first:mt-0">
      <h2 className="text-section font-extrabold text-content">{children}</h2>
      {hint ? <p className="mt-0.5 text-caption text-content-muted">{hint}</p> : null}
    </div>
  )
}
