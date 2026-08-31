import Link from 'next/link'
import { Button, Card, Container, EmptyState, Icon, Section, SectionHeading } from '@/components/ui'
import { CarCard } from '@/components/marketplace/CarCard'
import { Reveal } from '@/components/ui/Reveal'
import type { Car } from '@/lib/types'

// Real inventory or a designed explanation — never placeholder cars, and never
// a silent vanish. A homepage section that disappears without a word reads as
// "they have no stock"; the honest degraded state says what actually happened
// and keeps both routes into the marketplace open.

export function FeaturedCars({ cars }: { cars: Car[] }) {
  return (
    <Section tone="page">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Just listed"
            title="Certified and available now"
            description="Fresh from inspection at our Kigali centers."
          />
          <Link
            href="/cars"
            className="inline-flex items-center gap-1.5 pb-1 text-body font-bold text-brand hover:underline"
          >
            View all cars
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>

        {cars.length ? (
          <div className="mt-12 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((car, i) => (
              // The first row is the LCP candidate on most viewports; Reveal
              // renders visible before hydration, so LCP is never delayed —
              // the cascade only exists for the rows entering from below.
              <Reveal key={car.id} delay={(i % 3) * 90} className="h-full min-w-0">
                <CarCard car={car} priority={i < 3} />
              </Reveal>
            ))}
          </div>
        ) : (
          <Card className="mt-12">
            <EmptyState
              icon="alert"
              title="The marketplace is briefly unreachable"
              description="The cars are still there — browse directly, or check back in a moment."
              action={
                <Button href="/cars" variant="outline">
                  Browse all cars
                </Button>
              }
            />
          </Card>
        )}
      </Container>
    </Section>
  )
}

export default FeaturedCars
