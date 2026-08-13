import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ApiError, rentals as rentalsApi } from '@/lib/api'
import { CENTERS, CONTACT, SITE } from '@/lib/site'
import { breadcrumbNode, graph, organizationNode, ORG_ID } from '@/lib/seo'
import { formatKm, formatUSD, getCertTier } from '@/lib/business'
import type { RentalCar } from '@/lib/types'
import { Badge, Button, Card, Container, Icon, Section } from '@/components/ui'
import { AvailabilityStrip } from '@/components/marketplace/AvailabilityStrip'
import { Gallery } from '@/components/marketplace/Gallery'
import { OpenInAppButton } from '@/components/marketplace/OpenInAppButton'
import { SpecGrid, type Spec } from '@/components/marketplace/SpecGrid'
import { RENTAL_INCLUDES, RENTAL_REQUIREMENTS } from '@/components/marketplace/rental-copy'
import { AIRPORT_PICKUP_FEE, formatRating, tripCost } from '@/components/marketplace/rental-math'

// ─────────────────────────────────────────────────────────────────────────────
// Rental detail.
//
// There is no booking form here on purpose. A rental is priced and held by a
// person at a center — the website's job is to show the real rates, the real
// availability and the conditions, then hand over to WhatsApp or the app where
// the booking actually happens. A fake form that only sends an email would be
// worse than an honest handoff.
// ─────────────────────────────────────────────────────────────────────────────

type PageProps = { params: Promise<{ id: string }> }

async function loadCar(id: string): Promise<RentalCar | null> {
  try {
    return await rentalsApi.get(id)
  } catch (err) {
    // Must agree with generateMetadata above — both run, and a mismatch means
    // one path 404s while the other 500s depending on which finishes first.
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) return null
    throw err
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params

  let car: RentalCar | null = null
  try {
    car = await rentalsApi.get(id)
  } catch (err) {
    // Same reason as the car page: this route streams, so 404 can only be set
    // here, before the first byte. A transient failure must not 404 a real car.
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound()
    car = null
  }
  if (!car) return { title: 'Rental unavailable', robots: { index: false, follow: true } }

  const description =
    `Rent the ${car.title} in Kigali from ${formatUSD(car.daily_rate)} a day. ` +
    'Inspected on the Sawa 150-point check, insurance and unlimited kilometres included, ' +
    'deposit returned in full after the return check.'

  const image = car.images?.[0]

  return {
    title: `${car.title} — ${formatUSD(car.daily_rate)} a day`,
    description,
    alternates: { canonical: `/rentals/${car.id}` },
    robots: car.status === 'active' ? undefined : { index: false, follow: true },
    openGraph: {
      title: `${car.title} — rent in Kigali`,
      description,
      url: `/rentals/${car.id}`,
      images: image ? [{ url: image, alt: car.title }] : undefined,
    },
  }
}

