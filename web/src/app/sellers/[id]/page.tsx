import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/JsonLd'
import { CarCard } from '@/components/marketplace/CarCard'
import { ReportReviewButton } from '@/components/market/ReportReviewButton'
import { Badge, Card, Container } from '@/components/ui'
import { ApiError, sellers } from '@/lib/api'
import { formatDate } from '@/lib/business'
import { absoluteUrl, breadcrumbNode, graph } from '@/lib/seo'
import { getServerT } from '@/lib/i18n/server'
import type { SellerProfile } from '@/lib/types'

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
// Structured data carries no aggregateRating: web/src/lib/seo.ts forbids it
// until reviews are a real, ongoing signal.
// ─────────────────────────────────────────────────────────────────────────────

type Props = { params: Promise<{ id: string }> }

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
    description: t('market.profile.metaDescription', { name }),
    alternates: { canonical: `/sellers/${profile.id}` },
  }
}

export default async function SellerProfilePage({ params }: Props) {
  const { id } = await params
  const t = await getServerT()
  const profile = await loadProfile(id)
  if (!profile) notFound()

  const [trust, reviewData, listings] = await Promise.all([
    sellers.trustScore(id).catch(() => null),
    sellers.reviews(id).catch(() => null),
    sellers.listings(id).catch(() => []),
  ])

  const name = displayName(profile)
  const reviewCount = reviewData?.total ?? 0
  const average = reviewData?.average_rating ?? null

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
    }
  )

  const trustRows = trust
    ? [
        {
          label: t('market.trust.id'),
          detail: trust.breakdown.id_verified.points > 0 ? t('market.trust.idYes') : t('market.trust.idNo'),
          ...trust.breakdown.id_verified,
        },
        {
          label: t('market.trust.sales'),
          detail: t('market.trust.salesDetail', { count: trust.breakdown.completed_sales.count }),
          ...trust.breakdown.completed_sales,
        },
        {
          label: t('market.trust.response'),
          detail: t('market.trust.responseDetail', { rate: trust.breakdown.response_rate.rate }),
          ...trust.breakdown.response_rate,
        },
        {
          label: t('market.trust.reviews'),
          detail: Number(trust.breakdown.reviews.count) > 0
            ? t('market.trust.reviewsDetail', { avg: trust.breakdown.reviews.avg ?? '—', count: trust.breakdown.reviews.count })
            : t('market.trust.reviewsNone'),
          ...trust.breakdown.reviews,
        },
      ]
    : []

  return (
    <Container className="py-8 sm:py-12">
      <JsonLd data={structured} />

      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <span
          aria-hidden="true"
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-surface-alt text-title font-extrabold text-content-secondary ring-1 ring-inset ring-line"
        >
          {name.trim().charAt(0).toUpperCase() || '?'}
        </span>
        <div className="min-w-0">
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
        {[
          { label: t('market.profile.statSales'), value: String(profile.completed_sales) },
          { label: t('market.profile.statResponse'), value: `${profile.response_rate}%` },
          { label: t('market.profile.statRating'), value: average ? `${average}★` : '—' },
          { label: t('market.profile.statReviews'), value: String(reviewCount) },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <dt className="text-micro font-bold text-content-muted">{stat.label}</dt>
            <dd className="mt-1 text-title-sm font-extrabold text-content">{stat.value}</dd>
          </Card>
        ))}
      </dl>

      {trust ? (
        <section aria-labelledby="trust" className="mt-10">
          <h2 id="trust" className="text-title-sm font-extrabold text-content">{t('market.trust.title')}</h2>
          <p className="mt-1 text-caption text-content-secondary">
            {t('market.trust.subtitle', { total: trust.total_score })}
          </p>
          <Card className="mt-4 divide-y divide-line-soft">
            {trustRows.map((row) => (
              <div key={row.label} className="p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-caption font-bold text-content">{row.label}</p>
                  <p className="tnum text-caption font-extrabold text-content">{row.points}/{row.max}</p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-alt">
                  <div
                    className="h-full rounded-full bg-success"
                    style={{ width: `${Math.min(100, Math.round((row.points / row.max) * 100))}%` }}
                  />
                </div>
                <p className="mt-2 text-micro text-content-muted">{row.detail}</p>
              </div>
            ))}
          </Card>
        </section>
      ) : null}

      <section aria-labelledby="listings" className="mt-10">
        <h2 id="listings" className="text-title-sm font-extrabold text-content">{t('market.profile.listingsTitle')}</h2>
        {listings.length ? (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((car) => <CarCard key={car.id} car={car} />)}
          </div>
        ) : (
          <p className="mt-3 text-caption text-content-secondary">{t('market.profile.listingsEmpty')}</p>
        )}
        <p className="mt-4 max-w-prose text-micro leading-relaxed text-content-muted">{t('market.profile.contactNote')}</p>
      </section>

      <section aria-labelledby="reviews" className="mt-10">
        <h2 id="reviews" className="text-title-sm font-extrabold text-content">
          {t('market.profile.reviewsTitle', { count: reviewCount })}
        </h2>
        {reviewData && reviewData.reviews.length ? (
          <ul className="mt-4 space-y-3">
            {reviewData.reviews.map((review) => {
              const author = review.reviewer_name || t('market.profile.anonymousBuyer')
              return (
                <li key={review.id}>
                  <Card className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-caption font-bold text-content">{author}</p>
                        <p className="text-micro text-content-muted">
                          <span aria-label={t('market.profile.starsLabel', { count: review.rating })}>
                            {'★'.repeat(review.rating)}{'☆'.repeat(Math.max(0, 5 - review.rating))}
                          </span>
                          {' · '}
                          {formatDate(review.created_at)}
                        </p>
                      </div>
                      <ReportReviewButton reviewId={review.id} author={author} />
                    </div>
                    <p className="mt-2 text-caption leading-relaxed text-content-secondary">
                      {review.comment || (review.car_title ? t('market.profile.reviewAbout', { car: review.car_title }) : '')}
                    </p>
                  </Card>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-3 text-caption text-content-secondary">{t('market.profile.reviewsEmpty')}</p>
        )}
      </section>
    </Container>
  )
}
