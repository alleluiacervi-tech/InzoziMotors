import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button, Container, Icon, Section } from '@/components/ui'
import { ApiError, koreaCatalog, type KoreaCarDetail } from '@/lib/api'
import { formatMoney, formatUsdApprox } from '@/lib/business'
import { getCurrentUser } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'
import { KoreaGallery } from './KoreaGallery'
import { KoreaReportsPanel } from './KoreaReports'
import { RequestKoreanCar } from './RequestKoreanCar'

// ─────────────────────────────────────────────────────────────────────────────
// /imports/korea/[id] — one car for sale in South Korea.
//
// Server-rendered with its photos and price; the Korean inspection report and
// accident record load after (KoreaReportsPanel) so the provider can never slow
// the page. noindex: the listing disappears when the car sells, and a search
// result that 404s is worse than no result.
//
// The price is the KOREAN asking price and says so. The landed-in-Kigali figure
// appears only when the API provides an estimate (it does so only once the
// exporter's real costs are entered), and always as a range with its wording.
// ─────────────────────────────────────────────────────────────────────────────

type Params = Promise<{ id: string }>

async function load(id: string): Promise<KoreaCarDetail | null> {
  try {
    const car = await koreaCatalog.get(id)
    return car.available ? car : null
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params
  const car = await load(id).catch(() => null)
  return {
    title: car ? `${car.year} ${car.make} ${car.model}` : undefined,
    robots: { index: false, follow: false },
  }
}

const won = (n: number) => `₩${Math.round(n).toLocaleString('en-US')}`

export default async function KoreaCarPage({ params }: { params: Params }) {
  const { id } = await params
  const t = await getServerT()
  let car: KoreaCarDetail | null
  try {
    car = await load(id)
  } catch {
    // The API is unreachable: do not call the car "gone".
    return (
      <Section tone="page"><Container>
        <p className="rounded-2xl border border-line-soft bg-surface p-5 text-body text-content-secondary">{t('imports.korea.loadError')}</p>
      </Container></Section>
    )
  }
  if (!car) {
    // A sold car is a normal event, not an error page.
    return (
      <Section tone="page">
        <Container>
          <h1 className="text-headline font-extrabold text-content">{t('imports.korea.gone')}</h1>
          <p className="mt-3 max-w-prose text-body text-content-secondary">{t('imports.korea.goneBody')}</p>
          <div className="mt-6"><Button href="/imports/korea">{t('imports.korea.back')}</Button></div>
        </Container>
      </Section>
    )
  }
  if (!car.id) notFound()

  const user = await getCurrentUser()
  const title = `${car.year} ${car.make} ${car.model}`
  const specs: [string, string | null][] = [
    [t('imports.korea.specs.year'), car.month ? `${car.year}/${String(car.month).padStart(2, '0')}` : String(car.year)],
    [t('imports.korea.specs.mileage'), car.mileage_km != null ? t('imports.korea.mileage', { km: car.mileage_km.toLocaleString('en-US') }) : null],
    [t('imports.korea.specs.fuel'), car.fuel],
    [t('imports.korea.specs.transmission'), car.transmission],
    [t('imports.korea.specs.color'), car.color],
    [t('imports.korea.specs.power'), car.power_ps ? t('imports.korea.powerValue', { ps: car.power_ps }) : null],
    [t('imports.korea.specs.seats'), car.seats ? String(car.seats) : null],
    [t('imports.korea.specs.body'), car.category],
  ]
  const e = car.estimate

  return (
    <Section tone="page" className="!pt-6">
      <Container>
        <Link href="/imports/korea" className="inline-flex items-center gap-1.5 text-caption font-bold text-content-secondary hover:text-content">
          <Icon name="chevron-left" size={14} aria-hidden="true" />
          {t('imports.korea.back')}
        </Link>

        <div className="mt-5 grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="min-w-0 lg:col-span-7">
            <KoreaGallery photos={car.photos} title={title} />
          </div>

          <div className="min-w-0 lg:col-span-5">
            <h1 className="text-headline font-extrabold text-content">{title}</h1>
            {car.badge ? <p className="mt-1 text-body text-content-secondary">{car.badge}</p> : null}

            <div className="mt-5 rounded-2xl border border-line-soft bg-surface p-5">
              <p className="text-caption font-semibold text-content-muted">{t('imports.korea.koreanPriceTitle')}</p>
              <p className="mt-1 text-price-lg font-extrabold leading-none tracking-[-0.03em] text-brand tabular-nums">{won(car.price_krw)}</p>
              {car.price_usd != null ? (
                <p className="mt-1.5 text-caption text-content-secondary">{t('imports.korea.approxUsd', { usd: formatUsdApprox(car.price_usd) })}</p>
              ) : null}
              <p className="mt-3 text-micro text-content-muted">{t('imports.korea.priceNote')}</p>
            </div>

            <div className="mt-4 rounded-2xl border border-line-soft bg-surface p-5">
              <h2 className="text-body font-extrabold text-content">{t('imports.korea.estimateTitle')}</h2>
              {e ? (
                <>
                  <p className="mt-2 text-title-sm font-extrabold text-content tabular-nums">
                    {t('imports.korea.estimateRange', { low: formatMoney(e.total_rwf.low), high: formatMoney(e.total_rwf.high) })}
                  </p>
                  <p className="mt-2 text-caption text-content-secondary">{t('imports.korea.estimateIncludes')}</p>
                  {e.engine_cc == null ? <p className="mt-1 text-caption text-content-secondary">{t('imports.korea.estimateDuty')}</p> : null}
                  {e.costs_reviewed_on ? <p className="mt-2 text-micro text-content-muted">{t('imports.korea.estimateReviewed', { date: e.costs_reviewed_on })}</p> : null}
                </>
              ) : (
                <p className="mt-2 text-caption text-content-secondary">{t('imports.korea.estimateNone')}</p>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-line-soft bg-surface p-5">
              <h2 className="text-body font-extrabold text-content">{t('imports.korea.requestTitle')}</h2>
              <p className="mt-2 text-caption text-content-secondary">{t('imports.korea.requestBody')}</p>
              <div className="mt-4">
                <RequestKoreanCar listingId={car.id} signedIn={Boolean(user)} />
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-caption">
              {specs.filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-content-muted">{k}</dt>
                  <dd className="font-semibold capitalize text-content">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="mt-12 border-t border-line-soft pt-10">
          <KoreaReportsPanel listingId={car.id} priceMan={car.price_krw / 10000} />
        </div>

        <p className="mt-10 max-w-prose text-caption text-content-muted">{t('imports.korea.disclaimer')}</p>
      </Container>
    </Section>
  )
}
