import type { Metadata } from 'next'
import { Suspense } from 'react'
import { rentals as rentalsApi } from '@/lib/api'
import { CONTACT, SITE } from '@/lib/site'
import { Button, Card, Container, EmptyState, Icon, Section } from '@/components/ui'
import { ChipLink } from '@/components/ui/Chip'
import { PageIntro } from '@/components/marketplace/PageIntro'
import { RentalCard } from '@/components/marketplace/RentalCard'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbNode, graph, itemListNode } from '@/lib/seo'
import { CarCardSkeleton } from '@/components/marketplace/CarCard'
import { RENTAL_INCLUDES } from '@/components/marketplace/rental-copy'

// ─────────────────────────────────────────────────────────────────────────────
// The rental fleet — the same product wearing the same clothes.
//
// Same inspection standard as the cars we sell; that is the whole pitch. The h1
// renders outside the data boundary so the page has a headline even when the
// API is down. Filtering happens on the returned fleet because GET /rentals
// takes no query parameters and the fleet is small enough that a page is all
// of it.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Rent a certified car in Kigali',
  description:
    'Rent from a fleet that passes the same 150-point inspection as the cars we sell. ' +
    'Insurance, roadside assistance and unlimited kilometres included. Deposits returned in ' +
    'full after the return check, same day, at the center.',
  alternates: { canonical: '/rentals' },
  openGraph: {
    title: `Rent a certified car in Kigali · ${SITE.name}`,
    url: '/rentals',
    images: ['/opengraph-image'],
  },
}

type PageProps = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
}

async function FleetResults({
  safariOnly, category,
}: {
  safariOnly: boolean
  category: string
}) {
  const fleet = await rentalsApi.list().catch(() => [])

  const categories = [
    ...new Set(fleet.map((car) => car.category?.trim()).filter((value): value is string => !!value)),
  ].sort((a, b) => a.localeCompare(b))

  const visible = fleet.filter((car) => {
    if (safariOnly && !car.safari_ready) return false
    if (category && car.category?.toLowerCase() !== category.toLowerCase()) return false
    return true
  })

  const safariCount = fleet.filter((car) => car.safari_ready).length

  return (
    <>
      <div className="rounded-2xl border border-line-soft bg-surface p-3 shadow-card sm:p-4">
      <ul className="flex flex-wrap gap-2.5" aria-label="Filter the fleet">
        <li>
          <ChipLink href="/rentals" selected={!safariOnly && !category}>
            All cars
          </ChipLink>
        </li>
        {safariCount > 0 ? (
          <li>
            <ChipLink href="/rentals?fit=safari" selected={safariOnly}>
              Safari-ready
            </ChipLink>
          </li>
        ) : null}
        {categories.map((value) => (
          <li key={value}>
            <ChipLink
              href={`/rentals?category=${encodeURIComponent(value)}`}
              selected={category.toLowerCase() === value.toLowerCase()}
            >
              {value}
            </ChipLink>
          </li>
        ))}
      </ul>
      </div>

      {safariOnly ? (
        <p className="mt-4 max-w-prose text-caption leading-relaxed text-content-secondary">
          Safari-ready means four-wheel drive with the ground clearance and tyres
          for park roads — Akagera, Nyungwe and Volcanoes.
        </p>
      ) : null}

      {visible.length ? (
        <>
          <JsonLd
            data={graph(
              itemListNode(
                visible.map((car) => ({ path: `/rentals/${car.id}`, name: car.title })),
                'Cars for rent in Kigali'
              ),
              breadcrumbNode([
                { name: 'Home', path: '/' },
                { name: 'Car rentals', path: '/rentals' },
              ])
            )}
          />
          <ul className="stagger mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visible.map((car, index) => (
              <li key={car.id}>
                <RentalCard car={car} priority={index < 3} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState
          icon="key"
          title={fleet.length ? 'Nothing in the fleet matches that' : 'The fleet is briefly unreachable'}
          description={
            fleet.length
              ? 'Try the full fleet — availability changes as cars come back from trips.'
              : 'The cars are still there. Check back in a moment, or ask us at a center.'
          }
          action={
            <Button href="/rentals" variant="outline">
              See the whole fleet
            </Button>
          }
          className="mt-8 rounded-2xl border border-line-soft bg-surface"
        />
      )}
    </>
  )
}

function FleetSkeleton() {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i}>
          <CarCardSkeleton />
        </li>
      ))}
    </ul>
  )
}

export default async function RentalsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const safariOnly = firstValue(params.fit) === 'safari'
  const category = firstValue(params.category)

  return (
    <>
      {/* Outside the data boundary — the headline never waits on the API. */}
      <PageIntro
        eyebrow="Rentals"
        title="Rent a certified car in Kigali"
        description="The same 150-point standard as the cars we sell. Deposits back in full after the return check."
      />

      <Container className="py-8 sm:py-12">
        <Suspense fallback={<FleetSkeleton />}>
          <FleetResults safariOnly={safariOnly} category={category} />
        </Suspense>
      </Container>

      <Section tone="surface">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
            <div>
              <p className="text-eyebrow font-bold uppercase text-brand">Included as standard</p>
              <h2 className="mt-2 text-headline font-extrabold text-content">
                No line items, no surprises at the desk
              </h2>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {RENTAL_INCLUDES.map((item) => (
                  <li key={item.label} className="flex items-start gap-3">
                    <span className="mt-0.5 text-content-secondary">
                      <Icon name={item.icon} size={20} />
                    </span>
                    <span className="text-body font-semibold text-content">{item.label}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-8 max-w-prose text-body leading-relaxed text-content-secondary">
                Pay at the center when you collect the car, or pay the rental
                online in the app — card, MTN MoMo or Airtel Money, through a
                secure checkout. The refundable deposit is always handled at the
                center. Bring your licence and ID, and we photograph the car with
                you before you drive off.
              </p>
            </div>

            <Card className="relative h-fit overflow-hidden rounded-3xl border-line p-7 shadow-float">
              <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-brand-bright to-brand-deep" />
              <h3 className="text-title font-extrabold text-content">Booking a car</h3>
              <p className="mt-3 text-caption leading-relaxed text-content-secondary">
                Tell us the dates and where you would like to collect. We confirm
                availability and hold the car for you.
              </p>
              <div className="mt-6 space-y-2">
                {CONTACT.whatsappVerified ? (
                  <Button
                    href={`https://wa.me/${CONTACT.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                      'Hi Sawa Cars, I would like to rent a car. Here are my dates:'
                    )}`}
                    target="_blank"
                    fullWidth
                    leadingIcon={<Icon name="whatsapp" size={18} />}
                  >
                    Message us on WhatsApp
                  </Button>
                ) : (
                  <Button href="/contact" fullWidth>
                    Find a center
                  </Button>
                )}
                {CONTACT.whatsappVerified ? (
                  <Button href="/contact" variant="outline" fullWidth>
                    Find a center
                  </Button>
                ) : null}
              </div>
            </Card>
          </div>
        </Container>
      </Section>
    </>
  )
}
