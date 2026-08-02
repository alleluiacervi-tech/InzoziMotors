import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ApiError, cars as carsApi } from '@/lib/api'
import { getCurrentUser } from '@/lib/session'
import { BUYING_STEPS, CONTACT, SITE } from '@/lib/site'
import {
  CAR_STATUS_LABEL,
  FINANCE_TERMS,
  formatKm,
  formatRWF,
  formatUSD,
  getCertTier,
  isHighDemand,
  isNewListing,
  listedAgo,
  marketPosition,
  monthlyEstimate,
  priceDrop,
} from '@/lib/business'
import type { Car } from '@/lib/types'
import { Alert, Badge, Button, Card, Container, Icon, Section } from '@/components/ui'
import { CarCard } from '@/components/marketplace/CarCard'
import { Gallery } from '@/components/marketplace/Gallery'
import { InspectionReportCard } from '@/components/marketplace/InspectionReportCard'
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
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params

  let car: Car | null = null
  try {
    car = await carsApi.get(id)
  } catch {
    car = null
  }
  if (!car) {
    return { title: 'Car not found', robots: { index: false, follow: true } }
  }

  const facts = [String(car.year), formatKm(car.mileage), car.fuel_type, car.transmission]
    .filter(Boolean)
    .join(' · ')

  const description = car.inspected
    ? `${car.title} — ${facts}. ${formatUSD(car.price)} in Kigali. Passed the Sawa 150-point inspection, photographed by our team, covered by the 7-day drive-it guarantee.`
    : `${car.title} — ${facts}. ${formatUSD(car.price)} in Kigali, listed by Sawa.`

  const image = car.images?.[0]

  return {
    title: `${car.title} — ${formatUSD(car.price)}`,
    description,
    alternates: { canonical: `/cars/${car.id}` },
    robots: car.status === 'live' ? undefined : { index: false, follow: true },
    openGraph: {
      type: 'website',
      title: `${car.title} — ${formatUSD(car.price)}`,
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
  const market = marketPosition(car)
  const drop = priceDrop(car)
  const monthly = monthlyEstimate(car.price)
  const priceHistory = car.price_history ?? []

  const isAvailable = car.status === 'live'
  const isOwnListing = Boolean(user && user.id === car.seller_id)

  // Always the Sawa business line, never car.seller_phone. The app can surface
  // a seller's number to a signed-in buyer; a public page cannot, because it is
  // crawled — and because Sawa Cars is the middleman, so the conversation belongs
  // with us anyway.
  const contactMessage = `Hi Sawa, I'm interested in the ${car.title} (${formatUSD(car.price)}) on your website. Is it still available?`
  const whatsappHref = `https://wa.me/${CONTACT.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(contactMessage)}`

  const specs: Spec[] = [
    { label: 'Year', value: String(car.year), icon: 'calendar' },
    { label: 'Mileage', value: formatKm(car.mileage), icon: 'gauge' },
    { label: 'Fuel', value: car.fuel_type ?? '', icon: 'fuel' },
    { label: 'Gearbox', value: car.transmission ?? '', icon: 'settings' },
    { label: 'Body type', value: car.body_type ?? '', icon: 'car' },
    { label: 'Colour', value: car.color ?? '' },
    {
      label: 'Drive side',
      value:
        car.drive_side === 'RHD'
          ? 'Right-hand drive'
          : car.drive_side === 'LHD'
          ? 'Left-hand drive'
          : '',
      hint:
        car.drive_side === 'RHD'
          ? 'Japanese import'
          : car.drive_side === 'LHD'
          ? 'Bought locally'
          : undefined,
      icon: 'key',
    },
    { label: 'Location', value: car.location ?? '', icon: 'location' },
  ]

  return (
    <article>
      <JsonLd car={car} images={images} />

      <Container className="pt-6">
        <nav aria-label="Breadcrumb">
          {/* Separators live inside their list item, so a screen reader counts
              four crumbs rather than seven. */}
          <ol className="flex flex-wrap items-center gap-1.5 text-caption text-content-muted">
            <li className="flex items-center gap-1.5">
              <Link href="/" className="hover:text-content">
                Home
              </Link>
              <span aria-hidden>·</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Link href="/cars" className="hover:text-content">
                Cars
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

      <Container className="pb-16 pt-6 sm:pb-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_368px] lg:gap-12">
          {/* Explicit placement so the price and CTA sit directly under the
              gallery on a phone, instead of below every report on the page. */}
          <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-1">
            <Gallery images={images} title={car.title} />

            <header>
              <div className="flex flex-wrap items-center gap-2">
                {tier ? (
                  <Badge
                    tone={tier.key === 'plus' ? 'certPlus' : tier.key === 'certified' ? 'cert' : 'inspected'}
                    icon="shield-check"
                  >
                    {tier.label}
                  </Badge>
                ) : null}
                {drop > 0 ? (
                  <Badge tone="warning" icon="trending-down">
                    Price reduced
                  </Badge>
                ) : null}
                {isNewListing(car) && drop === 0 ? <Badge tone="info">New listing</Badge> : null}
                {isHighDemand(car) ? <Badge tone="danger">High demand</Badge> : null}
                {!isAvailable ? (
                  <Badge tone={car.status === 'reserved' ? 'reserved' : 'neutral'}>
                    {CAR_STATUS_LABEL[car.status] ?? car.status}
                  </Badge>
                ) : null}
              </div>

              <h1 className="mt-3 text-headline font-extrabold text-content">{car.title}</h1>

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
                    <span>{car.saves_count} saved</span>
                  </>
                ) : null}
              </p>
            </header>
          </div>

          <aside className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
            <div className="lg:sticky lg:top-[calc(var(--header-h)+24px)]">
              <Card className="p-5 sm:p-6">
                {/* Zone 1 — price. The market sentence shows its work: amount
                    and sample size, never a bare percentage in a pill. */}
                <p className="text-[32px] font-extrabold leading-none tracking-[-0.03em] text-brand">
                  {formatUSD(car.price)}
                </p>
                <p className="mt-2 text-caption text-content-secondary">
                  {formatRWF(car.price)} · ~{formatUSD(monthly)}/mo est.
                </p>

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
                      ? `At market price · ${car.comparables} similar cars`
                      : `${formatRWF(Math.abs(car.market_avg - car.price))} ${
                          market.tone === 'good' ? 'below' : 'above'
                        } the average of ${car.comparables} similar cars`}
                  </p>
                ) : null}

                {drop > 0 ? (
                  <p className="mt-2 text-caption font-semibold text-warning-text">
                    Reduced by {formatUSD(drop)} since it was listed
                  </p>
                ) : null}

                {/* Zone 2 — action. Second, not fifth: the decision surface sits
                    directly under the price, above every disclaimer. */}
                <div className="mt-5 border-t border-line-soft pt-5">
                  {!isAvailable ? (
                    <div className="space-y-4">
                      <Alert tone={car.status === 'reserved' ? 'warning' : 'info'}>
                        {car.status === 'reserved'
                          ? 'Another buyer has requested this car. It returns to the marketplace if they release it.'
                          : 'This car has been sold and is no longer available.'}
                      </Alert>
                      <Button href="/cars" variant="outline" fullWidth>
                        Browse available cars
                      </Button>
                    </div>
                  ) : isOwnListing ? (
                    <div className="space-y-4">
                      <Alert tone="info">This is your listing, so you cannot request it.</Alert>
                      <Button href="/dashboard" variant="outline" fullWidth>
                        Manage this listing
                      </Button>
                    </div>
                  ) : user ? (
                    <RequestCarForm carId={car.id} phone={user.phone} />
                  ) : (
                    <div className="space-y-4">
                      <Button
                        href={`/signin?next=${encodeURIComponent(`/cars/${car.id}`)}`}
                        size="lg"
                        fullWidth
                        trailingIcon={<Icon name="arrow-right" size={18} />}
                      >
                        Request this car
                      </Button>
                      <p className="text-micro leading-relaxed text-content-muted">
                        Sign in first so we can reserve the car in your name. No
                        payment now, and none in the app —{' '}
                        <Link href="/how-it-works" className="font-bold text-brand hover:underline">
                          see how buying works
                        </Link>
                        .
                      </p>
                    </div>
                  )}

                  <div className="mt-4 space-y-2">
                    {CONTACT.whatsappVerified ? (
                      <Button
                        href={whatsappHref}
                        variant="outline"
                        fullWidth
                        target="_blank"
                        leadingIcon={<Icon name="whatsapp" size={17} className="text-content-secondary" />}
                      >
                        Ask a question on WhatsApp
                      </Button>
                    ) : null}
                    <OpenInAppButton path={`cars/${car.id}`} variant="ghost" fullWidth />
                  </div>

                  <p className="mt-4 flex items-start gap-1.5 text-micro font-semibold text-content-secondary">
                    <Icon name="shield" size={14} className="mt-px shrink-0" />
                    The Sawa 7-Day Guarantee · Handover at an Sawa center
                  </p>
                </div>

                {/* Zone 3 — context, collapsed. Estimates and history matter,
                    but they never again sit visually equal to the CTA. */}
                <details className="group mt-5 border-t border-line-soft pt-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-caption font-bold text-content [&::-webkit-details-marker]:hidden">
                    Price history &amp; financing
                    <Icon name="chevron-down" size={16} className="transition-transform group-open:rotate-180" />
                  </summary>

                  <div className="pt-4">
                    {priceHistory.length >= 2 ? (
                      <div className="mb-4">
                        <p className="mb-2 text-micro font-bold uppercase tracking-wide text-content-muted">
                          Asking price since listing
                        </p>
                        <Sparkline points={priceHistory} />
                      </div>
                    ) : null}

                    <p className="text-caption text-content-secondary">
                      <span className="font-bold text-content">~{formatUSD(monthly)} a month</span>{' '}
                      if financed
                    </p>
                    <p className="mt-1 text-micro leading-relaxed text-content-muted">
                      An estimate only, using {FINANCE_TERMS.downPaymentPct}% deposit,{' '}
                      {FINANCE_TERMS.annualRatePct}% a year over {FINANCE_TERMS.termMonths} months.
                      Sawa Cars does not lend — your bank sets the real terms.
                    </p>
                    <p className="mt-3 text-caption">
                      <Link href="/tools/import-duty" className="font-bold text-brand hover:underline">
                        Estimate RRA import duty
                      </Link>
                    </p>
                  </div>
                </details>
              </Card>

              <p className="mt-4 flex items-start gap-2 px-1 text-micro leading-relaxed text-content-muted">
                <Icon name="location" size={14} className="mt-0.5" />
                Handovers happen at an Sawa center in Kigali, with our team
                present for the documents and the RRA transfer.
              </p>
            </div>
          </aside>

          <div className="min-w-0 space-y-8 lg:col-start-1 lg:row-start-2">
            <section aria-labelledby="specs-heading">
              <h2 id="specs-heading" className="mb-4 text-title font-extrabold text-content">
                Specification
              </h2>
              <SpecGrid specs={specs} />
            </section>

            {car.description ? (
              <section aria-labelledby="about-heading">
                <h2 id="about-heading" className="mb-3 text-title font-extrabold text-content">
                  About this car
                </h2>
                <p className="max-w-prose whitespace-pre-line text-body leading-relaxed text-content-secondary">
                  {car.description}
                </p>
              </section>
            ) : null}

            {/* The provenance claim, stated exactly once on this page — three
                facts above the report they produced. */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-2xl border border-line-soft bg-surface-alt px-5 py-4">
              {['Inspected by our mechanics', 'Photographed at our center', 'Published by Sawa'].map(
                (fact) => (
                  <p key={fact} className="flex items-center gap-1.5 text-caption font-semibold text-content-secondary">
                    <Icon name="check-circle" size={15} className="text-success" />
                    {fact}
                  </p>
                )
              )}
            </div>

            <InspectionReportCard report={report} />

            {!report && car.inspected ? (
              <Alert tone="info" title="Report being written up">
                This car has been inspected. The full 150-point report is published
                on this page as soon as the center files it.
              </Alert>
            ) : null}

            {/* The named guarantee, between the evidence and the history. */}
            <Card className="p-5 sm:p-6">
              <h2 className="text-title-sm font-extrabold text-content">
                The Sawa 7-Day Guarantee
              </h2>
              <p className="mt-2 max-w-prose text-body leading-relaxed text-content-secondary">
                From the day of handover you have 7 days: if this car doesn&apos;t match the
                report above, return it to any Sawa center for a full refund. It applies to
                every purchase handed over at our centers — no premium tier required.
              </p>
              <p className="mt-3 text-caption">
                <Link href="/legal/guarantee" className="font-bold text-brand hover:underline">
                  The guarantee terms in full
                </Link>
              </p>
            </Card>

            <VehicleHistoryCard history={vehicleHistory} />

            <SellerCard car={car} />

            <section aria-labelledby="next-heading">
              <h2 id="next-heading" className="mb-4 text-title font-extrabold text-content">
                What happens after you request
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
                <p className="text-eyebrow font-bold uppercase text-brand">Similar cars</p>
                <h2 className="mt-2 text-headline font-extrabold text-content">
                  More {car.make} on Sawa
                </h2>
              </div>
              <Button href={`/cars?make=${encodeURIComponent(car.make)}`} variant="outline" size="sm">
                See all {car.make}
              </Button>
            </div>

            <ul className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {similar.map((other) => (
                <li key={other.id}>
                  <CarCard car={other} />
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}
    </article>
  )
}

// ─── Seller ──────────────────────────────────────────────────────────────────

function SellerCard({ car }: { car: Car }) {
  if (!car.seller_name) return null
  const verified = car.seller_id_verified === 'approved'

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-title font-extrabold text-content">The seller</h2>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-pill bg-surface-alt text-content-secondary">
            <Icon name="user" size={20} />
          </span>
          <div>
            <p className="text-body font-bold text-content">{car.seller_name}</p>
            <p className="text-caption text-content-muted">
              {verified ? 'Identity verified by Sawa' : 'Identity not yet verified'}
            </p>
          </div>
        </div>

        {verified ? <Badge tone="success" icon="shield-check">Verified seller</Badge> : null}

        {typeof car.seller_sales === 'number' && car.seller_sales > 0 ? (
          <p className="text-caption text-content-secondary">
            <span className="font-bold text-content">{car.seller_sales}</span> completed{' '}
            {car.seller_sales === 1 ? 'sale' : 'sales'} through Sawa
          </p>
        ) : null}
      </div>

      <p className="mt-4 max-w-prose text-caption leading-relaxed text-content-muted">
        You deal with Sawa, not the seller — the handover happens at our center.
      </p>
    </Card>
  )
}

