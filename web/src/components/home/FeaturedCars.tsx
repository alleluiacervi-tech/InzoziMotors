import Link from 'next/link'
import { Container, Icon, Section, SectionHeading } from '@/components/ui'
import { CarCard } from '@/components/marketplace/CarCard'
import type { Car } from '@/lib/types'

// Real inventory or nothing. The page passes whatever GET /cars returned; if the
// API was unreachable the caller hands us an empty array and this section
// disappears rather than showing placeholder cars that do not exist.

export function FeaturedCars({ cars }: { cars: Car[] }) {
  if (!cars.length) return null

  return (
    <Section tone="page">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Just listed"
            title="Certified and available now"
            description="Every car here has passed the 150-point check and been photographed at one of our centers."
          />
          <Link
            href="/cars"
            className="inline-flex items-center gap-1.5 pb-1 text-[15px] font-bold text-brand hover:underline"
          >
            View all cars
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map((car, i) => (
            // The first row is the LCP candidate on most viewports.
            <CarCard key={car.id} car={car} priority={i < 3} />
          ))}
        </div>
      </Container>
    </Section>
  )
}

export default FeaturedCars
