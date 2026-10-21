import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/JsonLd'
import Link from 'next/link'
import { CarCard } from '@/components/marketplace/CarCard'
import { BrandMark } from '@/components/marketplace/BrandMark'
import { ShowroomHours } from '@/components/market/ShowroomHours'
import { getLogoLookup } from '@/lib/brands'
import { Badge, Card, Container, Icon } from '@/components/ui'
import { ApiError, sellers } from '@/lib/api'
import { formatDate } from '@/lib/business'
import { absoluteUrl, breadcrumbNode, graph } from '@/lib/seo'
import { getServerT } from '@/lib/i18n/server'
import { WEEK } from '@/lib/showroom-hours'
import type { BusinessDay, SellerProfile } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// Public seller and showroom profile (G9 in docs/WEB-PARITY-PLAN.md).
//
// Everything here comes from endpoints that already decide what's public:
// GET /sellers/:id answers only for a seller whose listings are public (404
// otherwise, so this page 404s too), and the listings are the catalogue query
// narrowed to one seller. Nothing on this page can show a phone number — the
// profile endpoint never returns one. Contact stays behind a listing's own
// "Contact seller" and its direct-deal acknowledgement.
//
// Only true facts are shown: how many cars, which brands, their inspection
// scores, how quickly the seller replies (measured, and only once there is
// enough to measure), and for a showroom the details the team wrote. The old
// sales count, rating, reviews and trust score came from the retired deal flow
// and could never move, so every seller looked like "0 sales, 50/100".
//
// Structured data carries no aggregateRating: web/src/lib/seo.ts forbids it
// until reviews are a real, ongoing signal.
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ brand?: string | string[] }>
}

const SCHEMA_DAY: Record<BusinessDay, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}

const REPLY_KEY = {
  within_hour: 'market.profile.replyWithinHour',
  within_hours: 'market.profile.replyWithinHours',
  within_day: 'market.profile.replyWithinDay',
} as const

async function loadProfile(id: string): Promise<SellerProfile | null> {
  try {
    return await sellers.profile(id)
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) return null
    throw err
  }
}

const displayName = (p: SellerProfile) => (p.is_showroom && p.business_name ? p.business_name : p.name)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const t = await getServerT()
  const profile = await loadProfile(id).catch(() => null)
  if (!profile) return { title: t('market.profile.notFound'), robots: { index: false } }
  const name = displayName(profile)
  return {
    title: t('market.profile.metaTitle', { name }),
    description: profile.is_showroom && profile.about
      ? profile.about.replace(/\s+/g, ' ').slice(0, 155)
      : t('market.profile.metaDescription', { name }),
    alternates: { canonical: `/sellers/${profile.id}` },
  }
}

