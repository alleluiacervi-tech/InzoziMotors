import type { Metadata } from 'next'
import { Button, Card, Container, EmptyState, Section } from '@/components/ui'
import { PlacementGrid } from '@/components/home/TopDeals'
import { cars } from '@/lib/api'
import { getServerT } from '@/lib/i18n/server'
import type { FeaturedPlacement } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// Every current placement — "See all" from the homepage's Top deals, and the
// website's half of the app's FeaturedScreen. Same endpoint, same order (paid
// slots take turns by the day on the server), same labels.
//
// noindex: the set changes every few days and each car already has its own
// indexable page.
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('home.topDeals.allTitle'),
    alternates: { canonical: '/featured' },
    robots: { index: false, follow: true },
  }
}

async function getPlacements(): Promise<FeaturedPlacement[]> {
  try {
    return await cars.featured(12)
  } catch (err) {
    console.error('placements unavailable:', (err as Error).message)
    return []
  }
}

export default async function FeaturedPage() {
  const [placements, t] = await Promise.all([getPlacements(), getServerT()])

  return (
    <Section tone="page">
      <Container>
        <div className="max-w-2xl">
          <h1 className="text-headline font-extrabold text-content">{t('home.topDeals.allTitle')}</h1>
          <p className="mt-2 text-body text-content-secondary">{t('home.topDeals.allDescription')}</p>
        </div>

        {placements.length ? (
          <PlacementGrid placements={placements} />
        ) : (
          <Card className="mt-10">
            <EmptyState
              icon="car"
              title={t('home.topDeals.allEmptyTitle')}
              description={t('home.topDeals.allEmptyDescription')}
              action={<Button href="/cars" variant="outline">{t('home.topDeals.allBrowse')}</Button>}
            />
          </Card>
        )}
      </Container>
    </Section>
  )
}
