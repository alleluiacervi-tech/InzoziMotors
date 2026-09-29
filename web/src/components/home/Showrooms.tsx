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

        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((room) => (
            <li key={room.id}>
              <Link
                href={`/sellers/${room.id}`}
                className="group block overflow-hidden rounded-3xl border border-line-soft bg-surface shadow-card transition-shadow hover:shadow-card-lg"
              >
                <div className="relative h-40 bg-surface-alt">
                  {room.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- decorative: the showroom's newest car
                    <img src={room.cover_image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  ) : null}
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute inset-x-4 bottom-4 flex items-center gap-3">
                    {room.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- the showroom's own photo
                      <img src={room.avatar_url} alt="" className="h-12 w-12 shrink-0 rounded-full bg-white object-cover ring-2 ring-white" />
                    ) : (
                      <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/90 text-title-sm font-extrabold text-[#1A1413]">
                        {room.name.trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-title-sm font-extrabold text-white">{room.name}</span>
                      <span className="mt-0.5 flex items-center gap-1 truncate text-micro font-bold text-white/85">
                        <Icon name="shield-check" size={13} />
                        {t('home.showrooms.verified')}
                        {room.location ? ` · ${room.location}` : ''}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {room.brands.slice(0, 6).map((b) => (
                      <BrandMark key={b.make} name={b.make} logoUrl={logoFor(b.make)} size={28} />
                    ))}
                    {room.brands.length > 6 ? (
                      <span className="text-micro font-bold text-content-muted">+{room.brands.length - 6}</span>
                    ) : null}
                  </span>
                  <span className="tnum shrink-0 text-caption font-bold text-content-secondary">
                    {t('home.showrooms.cars', { count: room.live_count })}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  )
}

export default Showrooms
