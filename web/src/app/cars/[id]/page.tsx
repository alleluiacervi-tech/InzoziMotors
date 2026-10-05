import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ApiError, cars as carsApi } from '@/lib/api'
import { getCurrentUser } from '@/lib/session'
import { BUYING_STEPS, CONTACT, SITE } from '@/lib/site'
import { breadcrumbNode, graph, offerAvailability, organizationNode, ORG_ID } from '@/lib/seo'
import { CAR_STATUS_LABEL, FINANCE_TERMS, formatKm, formatMoneyExact, formatMoney, getCertTier, isDemoListing, isHighDemand, isNewListing, listedAgo, marketPosition, monthlyEstimate, priceDrop } from '@/lib/business'
import type { Car } from '@/lib/types'
import { getServerT } from '@/lib/i18n/server'
import { Alert, Badge, Button, Card, Container, Icon, Section } from '@/components/ui'
import { Price, RateNote } from '@/components/Price'
import { CarCard } from '@/components/marketplace/CarCard'
import { Gallery } from '@/components/marketplace/Gallery'
import { InspectionReportCard } from '@/components/marketplace/InspectionReportCard'
import { ScoreRing } from '@/components/brand/ScoreRing'
import { Sparkline } from '@/components/marketplace/Sparkline'
import { SpecGrid, type Spec } from '@/components/marketplace/SpecGrid'
import { VehicleHistoryCard } from '@/components/marketplace/VehicleHistoryCard'
import { ModelSafetyCard } from '@/components/marketplace/ModelSafetyCard'
import { RequestCarForm } from './RequestCarForm'
import { CompareToggle } from '@/components/market/CompareControls'
import { BrandMark } from '@/components/marketplace/BrandMark'
import { getLogoLookup } from '@/lib/brands'

// ─────────────────────────────────────────────────────────────────────────────
// Car detail — the page the whole business runs through.
//
// Everything a buyer needs to decide is on it: our own photographs, the full
// 150-point report including what failed, the document checks with anything
// unverified said out loud, and a price with the market context only where the
// server found enough real comparables to earn one.
//
// The three data calls are settled independently. A car with no inspection
// report yet, or a history lookup that times out, must not blank the listing.
// ─────────────────────────────────────────────────────────────────────────────

type PageProps = { params: Promise<{ id: string }> }

/** Hard ceiling on the primary fetch. This is the page the whole business runs
 *  through — a hung API must surface the designed error boundary in seconds,
 *  never leave a buyer staring at a blank tab. */
const LOAD_TIMEOUT_MS = 5_000

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Listing took too long to load')), LOAD_TIMEOUT_MS)
    ),
  ])
}

async function loadCar(id: string): Promise<Car | null> {
  try {
    return await withTimeout(carsApi.get(id))
  } catch (err) {
    // 404 (no such car) and 400 (not even a valid id) both mean "nothing here"
    // — they must reach notFound(), not the error boundary, or the response is
    // a 500. The page body and generateMetadata run in parallel, so this has to
    // agree with the check up there; a mismatch means one of them wins a race.
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) return null
    throw err
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params

  let car: Car | null = null
  try {
    car = await carsApi.get(id)
  } catch (err) {
    // A car that genuinely does not exist has to answer 404, not 200.
    // loading.tsx makes this route stream, so by the time the page body runs,
    // the response headers are already gone and a notFound() there renders the
    // right page under a 200 — a soft 404. Metadata resolves BEFORE the first
    // byte is flushed, so this is the only place the status can still be set.
    //
    // Only a real 404 counts. A timeout or a 5xx during an API blip must not
    // start telling Google that live inventory has been deleted.
    // 400 too: the API rejects a non-UUID path param, and "/cars/garbage" is
    // not a server fault — answering 5xx there teaches crawlers the whole site
    // is unhealthy and they slow down on every URL.
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound()
    car = null
  }
  const t = await getServerT()
  if (!car) {
    return { title: t('cars.detail.metaUnavailable'), robots: { index: false, follow: true } }
  }

  const facts = [String(car.year), formatKm(car.mileage), car.fuel_type, car.transmission]
    .filter(Boolean)
    .join(' · ')

  const description = car.inspected
    ? t('cars.detail.metaDescriptionInspected', { title: car.title, facts, price: formatMoney(car.price) })
    : t('cars.detail.metaDescriptionListed', { title: car.title, facts, price: formatMoney(car.price) })

  const image = car.images?.[0]

  return {
    title: `${car.title} — ${ formatMoney(car.price) }`,
    description,
    alternates: { canonical: `/cars/${car.id}` },
    robots: car.status === 'live' ? undefined : { index: false, follow: true },
    openGraph: {
      type: 'website',
      title: `${car.title} — ${ formatMoney(car.price) }`,
      description,
      url: `/cars/${car.id}`,
      images: image ? [{ url: image, alt: car.title }] : undefined,
    },
  }
}

