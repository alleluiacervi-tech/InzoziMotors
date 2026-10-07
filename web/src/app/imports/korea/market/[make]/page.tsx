import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container, Icon, Section } from '@/components/ui'
import { BrandMark } from '@/components/marketplace/BrandMark'
import { ApiError, koreaMarket } from '@/lib/api'
import { getLogoLookup } from '@/lib/brands'
import { getServerT } from '@/lib/i18n/server'
import { BackLink, MarketFootnote, Pending, marketHref, markName, segment } from '../shared'

// /imports/korea/market/[make] — one make's model lines in Korea, with counts.

type Params = Promise<{ make: string }>

async function load(make: string) {
  try {
    return await koreaMarket.make(make)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound()
    return null
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { make } = await params
  const [data, t] = await Promise.all([load(segment(make)), getServerT()])
  const label = data?.label || segment(make)
  return {
    title: `${t('imports.korea.market.modelsTitle', { make: label })} · ${t('imports.korea.market.eyebrow')}`,
    description: t('imports.korea.market.metaDescription'),
  }
}

export default async function KoreaMarketMakePage({ params }: { params: Params }) {
  const { make } = await params
  const [data, logoFor, t] = await Promise.all([load(segment(make)), getLogoLookup(), getServerT()])
  if (!data?.available) notFound()
  const label = data.label || segment(make)

  return (
    <Section tone="page">
      <Container>
        <BackLink href={marketHref()}>{t('imports.korea.market.allMakes')}</BackLink>
        <div className="mt-3 flex items-center gap-4">
          <BrandMark name={markName(label)} logoUrl={logoFor(markName(label))} size={56} />
          <div className="min-w-0">
            <h1 className="text-headline font-extrabold text-content">{t('imports.korea.market.modelsTitle', { make: label })}</h1>
            {data.total ? (
              <p className="mt-1 text-body tabular-nums text-content-secondary">
                {t('imports.korea.market.total', { count: data.total.toLocaleString('en-US') })}
              </p>
            ) : null}
          </div>
        </div>

        {data.pending || !data.models ? (
          <Pending t={t} />
        ) : (
          <ul className="mt-8 divide-y divide-line-soft overflow-hidden rounded-2xl border border-line-soft bg-surface">
            {data.models.map((m) => (
              <li key={m.model}>
                <Link
                  href={marketHref(data.make, m.model)}
                  className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-surface-alt sm:px-5"
                >
                  <span className="min-w-0 truncate text-body font-bold text-content">{m.label}</span>
                  <span className="flex shrink-0 items-center gap-2 text-caption tabular-nums text-content-muted">
                    {t('imports.korea.market.cars', { count: m.count.toLocaleString('en-US') })}
                    <Icon name="chevron-right" size={16} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <MarketFootnote t={t} fetchedAt={data.fetched_at} stale={data.stale} />
      </Container>
    </Section>
  )
}
