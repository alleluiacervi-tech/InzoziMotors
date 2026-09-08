import Link from 'next/link'
import { Button, Card, Container, EmptyState, Icon, Section, SectionHeading } from '@/components/ui'
import { CarCard } from '@/components/marketplace/CarCard'
import { Reveal } from '@/components/ui/Reveal'
import type { Car } from '@/lib/types'
import { getServerT } from '@/lib/i18n/server'

// Real inventory or a designed explanation — never placeholder cars, and never
// a silent vanish. A homepage section that disappears without a word reads as
// "they have no stock"; the honest degraded state says what actually happened
// and keeps both routes into the marketplace open.

export async function FeaturedCars({ cars }: { cars: Car[] }) {
  const t = await getServerT()
  return (
    <Section tone="page">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow={t('home.featured.eyebrow')}
            title={t('home.featured.title')}
            description={t('home.featured.description')}
          />
          <Link
            href="/cars"
            className="inline-flex items-center gap-1.5 pb-1 text-body font-bold text-brand hover:underline"
          >
            {t('home.featured.viewAll')}
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>

        {/* Quick Filter Pills */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link
            href="/cars"
            className="rounded-full bg-brand px-3.5 py-1.5 text-caption font-bold text-white shadow-brand hover:bg-brand-bright transition-all"
          >
            All Stock
          </Link>
          <Link
            href="/cars?body_type=SUV"
            className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-caption font-semibold text-content hover:border-brand hover:text-brand transition-all"
          >
            SUVs & 4x4
          </Link>
          <Link
            href="/cars?body_type=Sedan"
            className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-caption font-semibold text-content hover:border-brand hover:text-brand transition-all"
          >
            Sedans
          </Link>
          <Link
            href="/cars?body_type=Pickup"
            className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-caption font-semibold text-content hover:border-brand hover:text-brand transition-all"
          >
            Pickups
          </Link>
          <Link
            href="/cars?max_price=25000000"
            className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-caption font-semibold text-content hover:border-brand hover:text-brand transition-all"
          >
            Under 25M RWF
          </Link>
          <Link
            href="/cars?max_price=50000000"
            className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-caption font-semibold text-content hover:border-brand hover:text-brand transition-all"
          >
            Under 50M RWF
          </Link>
        </div>

        {cars.length ? (
          <>
            <div className="mt-8 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {cars.map((car, i) => (
                <Reveal key={car.id} delay={(i % 3) * 90} className="h-full min-w-0">
                  <CarCard car={car} priority={i < 3} />
                </Reveal>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/cars"
                className="inline-flex items-center gap-2 rounded-2xl border border-line bg-surface px-6 py-3 text-caption font-bold text-content shadow-card hover:border-brand hover:text-brand transition-all"
              >
                <span>Browse All Certified Vehicles</span>
                <Icon name="arrow-right" size={14} />
              </Link>
            </div>
          </>
        ) : (
          <Card className="mt-12">
            <EmptyState
              icon="alert"
              title={t('home.featured.emptyTitle')}
              description={t('home.featured.emptyDescription')}
              action={
                <Button href="/cars" variant="outline">
                  {t('home.featured.emptyAction')}
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
