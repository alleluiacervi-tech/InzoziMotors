import Link from 'next/link'
import { Container, Icon, Section } from '@/components/ui'
import { BrandMark } from '@/components/marketplace/BrandMark'
import { showrooms as showroomsApi } from '@/lib/api'
import { getLogoLookup } from '@/lib/brands'
import { getServerT } from '@/lib/i18n/server'
import type { Showroom } from '@/lib/types'

// Verified showrooms with cars in stock — the app's Home rail on the website.
// A showroom is a business, not a brand: the marks on each card are the brands
// it has live right now (GET /showrooms reads them off its cars), so a
// multi-brand dealership shows all of them. With no verified showroom holding
// public stock, the section is simply not there.

export async function Showrooms() {
  const [list, logoFor, t] = await Promise.all([
    showroomsApi.list().catch((): Showroom[] => []),
    getLogoLookup(),
    getServerT(),
  ])
  if (!list.length) return null

  return (
    <Section tone="page">
      <Container>
        <div className="min-w-0 max-w-2xl">
          <h2 className="text-headline font-extrabold text-content">{t('home.showrooms.title')}</h2>
          <p className="mt-2 text-body text-content-secondary">{t('home.showrooms.description')}</p>
        </div>

        <ul className="-mx-4 mt-6 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((room) => (
            <li key={room.id} className="w-[260px] shrink-0 snap-start sm:w-auto">
              <Link
                href={`/sellers/${room.id}`}
                className="group flex items-center gap-2.5 rounded-xl border border-line-soft bg-surface p-2 shadow-card transition-shadow hover:shadow-card-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#1A1413]">
                  {room.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- decorative: the showroom's newest car
                    <img src={room.cover_image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : null}
                  {room.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- the showroom's own photo
                    <img
                      src={room.avatar_url}
                      alt=""
                      className={room.cover_image ? 'absolute bottom-0.5 right-0.5 h-5 w-5 rounded-full bg-white object-cover ring-[1.5px] ring-white' : 'h-full w-full bg-white object-cover'}
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className={room.cover_image
                        ? 'absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#1A1413] text-[9px] font-extrabold text-white ring-[1.5px] ring-white'
                        : 'flex h-full w-full items-center justify-center text-body font-extrabold text-white'}
                    >
                      {room.name.trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-caption font-extrabold text-content">{room.name}</span>
                  <span className="flex items-center gap-1 text-micro font-semibold text-content-secondary">
                    <Icon name="shield-check" size={12} className="shrink-0 text-success-text" />
                    <span className="truncate">
                      {t('home.showrooms.verified')}
                      {room.location ? ` · ${room.location}` : ''}
                    </span>
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1">
                      {room.brands.slice(0, 3).map((b) => (
                        <BrandMark key={b.make} name={b.make} logoUrl={logoFor(b.make)} size={18} />
                      ))}
                      {room.brands.length > 3 ? (
                        <span className="text-micro font-bold text-content-muted">+{room.brands.length - 3}</span>
                      ) : null}
                    </span>
                    <span className="tnum shrink-0 text-micro font-bold text-content">
                      {t('home.showrooms.cars', { count: room.live_count })}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  )
}

export default Showrooms
