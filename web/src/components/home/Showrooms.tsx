import Link from 'next/link'
import { Container, Icon, Section } from '@/components/ui'
import { ShowroomCard } from '@/components/marketplace/ShowroomCard'
import { showrooms as showroomsApi } from '@/lib/api'
import { getLogoLookup } from '@/lib/brands'
import { getServerT } from '@/lib/i18n/server'
import type { Showroom } from '@/lib/types'

// Verified showrooms with cars in stock — the app's Home rail on the website.
// A showroom is a business, not a brand: the marks on each card are the brands
// it has live right now (GET /showrooms reads them off its cars), so a
// multi-brand dealership shows all of them. With no verified showroom holding
// public stock, the section is simply not there. The homepage shows the first
// eight; /showrooms lists them all.

const HOME_LIMIT = 8

export async function Showrooms() {
  const [list, logoFor, t] = await Promise.all([
    showroomsApi.list().catch((): Showroom[] => []),
    getLogoLookup(),
    getServerT(),
  ])
  if (!list.length) return null
  const shown = list.slice(0, HOME_LIMIT)

  return (
    <Section tone="page">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="min-w-0 max-w-2xl">
            <h2 className="text-headline font-extrabold text-content">{t('home.showrooms.title')}</h2>
            <p className="mt-2 text-body text-content-secondary">{t('home.showrooms.description')}</p>
          </div>
          <Link
            href="/showrooms"
            className="inline-flex min-h-[44px] items-center gap-1 text-caption font-bold text-content hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            {t('home.showrooms.viewAll')}
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>

        <ul className="-mx-4 mt-6 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((room) => (
            <li key={room.id} className="w-[260px] shrink-0 snap-start sm:w-auto">
              <ShowroomCard
                room={room}
                logoFor={logoFor}
                verifiedLabel={t('home.showrooms.verified')}
                carsLabel={t('home.showrooms.cars', { count: room.live_count })}
              />
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  )
}

export default Showrooms
