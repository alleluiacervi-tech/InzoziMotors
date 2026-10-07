import Link from 'next/link'
import { Icon } from '@/components/ui'
import { formatDate, formatUsdApprox } from '@/lib/business'

// Pieces shared by the three Korea market pages (/imports/korea/market…).

/** 만원 (10,000 KRW) → "₩23,800,000". */
export const won = (man: number) => `₩${Math.round(man * 10000).toLocaleString('en-US')}`

/** 만원 → "₩23.8M", for the price-spread figures. */
export const wonCompact = (man: number) => `₩${(man / 100).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`

/** A route segment as text, whether or not the router has decoded it. */
export function segment(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** The name a brand badge should draw: "Chevrolet (GM Daewoo)" → "Chevrolet". */
export const markName = (label: string) => label.replace(/\s*\(.*\)\s*/g, '').split(' / ')[0].trim() || label

export const usd = (n: number | null | undefined) => (n == null ? null : formatUsdApprox(n))

export const marketHref = (make?: string, model?: string) =>
  ['/imports/korea/market', make && encodeURIComponent(make), model && encodeURIComponent(model)].filter(Boolean).join('/')

type T = (key: string, vars?: Record<string, string | number>) => string

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-caption font-bold text-content-secondary hover:text-content"
    >
      <Icon name="chevron-left" size={16} />
      {children}
    </Link>
  )
}

/** Freshness and source, under every market page. */
export function MarketFootnote({ t, fetchedAt, stale }: { t: T; fetchedAt?: string; stale?: boolean }) {
  return (
    <div className="mt-10 space-y-2 border-t border-line-soft pt-5 text-caption leading-relaxed text-content-muted">
      {fetchedAt ? (
        <p>{stale ? t('imports.korea.market.stale', { date: formatDate(fetchedAt) }) : t('imports.korea.market.updated', { date: formatDate(fetchedAt) })}</p>
      ) : null}
      <p>{t('imports.korea.market.source')}</p>
    </div>
  )
}

export function Pending({ t }: { t: T }) {
  return (
    <p className="mt-8 rounded-2xl border border-line-soft bg-surface-alt px-5 py-4 text-body text-content-secondary">
      {t('imports.korea.market.pending')}
    </p>
  )
}
