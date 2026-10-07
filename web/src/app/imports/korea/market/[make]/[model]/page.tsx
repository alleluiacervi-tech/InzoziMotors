import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Button, Container, Icon, Section } from '@/components/ui'
import { ApiError, koreaMarket, type KoreaMarketListing } from '@/lib/api'
import { getServerT } from '@/lib/i18n/server'
import { BackLink, MarketFootnote, Pending, marketHref, segment, usd, won, wonCompact } from '../../shared'

// ─────────────────────────────────────────────────────────────────────────────
// /imports/korea/market/[make]/[model] — what one model line asks in Korea:
// how many are for sale (last ten model years), the spread of the most recent
// listings' prices, those listings, and a quote request prefilled with the
// make and model. Korean asking prices, before shipping and duty, and said so;
// no landed cost is estimated here.
// ─────────────────────────────────────────────────────────────────────────────

type Params = Promise<{ make: string; model: string }>

async function load(make: string, model: string) {
  try {
    return await koreaMarket.model(make, model)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound()
    return null
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { make, model } = await params
  const [data, t] = await Promise.all([load(segment(make), segment(model)), getServerT()])
  const title = t('imports.korea.market.modelTitle', {
    make: data?.make_label || segment(make),
    model: data?.model_label || segment(model),
  })
  return { title, description: t('imports.korea.market.metaDescription') }
}

function Stat({ label, man, usdValue }: { label: string; man: number; usdValue: number | null | undefined }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line-soft bg-surface px-4 py-3">
      <p className="text-micro font-bold text-content-muted">{label}</p>
      <p className="mt-1 text-title-sm font-extrabold tabular-nums text-content">{wonCompact(man)}</p>
      {usd(usdValue) ? <p className="text-caption tabular-nums text-content-muted">≈ {usd(usdValue)}</p> : null}
    </div>
  )
}

export default async function KoreaMarketModelPage({ params }: { params: Params }) {
  const { make, model } = await params
  const [data, t] = await Promise.all([load(segment(make), segment(model)), getServerT()])
  if (!data?.available) notFound()

  const makeLabel = data.make_label || segment(make)
  const modelLabel = data.model_label || segment(model)
  const fuel = (f: string | null) => (f ? t(`imports.korea.market.fuels.${f}`) : '—')
  const quote = `/imports?${new URLSearchParams({ origin: 'South Korea', make: makeLabel, model: modelLabel }).toString()}#request`

  return (
    <Section tone="page">
      <Container>
        <BackLink href={marketHref(data.make || segment(make))}>{t('imports.korea.market.allModels', { make: makeLabel })}</BackLink>
        <h1 className="mt-3 max-w-4xl text-headline font-extrabold text-content sm:text-display">
          {t('imports.korea.market.modelTitle', { make: makeLabel, model: modelLabel })}
        </h1>

        {data.pending || !data.listings ? (
          <Pending t={t} />
        ) : (
          <>
            <p className="mt-3 text-title-sm tabular-nums text-content-secondary">
              {t('imports.korea.market.modelLede', { count: (data.total ?? 0).toLocaleString('en-US'), year: data.min_year ?? '' })}
            </p>

            {data.price_man ? (
              <>
                <div className="mt-6 grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
                  <Stat label={t('imports.korea.market.low')} man={data.price_man.min} usdValue={data.price_usd?.min} />
                  <Stat label={t('imports.korea.market.typical')} man={data.price_man.median} usdValue={data.price_usd?.median} />
                  <Stat label={t('imports.korea.market.high')} man={data.price_man.max} usdValue={data.price_usd?.max} />
                </div>
                <p className="mt-3 max-w-xl text-caption leading-relaxed text-content-muted">
                  {t('imports.korea.market.spreadNote', { count: data.sample ?? data.listings.length })}
                </p>
              </>
            ) : null}

            <div className="mt-8 rounded-3xl border border-line-soft bg-surface p-5 shadow-card sm:p-6">
              <h2 className="text-title-sm font-extrabold text-content">{t('imports.korea.market.cta', { model: modelLabel })}</h2>
              <p className="mt-2 max-w-prose text-body text-content-secondary">{t('imports.korea.market.ctaBody')}</p>
              <div className="mt-5">
                <Button href={quote} size="lg" trailingIcon={<Icon name="arrow-right" size={18} />}>
                  {t('imports.korea.market.cta', { model: modelLabel })}
                </Button>
              </div>
            </div>

            {data.listings.length ? (
              <section aria-labelledby="recent" className="mt-10">
                <h2 id="recent" className="text-title font-extrabold text-content">{t('imports.korea.market.listingsTitle')}</h2>
                <ul className="mt-4 divide-y divide-line-soft overflow-hidden rounded-2xl border border-line-soft bg-surface">
                  {data.listings.map((l: KoreaMarketListing, i: number) => (
                    <li key={i} className="flex items-start justify-between gap-4 px-4 py-3 sm:px-5">
                      <div className="min-w-0">
                        <p className="truncate text-body font-bold text-content">
                          {l.year} {l.model}
                        </p>
                        <p className="mt-0.5 truncate text-caption text-content-muted">
                          {[l.badge, l.mileage_km != null ? `${l.mileage_km.toLocaleString('en-US')} km` : null, fuel(l.fuel)].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-body font-extrabold tabular-nums text-content">{won(l.price_man)}</p>
                        {usd(l.price_usd) ? <p className="text-caption tabular-nums text-content-muted">≈ {usd(l.price_usd)}</p> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
        <MarketFootnote t={t} fetchedAt={data.fetched_at} stale={data.stale} />
      </Container>
    </Section>
  )
}
