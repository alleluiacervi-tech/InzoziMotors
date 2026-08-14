import Image from 'next/image'
import Link from 'next/link'
import { Badge, Icon } from '@/components/ui'
import { CardPhotoFlick } from './CardPhotoFlick'
import {
  formatKm, formatMoneyExact, formatRWF, formatUSD, getCertTier, isDemoListing, isHighDemand,
  isNewListing, listedAgo, marketPosition, monthlyEstimate, priceDrop,
} from '@/lib/business'
import type { Car } from '@/lib/types'

// The listing card, ported in spirit from src/components/CarCard.js and
// CarListCard.js. Everything it claims is server-verified: the certification
// tier comes from the inspection score, the market position only renders when
// the backend found 3+ real comparables, and "high demand" is a true save count.

const FALLBACK_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#F6F4F4"/></svg>`
  )

export function CarCard({
  car, priority = false, layout = 'grid',
}: {
  car: Car
  /** Set on the first row so the LCP image is not lazy-loaded. */
  priority?: boolean
  layout?: 'grid' | 'row'
}) {
  const tier = getCertTier(car)
  const demo = isDemoListing(car)
  // The alt text is a claim. For a seeded listing, "photographed at a Sawa
  // inspection center" would be false in markup.
  const photoAlt = demo
    ? `${car.title} — preview listing with manufacturer imagery`
    : `${car.title} — photographed at a Sawa inspection center`
  const market = marketPosition(car)
  const drop = priceDrop(car)
  const image = car.images?.[0] || FALLBACK_IMAGE
  const isRow = layout === 'row'

  return (
    <Link
      href={`/cars/${car.id}`}
      className={`group block overflow-hidden rounded-3xl border border-line-soft bg-surface shadow-card
                  transition-all duration-500 ease-brand
                  hover:-translate-y-1.5 hover:border-line hover:shadow-float
                  ${isRow ? 'sm:flex' : ''}`}
    >
      <div
        className={`relative overflow-hidden bg-surface-alt ${
          isRow ? 'aspect-[16/10] sm:aspect-auto sm:w-72 sm:shrink-0' : 'aspect-[16/10]'
        }`}
      >
        {/* Multi-photo listings preview their angles on hover/tap — the
            36-angle standard, felt on the card itself. */}
        {/* Full-bleed crops for real inventory — our photographers shoot the
            36 angles for exactly this frame. Seeded press renders keep
            object-contain: their 2.7:1 side profiles crop into a door. */}
        {(car.images?.length ?? 0) >= 2 ? (
          <CardPhotoFlick
            images={car.images!}
            alt={photoAlt}
            sizes={isRow ? '(max-width: 640px) 100vw, 288px' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
            priority={priority}
            fit={demo ? 'contain' : 'cover'}
          />
        ) : (
          <Image
            src={image}
            alt={photoAlt}
            fill
            sizes={isRow ? '(max-width: 640px) 100vw, 288px' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
            className={`${
              demo ? 'object-contain p-2' : 'object-cover'
            } transition-transform duration-500 ease-brand group-hover:scale-[1.03]`}
            priority={priority}
          />
        )}

        {/* Trust badges sit top-left; urgency signals top-right, so the two
            never compete for the same corner. */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {demo ? (
            <Badge tone="neutral">Preview listing</Badge>
          ) : tier ? (
            <Badge tone={tier.key === 'plus' ? 'certPlus' : tier.key === 'certified' ? 'cert' : 'inspected'} icon="shield-check">
              {tier.short}
            </Badge>
          ) : null}
        </div>
        <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-1.5">
          {drop > 0 ? <Badge tone="warning" icon="trending-down">Price drop</Badge> : null}
          {!demo && isNewListing(car) && drop === 0 ? <Badge tone="info">New</Badge> : null}
          {isHighDemand(car) ? <Badge tone="danger">High demand</Badge> : null}
        </div>

        {/* The 36-angle standard is the signature — advertise it on every card.
            Only a real count renders; one fallback image is not a photo set. */}
        {(car.images?.length ?? 0) >= 2 ? (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-pill bg-ink-900/70 px-2 py-1 text-micro font-bold text-white backdrop-blur-sm">
            <Icon name="camera" size={11} />
            {car.images!.length} photos
          </span>
        ) : null}

        {car.status === 'reserved' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-900/55 backdrop-blur-[2px]">
            <span className="rounded-pill bg-white/95 px-4 py-2 text-micro font-extrabold text-content">
              Reserved
            </span>
          </div>
        ) : null}
      </div>

      <div className={`p-5 ${isRow ? 'flex flex-1 flex-col' : ''}`}>
        <h3 className="truncate text-title-sm font-extrabold tracking-[-0.015em] text-content transition-colors group-hover:text-brand">
          {car.title}
        </h3>

        {/* Spec strip — fixed order on every card: year · km · fuel ·
            transmission · location. Sameness is the point. */}
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-content-secondary">
          <span>{car.year}</span>
          <span aria-hidden className="text-line">·</span>
          <span>{formatKm(car.mileage)}</span>
          {car.fuel_type ? (
            <>
              <span aria-hidden className="text-line">·</span>
              <span>{car.fuel_type}</span>
            </>
          ) : null}
          {car.transmission ? (
            <>
              <span aria-hidden className="text-line">·</span>
              <span>{car.transmission}</span>
            </>
          ) : null}
          {car.location ? (
            <>
              <span aria-hidden className="text-line">·</span>
              <span className="inline-flex items-center gap-1">
                <Icon name="location" size={12} />
                {car.location}
              </span>
            </>
          ) : null}
        </p>

        {isRow && car.description ? (
          <p className="mt-3 line-clamp-2 text-body leading-relaxed text-content-secondary">
            {car.description}
          </p>
        ) : null}

        <div className={isRow ? 'mt-auto pt-5' : 'mt-5'}>
          {/* Price is one of the few places brand red is allowed. */}
          {/* tabular-nums so prices line up digit-for-digit down a grid of
              cards — Satoshi defaults to proportional figures. */}
          <p
            className="text-price font-extrabold tracking-[-0.02em] text-brand tabular-nums"
            title={formatMoneyExact(car.price)}
          >
            {formatUSD(car.price)}
          </p>
          <p className="mt-0.5 text-micro text-content-muted tabular-nums">
            ~{formatUSD(monthlyEstimate(car.price))}/mo est.
          </p>

          {/* The market line shows its work — amount and sample size, never a
              bare percentage. Its own line; it never crowds the price. */}
          {market && car.market_avg ? (
            <p
              className={`mt-2 text-micro font-semibold ${
                market.tone === 'good'
                  ? 'text-success'
                  : market.tone === 'high'
                  ? 'text-warning-text'
                  : 'text-content-muted'
              }`}
            >
              {market.tone === 'neutral'
                ? `At market price · ${car.comparables} similar cars`
                : `${formatRWF(Math.abs(car.market_avg - car.price))} ${
                    market.tone === 'good' ? 'below' : 'above'
                  } the average of ${car.comparables} similar cars`}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-3">
          <p className="text-micro text-content-muted">
            {listedAgo(car) || 'Available now'}{car.saves_count ? ` · ${car.saves_count} saved` : ''}
          </p>
          <span className="inline-flex items-center gap-1 text-micro font-bold text-content-secondary transition-colors group-hover:text-brand">
            View car <Icon name="arrow-right" size={13} />
          </span>
        </div>
      </div>
    </Link>
  )
}

export function CarCardSkeleton({ layout = 'grid' }: { layout?: 'grid' | 'row' }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-line-soft bg-surface ${
        layout === 'row' ? 'sm:flex' : ''
      }`}
    >
      <div className={`skeleton ${layout === 'row' ? 'aspect-[4/3] sm:w-72' : 'aspect-[4/3]'}`} />
      <div className="flex-1 space-y-3 p-5">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton h-6 w-28 rounded" />
      </div>
    </div>
  )
}

export default CarCard
