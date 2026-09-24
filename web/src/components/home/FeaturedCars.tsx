import Link from 'next/link'
import { Button, Card, Container, EmptyState, Icon, Section } from '@/components/ui'
import { CarCard } from '@/components/marketplace/CarCard'
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
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0 max-w-2xl">
            <h2 className="text-headline font-extrabold text-content">{t('home.featured.title')}</h2>
            <p className="mt-2 text-body text-content-secondary">{t('home.featured.description')}</p>
          </div>
          <Link
            href="/cars"
            className="-my-2 inline-flex items-center gap-1.5 py-2 text-body font-bold text-brand hover:underline"
          >
            {t('home.featured.viewAll')}
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>

        {/* The quick-filter pill row that sat here is gone. It repeated
            BrowseEntry's four body-type cards immediately below it and added a
            third set of price bands — hero said 15/30/50/100M, these said
            25/50M, the chips below said 10/20/35M. Filtering lives in the
            hero's search box and in /cars' own filter panel. */}

        {cars.length ? (
          <>
            <div className="mt-8 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {cars.map((car, i) => (
                <div key={car.id} className="h-full min-w-0">
                  <CarCard car={car} priority={i < 3} />
                </div>
              ))}
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
