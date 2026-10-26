import type { Metadata } from 'next'
import { Button, Container, EmptyState, Section } from '@/components/ui'
import { PageIntro } from '@/components/marketplace/PageIntro'
import { ShowroomCard } from '@/components/marketplace/ShowroomCard'
import { JsonLd } from '@/components/JsonLd'
import { showrooms as showroomsApi } from '@/lib/api'
import { getLogoLookup } from '@/lib/brands'
import { getServerT } from '@/lib/i18n/server'
import { breadcrumbNode, graph, itemListNode } from '@/lib/seo'
import { SITE } from '@/lib/site'
import type { Showroom } from '@/lib/types'
import { openStatusLabels } from '@/lib/showroom-hours'

// Every verified showroom with public stock. The headline renders outside the
// data call so the page has an h1 even when the API does not answer, and an
// unreachable API is told apart from "no showrooms yet".

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('showrooms.metaTitle'),
    description: t('showrooms.metaDescription'),
    alternates: { canonical: '/showrooms' },
    openGraph: {
      title: t('showrooms.metaTitle'),
      url: '/showrooms',
      images: ['/opengraph-image'],
    },
  }
}

export default async function ShowroomsPage() {
  let reachable = true
  const [list, logoFor, t] = await Promise.all([
    showroomsApi.list().catch((): Showroom[] => {
      reachable = false
      return []
    }),
    getLogoLookup(),
    getServerT(),
  ])

  const ld = graph(
    breadcrumbNode([
      { name: SITE.name, path: '/' },
      { name: t('showrooms.title'), path: '/showrooms' },
    ]),
    itemListNode(
      list.map((room) => ({ path: `/sellers/${room.id}`, name: room.name })),
      t('showrooms.title'),
    ),
  )

  return (
    <>
      <PageIntro title={t('showrooms.title')} description={t('showrooms.intro')} />
      <Section tone="page">
        <Container>
          {list.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {list.map((room) => (
                <li key={room.id} className="min-w-0">
                  <ShowroomCard
                    room={room}
                    logoFor={logoFor}
                    verifiedLabel={t('home.showrooms.verified')}
                    carsLabel={t('home.showrooms.cars', { count: room.live_count })}
                    statusLabels={openStatusLabels(t)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              headingLevel={2}
              icon="shield-check"
              title={reachable ? t('showrooms.emptyTitle') : t('showrooms.unreachableTitle')}
              description={reachable ? t('showrooms.emptyDesc') : t('showrooms.unreachableDesc')}
              action={<Button href="/cars" variant="outline">{t('showrooms.browseCars')}</Button>}
              className="rounded-2xl border border-line-soft bg-surface"
            />
          )}
        </Container>
      </Section>
      <JsonLd data={ld} />
    </>
  )
}