export default async function SellerProfilePage({ params, searchParams }: Props) {
  const { id } = await params
  const rawBrand = (await searchParams)?.brand
  const brandParam = (Array.isArray(rawBrand) ? rawBrand[0] : rawBrand)?.trim() || null
  const t = await getServerT()
  const profile = await loadProfile(id)
  if (!profile) notFound()

  const [listings, logoFor] = await Promise.all([
    sellers.listings(id).catch(() => []),
    getLogoLookup(),
  ])

  // A showroom sells many brands. They are read off its live cars — never
  // chosen — with a count each, and double as the filter (?brand=, a real
  // address). Mirrors the app's storefront (src/screens/ShowroomScreen.js).
  const brandCounts = new Map<string, { make: string; count: number }>()
  for (const car of listings) {
    const key = String(car.make || '').trim().toLowerCase()
    if (!key) continue
    const entry = brandCounts.get(key) ?? { make: car.make.trim(), count: 0 }
    entry.count += 1
    brandCounts.set(key, entry)
  }
  const brands = [...brandCounts.values()].sort((a, b) => b.count - a.count || a.make.localeCompare(b.make))
  const activeBrand = brandParam ? brands.find((b) => b.make.toLowerCase() === brandParam.toLowerCase()) ?? null : null
  const shown = activeBrand
    ? listings.filter((car) => String(car.make || '').trim().toLowerCase() === activeBrand.make.toLowerCase())
    : listings
  const newestPhoto = listings.find((car) => car.images?.length)?.images?.[0] ?? null
  const cover = profile.is_showroom ? (profile.cover_url || newestPhoto) : null

  const scores = listings
    .map((car) => Number(car.inspection_score))
    .filter((score) => Number.isFinite(score) && score > 0)
  const averageScore = scores.length ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : null

  const name = displayName(profile)
  const hours = profile.is_showroom ? profile.hours : null
  const mapsUrl = profile.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${profile.address}, Rwanda`)}`
    : null

  const structured = graph(
    breadcrumbNode([
      { name: 'Sawa Cars', path: '/' },
      { name: t('market.profile.carsCrumb'), path: '/cars' },
      { name, path: `/sellers/${profile.id}` },
    ]),
    {
      '@type': profile.is_showroom ? 'AutoDealer' : 'Person',
      name,
      url: absoluteUrl(`/sellers/${profile.id}`),
      ...(profile.is_showroom && profile.about ? { description: profile.about } : {}),
      ...(profile.is_showroom && (profile.cover_url || profile.avatar_url)
        ? { image: profile.cover_url || profile.avatar_url } : {}),
      ...(profile.is_showroom && profile.address
        ? { address: { '@type': 'PostalAddress', streetAddress: profile.address, addressCountry: 'RW' } } : {}),
      ...(hours
        ? {
            openingHoursSpecification: WEEK.filter((day) => hours[day]).map((day) => ({
              '@type': 'OpeningHoursSpecification',
              dayOfWeek: `https://schema.org/${SCHEMA_DAY[day]}`,
              opens: hours[day]!.open,
              closes: hours[day]!.close,
            })),
          }
        : {}),
    }
  )

  // Facts only. A figure appears when there is something true to say.
  const facts: { label: string; value: string }[] = [
    { label: t('market.profile.statCars'), value: String(listings.length) },
    ...(profile.is_showroom && brands.length ? [{ label: t('market.profile.statBrands'), value: String(brands.length) }] : []),
    ...(averageScore ? [{ label: t('market.profile.statInspection'), value: `${averageScore}/150` }] : []),
    ...(profile.reply_time ? [{ label: t('market.profile.statReplies'), value: t(REPLY_KEY[profile.reply_time]) }] : []),
  ]

  const hasAbout = profile.is_showroom && Boolean(profile.about)
  const hasVisit = profile.is_showroom && Boolean(profile.address || hours)

  return (
    <Container className="py-8 sm:py-12">
      <JsonLd data={structured} />

      {cover ? (
        <div className="relative -mt-2 mb-6 h-40 overflow-hidden rounded-3xl bg-surface-alt sm:h-64">
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative: the showroom itself, or its newest car */}
          <img src={cover} alt="" className="h-full w-full object-cover" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
        </div>
      ) : null}

      <header className={`relative z-10 flex flex-col gap-5 sm:flex-row sm:items-start ${cover ? '-mt-14 px-4 sm:px-6' : ''}`}>
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- the photo the team set for this account
          <img
            src={profile.avatar_url}
            alt=""
            className="h-20 w-20 shrink-0 rounded-full bg-surface object-cover ring-4 ring-surface sm:h-24 sm:w-24"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-surface-alt text-title font-extrabold text-content-secondary ring-4 ring-surface sm:h-24 sm:w-24"
          >
            {name.trim().charAt(0).toUpperCase() || '?'}
          </span>
        )}
        <div className={`min-w-0 ${cover ? 'sm:pt-16' : ''}`}>
          <h1 className="text-title font-extrabold text-content">{name}</h1>
          <p className="mt-1 text-caption text-content-muted">
            {profile.is_showroom ? t('market.profile.showroom') : t('market.profile.individual')}
            {' · '}
            {t('market.profile.memberSince', { date: formatDate(profile.member_since) })}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="success" icon="shield-check">{t('market.profile.verifiedIdentity')}</Badge>
            {profile.is_showroom && profile.business_verified ? (
              <Badge tone="success" icon="check-circle">{t('market.profile.verifiedBusiness')}</Badge>
            ) : null}
          </div>
        </div>
      </header>

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {facts.map((fact) => (
          <Card key={fact.label} className="p-4">
            <dt className="text-micro font-bold text-content-muted">{fact.label}</dt>
            <dd className="mt-1 text-title-sm font-extrabold text-content">{fact.value}</dd>
          </Card>
        ))}
      </dl>

      {hasAbout || hasVisit ? (
        <div className={`mt-10 grid gap-5 ${hasAbout && hasVisit ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]' : ''}`}>
          {hasAbout ? (
            <section aria-labelledby="about">
              <h2 id="about" className="text-title-sm font-extrabold text-content">{t('market.profile.aboutTitle', { name })}</h2>
              <p className="mt-3 max-w-prose whitespace-pre-line text-body leading-relaxed text-content-secondary">{profile.about}</p>
            </section>
          ) : null}
          {hasVisit ? (
            <section aria-labelledby="visit">
              <Card className="p-5">
                <h2 id="visit" className="text-label font-extrabold text-content">{t('market.profile.visitTitle')}</h2>
                {profile.address ? (
                  <p className="mt-3 flex items-start gap-2 text-caption text-content-secondary">
                    <span className="mt-0.5 text-content-muted"><Icon name="location" size={15} /></span>
                    <span className="min-w-0">
                      {profile.address}
                      {mapsUrl ? (
                        <>
                          {' · '}
                          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                            className="font-bold text-content underline decoration-line underline-offset-4 hover:decoration-content">
                            {t('market.profile.openInMaps')}
                          </a>
                        </>
                      ) : null}
                    </span>
                  </p>
                ) : null}
                {hours ? (
                  <div className="mt-4">
                    <h3 className="sr-only">{t('market.profile.hoursTitle')}</h3>
                    <ShowroomHours hours={hours} />
                  </div>
                ) : null}
              </Card>
            </section>
          ) : null}
        </div>
      ) : null}

      {profile.is_showroom && brands.length ? (
        <section aria-labelledby="brands" className="mt-10">
          <h2 id="brands" className="text-title-sm font-extrabold text-content">{t('market.profile.brandsTitle')}</h2>
          <p className="mt-1 text-caption text-content-secondary">
            {t('market.profile.stockSummary', { count: listings.length, brands: brands.length })}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            <li>
              <Link
                href={`/sellers/${profile.id}#listings`}
                scroll={false}
                aria-current={!activeBrand ? 'true' : undefined}
                className={`inline-flex h-10 items-center gap-2 rounded-pill border px-4 text-caption font-bold transition-colors ${
                  !activeBrand ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-surface text-content hover:bg-surface-alt'
                }`}
              >
                <Icon name="grid" size={15} />
                {t('market.profile.allBrands')}
                <span className="tnum text-content-muted">{listings.length}</span>
              </Link>
            </li>
            {brands.map((b) => {
              const on = activeBrand?.make === b.make
              return (
                <li key={b.make}>
                  <Link
                    href={`/sellers/${profile.id}?brand=${encodeURIComponent(b.make)}#listings`}
                    scroll={false}
                    aria-current={on ? 'true' : undefined}
                    className={`inline-flex h-10 items-center gap-2 rounded-pill border pl-1.5 pr-4 text-caption font-bold transition-colors ${
                      on ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-surface text-content hover:bg-surface-alt'
                    }`}
                  >
                    <BrandMark name={b.make} logoUrl={logoFor(b.make)} size={28} />
                    {b.make}
                    <span className="tnum text-content-muted">{b.count}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="listings-heading" id="listings" className="mt-10 scroll-mt-24">
        <h2 id="listings-heading" className="text-title-sm font-extrabold text-content">
          {activeBrand ? t('market.profile.brandListings', { make: activeBrand.make }) : t('market.profile.listingsTitle')}
        </h2>
        {shown.length ? (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((car) => <CarCard key={car.id} car={car} />)}
          </div>
        ) : (
          <p className="mt-3 text-caption text-content-secondary">{t('market.profile.listingsEmpty')}</p>
        )}
        <p className="mt-4 max-w-prose text-micro leading-relaxed text-content-muted">{t('market.profile.contactNote')}</p>
      </section>
    </Container>
  )
}