export default async function RentalDetailPage({ params }: PageProps) {
  const { id } = await params

  const car = await loadCar(id)
  if (!car) notFound()

  const images = (car.images ?? []).filter(Boolean)
  const tier = getCertTier(car)
  const rating = formatRating(car.rating)
  const weekly = car.weekly_rate ?? car.daily_rate * 7

  // A few trip lengths priced with the server's own formula, so the weekly rate
  // is visible before anyone asks. Never quote below this car's minimum stay.
  const quotes = [...new Set([car.min_days, 7, 14].filter((days) => days >= car.min_days))]
    .sort((a, b) => a - b)
    .map((days) => tripCost(car, days))

  const whatsappHref = `https://wa.me/${CONTACT.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
    `Hi Sawa Cars, I would like to rent the ${car.title} (${formatUSD(car.daily_rate)}/day). My dates are:`
  )}`

  const specs: Spec[] = [
    { label: 'Seats', value: car.seats ? String(car.seats) : '', icon: 'user' },
    { label: 'Gearbox', value: car.transmission ?? '', icon: 'settings' },
    { label: 'Fuel', value: car.fuel ?? '', icon: 'fuel' },
    { label: 'Year', value: car.year ? String(car.year) : '', icon: 'calendar' },
    { label: 'Category', value: car.category ?? '', icon: 'car' },
    { label: 'Odometer', value: car.mileage ? formatKm(car.mileage) : '', icon: 'gauge' },
    { label: 'Kept at', value: car.location ?? '', icon: 'location' },
    {
      label: 'Minimum stay',
      value: `${car.min_days} ${car.min_days === 1 ? 'day' : 'days'}`,
      icon: 'clock',
    },
  ]

  return (
    <article>
      <JsonLd car={car} images={images} />

      <Container className="pt-6">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-caption text-content-muted">
            <li className="flex items-center gap-1.5">
              <Link href="/" className="hover:text-content">
                Home
              </Link>
              <span aria-hidden>·</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Link href="/rentals" className="hover:text-content">
                Rentals
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
                {car.safari_ready ? (
                  <Badge tone="info" icon="location">
                    Safari-ready
                  </Badge>
                ) : null}
                {car.status !== 'active' ? <Badge tone="neutral">Not currently available</Badge> : null}
              </div>

              <h1 className="mt-3 text-headline font-extrabold text-content">{car.title}</h1>

              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-content-secondary">
                {rating ? (
                  <span className="inline-flex items-center gap-1">
                    <Icon name="star" size={14} />
                    {rating}
                  </span>
                ) : null}
                {car.trips > 0 ? (
                  <>
                    {rating ? <span aria-hidden className="text-line">·</span> : null}
                    <span>
                      {car.trips} {car.trips === 1 ? 'trip' : 'trips'}
                    </span>
                  </>
                ) : null}
                {car.location ? (
                  <>
                    <span aria-hidden className="text-line">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="location" size={14} />
                      {car.location}
                    </span>
                  </>
                ) : null}
              </p>
            </header>
          </div>

          <aside className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
            <div className="lg:sticky lg:top-[calc(var(--header-h)+24px)]">
              <Card className="p-5 sm:p-6">
                <p className="text-price-lg font-extrabold leading-none tracking-[-0.03em] text-brand">
                  {formatUSD(car.daily_rate)}
                  <span className="text-base font-bold text-content-muted"> / day</span>
                </p>

                <dl className="mt-5 space-y-2 border-t border-line-soft pt-4 text-caption">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-content-muted">Weekly rate</dt>
                    <dd className="font-bold text-content">{formatUSD(weekly)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-content-muted">Deposit</dt>
                    <dd className="font-bold text-content">{formatUSD(car.deposit)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-content-muted">Minimum stay</dt>
                    <dd className="font-bold text-content">
                      {car.min_days} {car.min_days === 1 ? 'day' : 'days'}
                    </dd>
                  </div>
                </dl>

                <p className="mt-3 text-micro leading-relaxed text-content-muted">
                  The deposit is refundable and comes back the same day, once the
                  return check is done at the center.
                </p>

                <div className="mt-5 space-y-2 border-t border-line-soft pt-5">
                  <Button
                    href={whatsappHref}
                    target="_blank"
                    size="lg"
                    fullWidth
                    leadingIcon={<Icon name="whatsapp" size={18} />}
                  >
                    Check these dates
                  </Button>
                  <OpenInAppButton path={`rentals/${car.id}`} label="Book in the app" fullWidth />
                </div>

                <p className="mt-4 text-micro leading-relaxed text-content-muted">
                  Pay at the center when you collect the car, or pay the rental
                  online in the app. The refundable deposit is always handled at
                  the center, after we have gone through the car together.
                </p>
              </Card>
            </div>
          </aside>

          <div className="min-w-0 space-y-8 lg:col-start-1 lg:row-start-2">
            <section aria-labelledby="availability-heading">
              <h2 id="availability-heading" className="mb-4 text-title font-extrabold text-content">
                Availability
              </h2>
              <AvailabilityStrip ranges={car.booked_ranges} />
            </section>

            <section aria-labelledby="specs-heading">
              <h2 id="specs-heading" className="mb-4 text-title font-extrabold text-content">
                The car
              </h2>
              <SpecGrid specs={specs} />
            </section>

            <section aria-labelledby="cost-heading">
              <h2 id="cost-heading" className="mb-4 text-title font-extrabold text-content">
                What a trip costs
              </h2>
              <Card className="overflow-hidden">
                <ul className="divide-y divide-line-soft">
                  {quotes.map((quote) => (
                    <li
                      key={quote.days}
                      className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-4"
                    >
                      <p className="text-body font-bold text-content">
                        {quote.days} {quote.days === 1 ? 'day' : 'days'}
                      </p>
                      <p className="text-caption text-content-secondary">
                        <span className="font-bold text-content">{formatUSD(quote.subtotal)}</span>{' '}
                        rental
                        <span className="text-content-muted">
                          {' '}
                          + {formatUSD(quote.deposit)} refundable deposit
                        </span>
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="border-t border-line-soft bg-surface-alt px-5 py-4 text-micro leading-relaxed text-content-muted">
                  Full weeks are billed at the weekly rate and the remaining days at
                  the daily rate. Airport meet-and-greet adds{' '}
                  {formatUSD(AIRPORT_PICKUP_FEE)}. We confirm the final figure before
                  you collect.
                </p>
              </Card>
            </section>

            <section aria-labelledby="included-heading">
              <h2 id="included-heading" className="mb-4 text-title font-extrabold text-content">
                Included in every rental
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {RENTAL_INCLUDES.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-start gap-3 rounded-xl border border-line-soft bg-surface p-4"
                  >
                    <span className="mt-0.5 text-content-secondary">
                      <Icon name={item.icon} size={19} />
                    </span>
                    <span className="text-caption font-semibold text-content">{item.label}</span>
                  </li>
                ))}
              </ul>
            </section>

            <Card className="p-5 sm:p-6">
              <h2 className="text-title font-extrabold text-content">What to bring</h2>
              <ul className="mt-4 space-y-2.5">
                {RENTAL_REQUIREMENTS.map((requirement) => (
                  <li key={requirement} className="flex items-start gap-3">
                    <Icon name="check" size={17} className="mt-0.5 text-content-secondary" />
                    <span className="text-body leading-relaxed text-content-secondary">
                      {requirement}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <section aria-labelledby="pickup-heading">
              <h2 id="pickup-heading" className="mb-4 text-title font-extrabold text-content">
                Where to collect
              </h2>
              <ul className="grid gap-3 sm:grid-cols-3">
                {CENTERS.map((center) => (
                  <li key={center.id} className="rounded-xl border border-line-soft bg-surface p-4">
                    <p className="text-caption font-bold text-content">{center.name}</p>
                    <p className="mt-1 text-caption text-content-secondary">{center.address}</p>
                    <p className="mt-2 text-micro text-content-muted">{center.hours}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 max-w-prose text-caption leading-relaxed text-content-secondary">
                Cars are collected from the center they are kept at. Airport
                meet-and-greet at Kigali International is available as an add-on for{' '}
                {formatUSD(AIRPORT_PICKUP_FEE)}.
              </p>
            </section>
          </div>
        </div>
      </Container>

      <Section tone="alt">
        <Container>
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="max-w-xl">
              <h2 className="text-title font-extrabold text-content">
                Renting to see whether you want to buy?
              </h2>
              <p className="mt-2 text-body leading-relaxed text-content-secondary">
                Plenty of buyers do. The same 150-point standard applies to the cars
                on the marketplace, and every purchase carries the 7-day drive-it
                guarantee.
              </p>
            </div>
            <Button href="/cars" variant="outline">
              Browse cars for sale
            </Button>
          </div>
        </Container>
      </Section>
    </article>
  )
}

// Real values only — the daily rate, in dollars, for the car we actually hold.
function JsonLd({ car, images }: { car: RentalCar; images: string[] }) {
  const data: Record<string, unknown> = {
    '@type': 'Product',
    '@id': `${SITE.url}/rentals/${car.id}#rental`,
    name: car.title,
    category: 'Car rental',
    offers: {
      '@type': 'Offer',
      price: car.daily_rate,
      priceCurrency: 'RWF',
      // Priced per day — saying so stops Google reading $80 as the car's value.
      unitCode: 'DAY',
      availability:
        car.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${SITE.url}/rentals/${car.id}`,
      seller: { '@id': ORG_ID },
    },
  }

  if (images.length) data.image = images.slice(0, 8)
  if (car.make) data.brand = { '@type': 'Brand', name: car.make }
  if (car.model) data.model = car.model

  const trail = breadcrumbNode([
    { name: 'Home', path: '/' },
    { name: 'Car rentals', path: '/rentals' },
    { name: car.title, path: `/rentals/${car.id}` },
  ])

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(graph(data, trail, organizationNode())).replace(/</g, '\\u003c'),
      }}
    />
  )
}
