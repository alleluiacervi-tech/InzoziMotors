import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container, Section } from '@/components/ui'
import { BrandMark } from '@/components/marketplace/BrandMark'
import { koreaMarket } from '@/lib/api'
import { getLogoLookup } from '@/lib/brands'
import { getServerT } from '@/lib/i18n/server'
import { MarketFootnote, Pending, marketHref, markName } from './shared'

// ─────────────────────────────────────────────────────────────────────────────
// /imports/korea/market — the Korea market guide: every make for sale in South
// Korea today, with its count. Backed by the provider's free plan (backend
// lib/encar/market.js), which gives counts and recent asking prices but no
// photos, so this is a guide to the market rather than a catalogue of cars:
// each make leads to its models, each model to its prices and a quote request.
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('imports.korea.market.metaTitle'),
    description: t('imports.korea.market.metaDescription'),
    alternates: { canonical: '/imports/korea/market' },
  }
}

export default async function KoreaMarketPage() {
  const [data, logoFor, t] = await Promise.all([
    koreaMarket.overview().catch(() => null),
    getLogoLookup(),
    getServerT(),
  ])
  if (!data?.available) notFound()

  return (
    <Section tone="page">
      <Container>
        <p className="text-caption font-bold uppercase tracking-wide text-brand">{t('imports.korea.market.eyebrow')}</p>
        <h1 className="mt-2 max-w-4xl text-display font-extrabold text-content">{t('imports.korea.market.title')}</h1>
        <p className="mt-4 max-w-2xl text-title-sm leading-relaxed text-content-secondary">{t('imports.korea.market.lede')}</p>

        {data.pending || !data.makes ? (
          <Pending t={t} />
        ) : (
          <>
            <p className="mt-6 text-headline font-extrabold tabular-nums text-content">
              {t('imports.korea.market.total', { count: (data.total ?? 0).toLocaleString('en-US') })}
            </p>
            <h2 className="mt-10 text-title font-extrabold text-content">{t('imports.korea.market.makesTitle')}</h2>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {data.makes.map((m) => (
                <li key={m.make} className="min-w-0">
                  <Link
                    href={marketHref(m.make)}
                    className="flex min-h-16 items-center gap-3 rounded-2xl border border-line-soft bg-surface p-3 transition-colors hover:border-content"
                  >
                    <BrandMark name={markName(m.label)} logoUrl={logoFor(markName(m.label))} size={40} />
                    <span className="min-w-0">
                      <span className="line-clamp-2 block break-words text-body font-bold leading-snug text-content">{m.label}</span>
                      <span className="block text-caption tabular-nums text-content-muted">
                        {t('imports.korea.market.cars', { count: m.count.toLocaleString('en-US') })}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        <MarketFootnote t={t} fetchedAt={data.fetched_at} stale={data.stale} />
      </Container>
    </Section>
  )
}