export default async function CarDetailPage({ params }: PageProps) {
  const { id } = await params

  const car = await loadCar(id)
  if (!car) notFound()
  const t = await getServerT()

  // Each call is allowed to fail on its own terms: an uninspected car has no
  // report, a history lookup can time out, and neither may blank the listing.
  const [vehicleHistory, report, similarResult, user] = await Promise.all([
    carsApi.history(id).catch(() => null),
    carsApi.inspectionReport(id).catch(() => null),
    carsApi.list({ make: car.make, limit: 5 }).catch(() => [] as Car[]),
    getCurrentUser(),
  ])

  const similar = similarResult.filter((other) => other.id !== car.id).slice(0, 4)
  const images = (car.images ?? []).filter(Boolean)
  const tier = getCertTier(car)
  // Seeded rows never carry a certification claim — see isDemoListing.
  const demo = isDemoListing(car)
  const market = marketPosition(car)
  const drop = priceDrop(car)
  const monthly = monthlyEstimate(car.price)
  const priceHistory = car.price_history ?? []

  const isAvailable = car.status === 'live'
  const isOwnListing = Boolean(user && user.id === car.seller_id)

  const specs: Spec[] = [
    { label: t('cars.spec.year'), value: String(car.year), icon: 'calendar' },
    { label: t('cars.spec.mileage'), value: formatKm(car.mileage), icon: 'gauge' },
    { label: t('cars.spec.fuel'), value: car.fuel_type ?? '', icon: 'fuel' },
    { label: t('cars.spec.gearbox'), value: car.transmission ?? '', icon: 'settings' },
    { label: t('cars.spec.bodyType'), value: car.body_type ?? '', icon: 'car' },
    { label: t('cars.spec.colour'), value: car.color ?? '' },
    {
      label: t('cars.spec.driveSide'),
      value:
        car.drive_side === 'RHD'
          ? t('cars.spec.rhd')
          : car.drive_side === 'LHD'
          ? t('cars.spec.lhd')
          : '',
      hint:
        car.drive_side === 'RHD'
          ? t('cars.spec.japaneseImport')
          : car.drive_side === 'LHD'
          ? t('cars.spec.boughtLocally')
          : undefined,
      icon: 'key',
    },
    { label: t('cars.spec.location'), value: car.location ?? '', icon: 'location' },
  ]

  return (
    <article className={isAvailable && !isOwnListing ? 'pb-20 lg:pb-0' : undefined}>
      <JsonLd car={car} images={images} />

      <Container className="pt-7 sm:pt-9">
        <nav aria-label="Breadcrumb">
          {/* Separators live inside their list item, so a screen reader counts
              four crumbs rather than seven. */}
          <ol className="flex flex-wrap items-center gap-1.5 text-caption text-content-muted">
            <li className="flex items-center gap-1.5">
              <Link href="/" className="hover:text-content">
                {t('cars.detail.breadcrumbHome')}
              </Link>
              <span aria-hidden>·</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Link href="/cars" className="hover:text-content">
                {t('cars.detail.breadcrumbCars')}
              </Link>
              <span aria-hidden>·</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Link href={`/cars?make=${encodeURIComponent(car.make)}`} className="hover:text-content">
                {car.make}
              </Link>
              <span aria-hidden>·</span>
            </li>
            <li className="truncate font-semibold text-content-secondary" aria-current="page">
              {car.title}
            </li>
          </ol>
        </nav>
      </Container>

      <Container className="pb-16 pt-6 sm:pb-24">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_392px] lg:gap-14">
          {/* Explicit placement so the price and CTA sit directly under the
              gallery on a phone, instead of below every report on the page. */}
          <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-1">
            <Gallery images={images} title={car.title} />

            <header>
              <div className="flex flex-wrap items-center gap-2">
                {demo ? (
                  <Badge tone="neutral">{t('cars.card.previewListing')}</Badge>
                ) : tier ? (
                  <Badge
                    tone={tier.key === 'plus' ? 'certPlus' : tier.key === 'certified' ? 'cert' : 'inspected'}
                    icon="shield-check"
                  >
                    {tier.label}
                  </Badge>
                ) : null}
                {drop > 0 ? (
                  <Badge tone="warning" icon="trending-down">
                    {t('cars.detail.priceReduced')}
                  </Badge>
                ) : null}
                {!demo && isNewListing(car) && drop === 0 ? <Badge tone="info">{t('cars.detail.newListing')}</Badge> : null}
                {isHighDemand(car) ? <Badge tone="danger">{t('cars.card.highDemand')}</Badge> : null}
                {!isAvailable ? (
                  <Badge tone="neutral">
                    {CAR_STATUS_LABEL[car.status] ?? car.status}
                  </Badge>
                ) : null}
              </div>

              <h1 className="mt-4 max-w-4xl text-display font-extrabold text-content">{car.title}</h1>
              {isAvailable ? (
                <div className="mt-3">
                  <CompareToggle carId={car.id} />
                </div>
              ) : null}

              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-content-secondary">
                <span>{car.year}</span>
                <span aria-hidden className="text-line">·</span>
                <span>{formatKm(car.mileage)}</span>
                {car.location ? (
                  <>
                    <span aria-hidden className="text-line">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="location" size={14} />
                      {car.location}
                    </span>
                  </>
                ) : null}
                {listedAgo(car) ? (
                  <>
                    <span aria-hidden className="text-line">·</span>
                    <span>{listedAgo(car)}</span>
                  </>
                ) : null}
                {car.saves_count ? (
                  <>
                    <span aria-hidden className="text-line">·</span>
                    <span>{t('cars.card.saved', { count: car.saves_count })}</span>
                  </>
                ) : null}
              </p>

              {/* The score, on the first screen, as the same ring the cards
                  use — and a way straight down to the report behind it. */}
              {car.inspection_score ? (
                <a
                  href="#inspection"
                  className="group mt-5 inline-flex items-center gap-3 rounded-2xl border border-line-soft bg-surface py-2 pl-2 pr-4 shadow-card transition-colors hover:border-line"
                >
                  <ScoreRing score={car.inspection_score} size={48} />
                  <span className="min-w-0">
                    <span className="block text-caption font-bold text-content">
                      {t('cars.detail.scoreChip')} {car.inspection_score}/150
                    </span>
                    <span className="block text-micro font-semibold text-content-secondary underline decoration-line underline-offset-4 group-hover:decoration-content">
                      {t('cars.detail.seeReport')}
                    </span>
                  </span>
                </a>
              ) : null}
            </header>
          </div>

          <aside id="purchase-panel" className="scroll-mt-24 lg:col-start-2 lg:row-start-1 lg:row-span-2">
            <div className="lg:sticky lg:top-[calc(var(--header-h)+24px)]">
              <Card className="relative overflow-hidden rounded-3xl border-line bg-surface p-6 shadow-float sm:p-7">
                                <p className="mb-3 text-micro font-bold text-content-muted">{t('cars.detail.purchaseOverview')}</p>
                {/* Zone 1 — price. The market sentence shows its work: amount
                    and sample size, never a bare percentage in a pill. */}
                <Price amountRwf={car.price} size="detail" />
                <p className="mt-2 text-caption text-content-secondary">
                  {t('cars.detail.monthlyFinance', { amount: formatMoney(monthly) })}
                </p>

                {market && car.market_avg ? (
                  <p
                    className={`mt-3 text-caption font-semibold ${
                      market.tone === 'good'
                        ? 'text-success-text'
                        : market.tone === 'high'
                        ? 'text-warning-text'
                        : 'text-content-muted'
                    }`}
                  >
                    {market.tone === 'neutral'
                      ? t('cars.card.atMarketPrice', { count: car.comparables ?? 0 })
                      : t(market.tone === 'good' ? 'cars.card.belowAverage' : 'cars.card.aboveAverage', { amount: formatMoney(Math.abs(car.market_avg - car.price)), count: car.comparables ?? 0 })}
                  </p>
                ) : null}

                {drop > 0 ? (
                  <p className="mt-2 text-caption font-semibold text-warning-text">
                    {t('cars.detail.reducedBy', { amount: formatMoney(drop) })}
                  </p>
                ) : null}

                {/* Zone 2 — action. Second, not fifth: the decision surface sits
                    directly under the price, above every disclaimer. */}
                <div className="mt-5 border-t border-line-soft pt-5">
                  {!isAvailable ? (
                    <div className="space-y-4">
                      <Alert tone="info">
                        {t('cars.detail.unavailableAlert')}
                      </Alert>
                      <Button href="/cars" variant="outline" fullWidth>
                        {t('cars.detail.browseAvailable')}
                      </Button>
                    </div>
                  ) : isOwnListing ? (
                    <div className="space-y-4">
                      <Alert tone="info">{t('cars.detail.ownListingAlert')}</Alert>
                      <Button href="/dashboard" variant="outline" fullWidth>
                        {t('cars.detail.manageListing')}
                      </Button>
                    </div>
                  ) : user ? (
                    <RequestCarForm carId={car.id} available={car.seller_contact_available} />
                  ) : (
                    <div className="space-y-4">
                      <Button
                        href={`/signin?next=${encodeURIComponent(`/cars/${car.id}`)}`}
                        size="lg"
                        fullWidth
                        trailingIcon={<Icon name="arrow-right" size={18} />}
                      >
                        {t('cars.detail.signInToContact')}
                      </Button>
                      {/* No account yet: ask Sawa, on Sawa's own line, never the
                          seller's. The seller's number stays behind sign-in and
                          the terms acknowledgement (invariant 3). */}
                      {CONTACT.whatsappVerified ? (
                        <Button
                          href={`https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(
                            t('cars.detail.askSawaMessage', { title: car.title, url: `${SITE.url}/cars/${car.id}` })
                          )}`}
                          target="_blank"
                          variant="outline"
                          fullWidth
                          // The label is long in every language; let it wrap
                          // rather than widen the column past a phone screen.
                          className="h-auto min-h-12 !whitespace-normal py-3 text-center"
                          leadingIcon={<Icon name="whatsapp" size={18} className="shrink-0" />}
                        >
                          {t('cars.detail.askSawa')}
                        </Button>
                      ) : null}
                      <p className="text-micro leading-relaxed text-content-muted">
                        {t('cars.detail.contactGate')}{' '}
                        <Link href="/how-it-works#buying" className="font-bold text-content underline decoration-line underline-offset-4 hover:decoration-content">
                          {t('cars.detail.seeHowBuying')}
                        </Link>
                        .
                      </p>
                    </div>
                  )}

                  {/* The page's one statement of the direct-deal rule, beside
                      the action it governs. */}
                  <p className="mt-4 text-caption leading-relaxed text-content-secondary">
                    {t('common.directDeal')}
                  </p>
                </div>

                {/* Zone 3 — context, collapsed. Estimates and history matter,
                    but they never again sit visually equal to the CTA. */}
                <details className="group mt-5 border-t border-line-soft pt-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-caption font-bold text-content [&::-webkit-details-marker]:hidden">
                    {t('cars.detail.priceHistoryFinancing')}
                    <Icon name="chevron-down" size={16} className="transition-transform group-open:rotate-180" />
                  </summary>

                  <div className="pt-4">
                    {priceHistory.length >= 2 ? (
                      <div className="mb-4">
                        <p className="mb-2 text-micro font-bold text-content-muted">
                          {t('cars.detail.askingPriceSince')}
                        </p>
                        <Sparkline points={priceHistory} />
                      </div>
                    ) : null}

                    <p className="text-caption text-content-secondary">
                      <span className="font-bold text-content">{t('cars.detail.perMonthBold', { amount: formatMoney(monthly) })}</span>{' '}
                      {t('cars.detail.ifFinanced')}
                    </p>
                    <p className="mt-1 text-micro leading-relaxed text-content-muted">
                      {t('cars.detail.financeDisclaimer', {
                        deposit: FINANCE_TERMS.downPaymentPct,
                        rate: FINANCE_TERMS.annualRatePct,
                        term: FINANCE_TERMS.termMonths,
                      })}
                    </p>
                    <p className="mt-3 text-caption">
                      <Link href="/tools/import-duty" className="font-bold text-content underline decoration-line underline-offset-4 hover:decoration-content">
                        {t('cars.detail.estimateDuty')}
                      </Link>
                    </p>
                  </div>
                </details>
              </Card>

              {/* Where the dollar figure comes from: rate and date, once, as a
                  footnote. A converted price without them is how the old
                  hardcoded 1300 drifted 12% from reality unnoticed. */}
              <RateNote className="mt-4 px-1" />
            </div>
          </aside>

          <div className="min-w-0 space-y-8 lg:col-start-1 lg:row-start-2">
            <section aria-labelledby="specs-heading" className="rounded-3xl border border-line-soft bg-surface p-5 shadow-card sm:p-7">
              <h2 id="specs-heading" className="mb-4 text-title font-extrabold text-content">
                {t('cars.detail.specification')}
              </h2>
              <BrandBar car={car} />
              <SpecGrid specs={specs} />
            </section>

            {car.description ? (
              <section aria-labelledby="about-heading">
                <h2 id="about-heading" className="mb-3 text-title font-extrabold text-content">
                  {t('cars.detail.aboutTitle')}
                </h2>
                <p className="max-w-prose whitespace-pre-line text-body leading-relaxed text-content-secondary">
                  {car.description}
                </p>
              </section>
            ) : null}

            <div id="inspection" className="scroll-mt-28">
              <InspectionReportCard report={report} />
            </div>

            {!report && car.inspected ? (
              <Alert tone="info" title={t('cars.detail.reportPendingTitle')}>
                {t('cars.detail.reportPendingBody')}
              </Alert>
            ) : null}

            <VehicleHistoryCard history={vehicleHistory} />

            {/* Streams in after the page: NHTSA is cached a week, but a first
                lookup must never hold up the listing. Empty when NHTSA does
                not know this model, so no skeleton promises a card. */}
            <Suspense fallback={null}>
              <ModelSafetyCard carId={car.id} />
            </Suspense>

            <SellerCard car={car} />

            <section aria-labelledby="next-heading">
              <h2 id="next-heading" className="mb-4 text-title font-extrabold text-content">
                {t('cars.detail.nextTitle')}
              </h2>
              <ol className="space-y-4">
                {BUYING_STEPS.slice(0, 4).map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-surface-alt text-caption font-extrabold text-content-secondary">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-body font-bold text-content">{step.title}</p>
                      <p className="mt-1 max-w-prose text-caption leading-relaxed text-content-secondary">
                        {step.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      </Container>

      {similar.length ? (
        <Section tone="surface">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-caption font-bold text-content-muted">{t('cars.detail.similarEyebrow')}</p>
                <h2 className="mt-2 text-headline font-extrabold text-content">
                  {t('cars.detail.similarTitle', { make: car.make })}
                </h2>
              </div>
              <Button href={`/cars?make=${encodeURIComponent(car.make)}`} variant="outline" size="sm">
                {t('cars.detail.seeAllMake', { make: car.make })}
              </Button>
            </div>

            <ul className="mt-8 grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {similar.map((other) => (
                <li key={other.id} className="min-w-0">
                  <CarCard car={other} />
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      {isAvailable && !isOwnListing ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 shadow-[0_-8px_28px_rgba(26,20,19,0.12)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-content items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-micro font-semibold text-content-muted">{car.title}</p>
              <p className="text-title-sm font-extrabold text-brand" aria-label={ formatMoneyExact(car.price) }>{ formatMoney(car.price) }</p>
            </div>
            {/* Same verb as the panel it jumps to — "Contact seller" — so
                the phone and the desktop never name one action twice. */}
            <Button
              href={user ? '#purchase-panel' : `/signin?next=${encodeURIComponent(`/cars/${car.id}`)}`}
              size="compact"
              trailingIcon={<Icon name="arrow-right" size={16} />}
            >
              {t('cars.detail.contactSeller')}
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  )
}

async function BrandBar({ car }: { car: Car }) {
  if (!car.make) return null
  const [t, logoFor] = await Promise.all([getServerT(), getLogoLookup()])
  return (
    <Link
      href={`/cars?make=${encodeURIComponent(car.make)}`}
      className="group mb-5 flex items-center gap-4 rounded-2xl border border-line-soft bg-surface-alt/60 p-3 pr-4 transition-colors hover:bg-surface-alt"
    >
      <BrandMark name={car.make} logoUrl={logoFor(car.make)} size={48} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-extrabold text-content">{car.make}</span>
        <span className="block truncate text-caption text-content-secondary">
          {t('cars.detail.brandLine', { model: [car.model, car.body_type].filter(Boolean).join(' · '), year: car.year })}
        </span>
      </span>
      <span className="hidden shrink-0 items-center gap-1 text-caption font-bold text-content-secondary group-hover:text-content sm:inline-flex">
        {t('cars.detail.allOfMake', { make: car.make })}
        <Icon name="arrow-right" size={15} />
      </span>
      <Icon name="arrow-right" size={16} className="shrink-0 text-content-muted sm:hidden" />
    </Link>
  )
}

async function SellerCard({ car }: { car: Car }) {
  if (!car.seller_name) return null
  const t = await getServerT()
  const verified = car.seller_id_verified === 'approved'
  const showroom = car.seller_is_showroom === true

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-title font-extrabold text-content">{t('cars.detail.sellerTitle')}</h2>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          {car.seller_avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- the showroom's own photo, set by the team
            <img
              src={car.seller_avatar_url}
              alt=""
              className="h-12 w-12 shrink-0 rounded-pill object-cover ring-1 ring-line-soft"
              loading="lazy"
            />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-pill bg-surface-alt text-content-secondary">
              <Icon name={showroom ? 'store' : 'user'} size={20} />
            </span>
          )}
          <div>
            <p className="text-body font-bold text-content">{car.seller_name}</p>
            <p className="text-caption text-content-muted">
              {verified ? t('cars.detail.sellerVerified') : t('cars.detail.sellerUnverified')}
            </p>
          </div>
        </div>

        {showroom ? (
          <Badge tone="success" icon="shield-check">{t('cars.detail.showroomBadge')}</Badge>
        ) : verified ? (
          <Badge tone="success" icon="shield-check">{t('cars.detail.verifiedSellerBadge')}</Badge>
        ) : null}

        {typeof car.seller_sales === 'number' && car.seller_sales > 0 ? (
          <p className="text-caption text-content-secondary">
            <span className="font-bold text-content">{car.seller_sales}</span>{' '}
            {t(car.seller_sales === 1 ? 'cars.detail.sellerSalesOne' : 'cars.detail.sellerSalesMany')}
          </p>
        ) : null}
      </div>

      <p className="mt-4 max-w-prose text-caption leading-relaxed text-content-muted">
        {t('cars.detail.sellerNote')}
      </p>
      {/* A car is only public when its seller is, so this profile always exists. */}
      <p className="mt-3">
        <Link
          href={`/sellers/${car.seller_id}`}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-caption font-bold text-content underline decoration-line underline-offset-4 hover:decoration-content"
        >
          {showroom ? t('cars.detail.visitShowroom') : t('market.profile.viewProfile')}
          <Icon name="arrow-right" size={15} />
        </Link>
      </p>
    </Card>
  )
}

// ─── Structured data ─────────────────────────────────────────────────────────
// Real values only. Anything the API did not give us is left out rather than
// guessed — a rich result built on invented fields is a penalty waiting to land.

function JsonLd({ car, images }: { car: Car; images: string[] }) {
  const data: Record<string, unknown> = {
    '@type': 'Car',
    '@id': `${SITE.url}/cars/${car.id}#vehicle`,
    name: car.title,
    brand: { '@type': 'Brand', name: car.make },
    model: car.model,
    vehicleModelDate: String(car.year),
    mileageFromOdometer: { '@type': 'QuantitativeValue', value: car.mileage, unitCode: 'KMT' },
    offers: {
      '@type': 'Offer',
      price: car.price,
      priceCurrency: 'RWF',
      // A sold car keeps its URL — it has inbound links and search equity —
      // but must stop advertising itself as available.
      availability: offerAvailability(car.status),
      itemCondition: 'https://schema.org/UsedCondition',
      url: `${SITE.url}/cars/${car.id}`,
      seller: { '@id': ORG_ID },
    },
  }

  if (images.length) data.image = images.slice(0, 8)
  if (car.description) data.description = car.description
  if (car.color) data.color = car.color
  // No vehicleIdentificationNumber. The raw VIN is never public, and a masked
  // one ("JTMBFREV***3456") or a label ("VIN Verified") is not a VIN: handing
  // either to search engines as one would publish a false identifier.
  if (car.fuel_type) data.fuelType = car.fuel_type
  if (car.transmission) data.vehicleTransmission = car.transmission
  if (car.body_type) data.bodyType = car.body_type
  if (car.drive_side) {
    data.steeringPosition =
      car.drive_side === 'RHD'
        ? 'https://schema.org/RightHandDriving'
        : 'https://schema.org/LeftHandDriving'
  }

  // Breadcrumbs replace the raw UUID in the search result with a readable
  // path, and tie the listing back to the catalogue it belongs to.
  const trail = breadcrumbNode([
    { name: 'Home', path: '/' },
    { name: 'Cars for sale', path: '/cars' },
    { name: car.title, path: `/cars/${car.id}` },
  ])

  return (
    <script
      type="application/ld+json"
      // JSON.stringify does not escape `<`, so a description containing "</script>"
      // would break out of the tag. This is the standard guard.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(graph(data, trail, organizationNode())).replace(/</g, '\\u003c'),
      }}
    />
  )
}
