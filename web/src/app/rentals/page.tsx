import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { rentals as rentalsApi } from '@/lib/api'
import { CONTACT, SITE } from '@/lib/site'
import { Button, Card, Container, EmptyState, Icon, Section } from '@/components/ui'
import { RentalCard } from '@/components/marketplace/RentalCard'
import { RENTAL_INCLUDES } from '@/components/marketplace/rental-copy'

// ─────────────────────────────────────────────────────────────────────────────
// The rental fleet.
//
// Same inspection standard as the cars we sell — that is the whole pitch, and
// it is the reason a visitor should rent from Inzozi rather than from a
// classifieds post. Filtering happens on the returned fleet rather than in the
// API, because GET /rentals takes no query parameters and the fleet is small
// enough that a page of it is all of it.
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
  },
}

type PageProps = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
}

export default async function RentalsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const safariOnly = firstValue(params.fit) === 'safari'
  const category = firstValue(params.category)

  const fleet = await rentalsApi.list()

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
      <Container className="py-8 sm:py-12">
        <header className="max-w-2xl">
          <p className="text-eyebrow font-bold uppercase text-brand">Rentals</p>
          <h1 className="mt-3 text-headline font-extrabold text-content">
            Rent a certified car in Kigali
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-content-secondary">
            Every car in the fleet passes the same 150-point inspection as the cars
            we sell. Your deposit comes back in full after the return check — same
            day, at the center, with condition photos on both sides.
          </p>
        </header>

        <ul className="mt-8 flex flex-wrap gap-2" aria-label="Filter the fleet">
          <li>
            <FilterChip href="/rentals" active={!safariOnly && !category}>
              All cars
            </FilterChip>
          </li>
          {safariCount > 0 ? (
            <li>
              <FilterChip href="/rentals?fit=safari" active={safariOnly}>
                Safari-ready
              </FilterChip>
            </li>
          ) : null}
          {categories.map((value) => (
            <li key={value}>
              <FilterChip
                href={`/rentals?category=${encodeURIComponent(value)}`}
                active={category.toLowerCase() === value.toLowerCase()}
              >
                {value}
              </FilterChip>
            </li>
          ))}
        </ul>

        {safariOnly ? (
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-content-secondary">
            Safari-ready means four-wheel drive with the ground clearance and tyres
            for park roads — Akagera, Nyungwe and Volcanoes.
          </p>
        ) : null}

        {visible.length ? (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((car, index) => (
              <li key={car.id}>
                <RentalCard car={car} priority={index < 3} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon="key"
            title={fleet.length ? 'Nothing in the fleet matches that' : 'The fleet is fully booked'}
            description={
              fleet.length
                ? 'Try the full fleet — availability changes as cars come back from trips.'
                : 'Every car is out on a trip or in for its service check. Message us and we will tell you what frees up first.'
            }
            action={
              <Button href="/rentals" variant="outline">
                See the whole fleet
              </Button>
            }
            className="mt-8 rounded-2xl border border-line-soft bg-surface"
          />
        )}
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
                    <span className="text-[15px] font-semibold text-content">{item.label}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-8 max-w-prose text-[15px] leading-relaxed text-content-secondary">
                Payment happens in person at the center when you collect the car —
                there is no payment feature on this website or in the app. Bring
                your licence and ID, and we photograph the car with you before you
                drive off.
              </p>
            </div>

            <Card className="h-fit p-6">
              <h3 className="text-title font-extrabold text-content">Booking a car</h3>
              <p className="mt-3 text-sm leading-relaxed text-content-secondary">
                Tell us the dates and where you would like to collect. We confirm
                availability and hold the car for you.
              </p>
              <div className="mt-6 space-y-2">
                <Button
                  href={`https://wa.me/${CONTACT.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                    'Hi Inzozi, I would like to rent a car. Here are my dates:'
                  )}`}
                  target="_blank"
                  fullWidth
                  leadingIcon={<Icon name="whatsapp" size={18} />}
                >
                  Message us on WhatsApp
                </Button>
                <Button href="/contact" variant="outline" fullWidth>
                  Find a center
                </Button>
              </div>
            </Card>
          </div>
        </Container>
      </Section>
    </>
  )
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={`inline-flex h-10 items-center rounded-pill border px-4 text-[13px] font-bold transition-colors ${
        active
          ? 'border-brand bg-brand text-white'
          : 'border-line bg-surface text-content hover:border-content-muted hover:bg-surface-alt'
      }`}
    >
      {children}
    </Link>
  )
}