// ─── Structured data ─────────────────────────────────────────────────────────
// Real values only. Anything the API did not give us is left out rather than
// guessed — a rich result built on invented fields is a penalty waiting to land.

function JsonLd({ car, images }: { car: Car; images: string[] }) {
  const availability =
    car.status === 'live'
      ? 'https://schema.org/InStock'
      : car.status === 'reserved'
      ? 'https://schema.org/LimitedAvailability'
      : 'https://schema.org/SoldOut'

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: car.title,
    brand: { '@type': 'Brand', name: car.make },
    model: car.model,
    vehicleModelDate: String(car.year),
    mileageFromOdometer: { '@type': 'QuantitativeValue', value: car.mileage, unitCode: 'KMT' },
    offers: {
      '@type': 'Offer',
      price: car.price,
      priceCurrency: 'USD',
      availability,
      itemCondition: 'https://schema.org/UsedCondition',
      url: `${SITE.url}/cars/${car.id}`,
      seller: { '@type': 'Organization', name: SITE.name },
    },
  }

  if (images.length) data.image = images.slice(0, 8)
  if (car.description) data.description = car.description
  if (car.color) data.color = car.color
  if (car.vin) data.vehicleIdentificationNumber = car.vin
  if (car.fuel_type) data.fuelType = car.fuel_type
  if (car.transmission) data.vehicleTransmission = car.transmission
  if (car.body_type) data.bodyType = car.body_type
  if (car.drive_side) {
    data.steeringPosition =
      car.drive_side === 'RHD'
        ? 'https://schema.org/RightHandDriving'
        : 'https://schema.org/LeftHandDriving'
  }

  return (
    <script
      type="application/ld+json"
      // JSON.stringify does not escape `<`, so a description containing "</script>"
      // would break out of the tag. This is the standard guard.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
