import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ApiError, cars as carsApi } from '@/lib/api'
import { getCurrentUser } from '@/lib/session'
import { BUYING_STEPS, SITE } from '@/lib/site'
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
import { OpenInAppButton } from '@/components/marketplace/OpenInAppButton'
import { Sparkline } from '@/components/marketplace/Sparkline'
import { SpecGrid, type Spec } from '@/components/marketplace/SpecGrid'
import { VehicleHistoryCard } from '@/components/marketplace/VehicleHistoryCard'
import { RequestCarForm } from './RequestCarForm'

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
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_392px] lg:gap-14">
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
                    <span className="block text-micro font-semibold text-brand group-hover:underline">
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
                <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-brand-bright to-brand-deep" />
                <p className="mb-3 text-micro font-bold text-content-muted">{t('cars.detail.purchaseOverview')}</p>
                {/* Zone 1 — price. The market sentence shows its work: amount
                    and sample size, never a bare percentage in a pill. */}
                <Price amountRwf={car.price} size="detail" />
                <p className="mt-2 text-caption text-content-secondary">
                  {t('cars.detail.monthlyFinance', { amount: formatMoney(monthly) })}
                </p>
                {/* Where the dollar line above comes from. A converted figure
                    without its rate and its date is how the old hardcoded 1300
                    drifted 12% from reality unnoticed. */}
                <RateNote className="mt-3" />

                {market && car.market_avg ? (
                  <p
                    className={`mt-3 text-caption font-semibold ${
                      market.tone === 'good'
                        ? 'text-success'
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
                      <p className="text-micro leading-relaxed text-content-muted">
                        {t('cars.detail.contactGate')}{' '}
                        <Link href="/how-it-works" className="font-bold text-brand hover:underline">
                          {t('cars.detail.seeHowBuying')}
                        </Link>
                        .
                      </p>
                    </div>
                  )}

                  <div className="mt-4 space-y-2">
                    <OpenInAppButton path={`cars/${car.id}`} variant="ghost" fullWidth />
                  </div>

                  <p className="mt-4 flex items-start gap-1.5 text-micro font-semibold text-content-secondary">
                    <Icon name="shield" size={14} className="mt-px shrink-0" />
                    {t('cars.detail.trustLine')}
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
                      <Link href="/tools/import-duty" className="font-bold text-brand hover:underline">
                        {t('cars.detail.estimateDuty')}
                      </Link>
                    </p>
                  </div>
                </details>
              </Card>

              <p className="mt-4 flex items-start gap-2 px-1 text-micro leading-relaxed text-content-muted">
                <Icon name="location" size={14} className="mt-0.5" />
                {t('cars.detail.arrangeViewing')}
              </p>
            </div>
          </aside>

          <div className="min-w-0 space-y-8 lg:col-start-1 lg:row-start-2">
            <DecisionSummary car={car} report={report} history={vehicleHistory} />

            <section aria-labelledby="specs-heading" className="rounded-3xl border border-line-soft bg-surface p-5 shadow-card sm:p-7">
              <h2 id="specs-heading" className="mb-4 text-title font-extrabold text-content">
                {t('cars.detail.specification')}
              </h2>
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

            {/* The provenance claim, stated exactly once on this page — three
                facts above the report they produced. */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-2xl border border-line-soft bg-surface-alt px-5 py-4">
              {[
                t('cars.detail.provInspected'),
                t('cars.detail.provPhotographed'),
                t('cars.detail.provPublished'),
              ].map((fact) => (
                <p key={fact} className="flex items-center gap-1.5 text-caption font-semibold text-content-secondary">
                  <Icon name="check-circle" size={15} className="text-success" />
                  {fact}
                </p>
              ))}
            </div>

            <div id="inspection" className="scroll-mt-28">
              <InspectionReportCard report={report} />
            </div>

            {!report && car.inspected ? (
              <Alert tone="info" title={t('cars.detail.reportPendingTitle')}>
                {t('cars.detail.reportPendingBody')}
              </Alert>
            ) : null}

            {/* Marketplace role, between the evidence and the history. */}
            <Card className="p-5 sm:p-6">
              <h2 className="text-title-sm font-extrabold text-content">
                {t('cars.detail.roleTitle')}
              </h2>
              <p className="mt-2 max-w-prose text-body leading-relaxed text-content-secondary">
                {t('cars.detail.roleBody')}
              </p>
              <p className="mt-3 text-caption">
                <Link href="/legal/terms" className="font-bold text-brand hover:underline">
                  {t('cars.detail.readTerms')}
                </Link>
              </p>
            </Card>

            <VehicleHistoryCard history={vehicleHistory} />

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
                <p className="text-caption font-bold text-brand">{t('cars.detail.similarEyebrow')}</p>
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

async function DecisionSummary({ car, report, history }: { car: Car; report: Awaited<ReturnType<typeof carsApi.inspectionReport>> | null; history: Awaited<ReturnType<typeof carsApi.history>> | null }) {
  const t = await getServerT()
  const documentChecks = history
    ? [history.rra_duty_paid, history.registration, history.service_history, history.insurance_valid]
    : []
  const verifiedDocuments = documentChecks.filter((value) => value === 'pass').length
  const documentIssues = documentChecks.filter((value) => value === 'flag' || value === 'fail').length
  const sellerVerified = car.seller_id_verified === 'approved'

  const signals = [
    {
      icon: report ? 'shield-check' : 'clock',
      label: t('cars.detail.signalInspection'),
      value: report ? t('cars.detail.inspectionRecorded', { score: report.score }) : car.inspected ? t('cars.detail.reportBeingPrepared') : t('cars.detail.notYetPublished'),
      tone: report ? 'text-success' : 'text-content-muted',
    },
    {
      icon: documentIssues ? 'alert' : verifiedDocuments ? 'check-circle' : 'minus',
      label: t('cars.detail.signalPaperwork'),
      value: documentIssues ? t(documentIssues === 1 ? 'cars.detail.itemNeedsAttention' : 'cars.detail.itemsNeedAttention', { count: documentIssues }) : verifiedDocuments ? t('cars.detail.checksVerified', { count: verifiedDocuments }) : t('cars.detail.noEvidenceYet'),
      tone: documentIssues ? 'text-warning-text' : verifiedDocuments ? 'text-success' : 'text-content-muted',
    },
    {
      icon: sellerVerified ? 'shield-check' : 'user',
      label: t('cars.detail.signalSeller'),
      value: sellerVerified ? t('cars.detail.identityVerified') : t('cars.detail.verificationUnavailable'),
      tone: sellerVerified ? 'text-success' : 'text-content-muted',
    },
    {
      icon: 'check-circle',
      label: t('cars.detail.signalTransaction'),
      value: t('cars.detail.directAgreement'),
      tone: 'text-content-secondary',
    },
  ] as const

  return (
    <section aria-labelledby="decision-heading" className="overflow-hidden rounded-3xl border border-line-soft bg-surface shadow-card">
      <div className="border-b border-line-soft px-5 py-4 sm:px-7">
        <p className="text-caption font-bold text-brand">{t('cars.detail.decisionEyebrow')}</p>
        <h2 id="decision-heading" className="mt-2 text-title font-extrabold text-content">{t('cars.detail.decisionTitle')}</h2>
        <p className="mt-1 text-caption text-content-muted">{t('cars.detail.decisionNote')}</p>
      </div>
      <dl className="grid sm:grid-cols-2">
        {signals.map((signal, index) => (
          // A <dl> group may hold only <dt>/<dd>, so the icon rides inside
          // the term and is placed against the group's padding instead of
          // sitting in a wrapper <div> of its own.
          <div key={signal.label} className={`relative border-b border-line-soft py-4 pl-[3.25rem] pr-5 last:border-b-0 sm:pl-[3.75rem] sm:pr-7 ${index < 2 ? 'sm:border-b' : 'sm:border-b-0'} ${index % 2 === 0 ? 'sm:border-r sm:border-line-soft' : ''}`}>
            <dt className="text-micro font-bold text-content-muted">
              <Icon name={signal.icon} size={19} className={`absolute left-5 top-[1.1rem] sm:left-7 ${signal.tone}`} aria-hidden="true" />
              {signal.label}
            </dt>
            <dd className="mt-1 text-caption font-bold text-content">{signal.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

// ─── Seller ──────────────────────────────────────────────────────────────────

async function SellerCard({ car }: { car: Car }) {
  if (!car.seller_name) return null
  const t = await getServerT()
  const verified = car.seller_id_verified === 'approved'

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-title font-extrabold text-content">{t('cars.detail.sellerTitle')}</h2>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-pill bg-surface-alt text-content-secondary">
            <Icon name="user" size={20} />
          </span>
          <div>
            <p className="text-body font-bold text-content">{car.seller_name}</p>
            <p className="text-caption text-content-muted">
              {verified ? t('cars.detail.sellerVerified') : t('cars.detail.sellerUnverified')}
            </p>
          </div>
        </div>

        {verified ? <Badge tone="success" icon="shield-check">{t('cars.detail.verifiedSellerBadge')}</Badge> : null}

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
  // Privacy Guardrail: Never expose raw unmasked VIN in public SEO schema or search indexes
  if (car.vin_masked || car.vin) data.vehicleIdentificationNumber = car.vin_masked || 'VIN Verified'
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
