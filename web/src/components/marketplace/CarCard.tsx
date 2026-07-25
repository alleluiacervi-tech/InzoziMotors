import Image from 'next/image'
import Link from 'next/link'
import { Badge, Icon } from '@/components/ui'
import {
  formatKm, formatRWF, formatUSD, getCertTier, isHighDemand, isNewListing,
  listedAgo, marketPosition, monthlyEstimate, priceDrop,
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
  const market = marketPosition(car)
  const drop = priceDrop(car)
  const image = car.images?.[0] || FALLBACK_IMAGE
  const isRow = layout === 'row'

  return (
    <Link
      href={`/cars/${car.id}`}
      className={`group block overflow-hidden rounded-2xl border border-line-soft bg-surface shadow-card
                  transition-all duration-300 ease-brand
                  hover:-translate-y-1 hover:border-line hover:shadow-card-lg
                  ${isRow ? 'sm:flex' : ''}`}
    >
      <div
        className={`relative overflow-hidden bg-surface-alt ${
          isRow ? 'aspect-[4/3] sm:aspect-auto sm:w-72 sm:shrink-0' : 'aspect-[4/3]'
        }`}
      >
        <Image
          src={image}
          alt={`${car.title} — photographed at an Inzozi Motors inspection center`}
          fill
          sizes={isRow ? '(max-width: 640px) 100vw, 288px' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
          className="object-cover transition-transform duration-500 ease-brand group-hover:scale-[1.04]"
          priority={priority}
        />

        {/* Trust badges sit top-left; urgency signals top-right, so the two
            never compete for the same corner. */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {tier ? (
            <Badge tone={tier.key === 'plus' ? 'certPlus' : tier.key === 'certified' ? 'cert' : 'inspected'} icon="shield-check">
              {tier.short}
            </Badge>
          ) : null}
        </div>
        <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-1.5">
          {drop > 0 ? <Badge tone="warning" icon="trending-down">Price drop</Badge> : null}
          {isNewListing(car) && drop === 0 ? <Badge tone="info">New</Badge> : null}
          {isHighDemand(car) ? <Badge tone="danger">High demand</Badge> : null}
        </div>

        {car.status === 'reserved' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-900/55 backdrop-blur-[2px]">
            <span className="rounded-pill bg-white/95 px-4 py-2 text-xs font-extrabold text-content">
              Reserved
            </span>
          </div>
        ) : null}
      </div>

      <div className={`p-4 sm:p-5 ${isRow ? 'flex flex-1 flex-col' : ''}`}>
        <h3 className="truncate text-[15px] font-extrabold tracking-[-0.01em] text-content">
          {car.title}
        </h3>

        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-content-secondary">
          <span>{car.year}</span>
          <span aria-hidden className="text-line">·</span>
          <span>{formatKm(car.mileage)}</span>
          {car.fuel_type ? (
            <>
              <span aria-hidden className="text-line">·</span>
              <span>{car.fuel_type}</span>
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
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-content-secondary">
            {car.description}
          </p>
        ) : null}

        <div className={`flex items-end justify-between gap-3 ${isRow ? 'mt-auto pt-4' : 'mt-4'}`}>
          <div className="min-w-0">
            {/* Price is one of the few places brand red is allowed. */}
            <p className="text-[21px] font-extrabold tracking-[-0.02em] text-brand">
              {formatUSD(car.price)}
            </p>
            <p className="mt-0.5 text-[11px] text-content-muted">
              {formatRWF(car.price)} · ~{formatUSD(monthlyEstimate(car.price))}/mo
            </p>
          </div>

          {market ? (
            <span
              className={`inline-flex items-center gap-1 rounded-pill px-2 py-1 text-[11px] font-bold ${
                market.tone === 'good'
                  ? 'bg-success-tint text-success'
                  : market.tone === 'high'
                  ? 'bg-warning-tint text-warning-text'
                  : 'bg-surface-alt text-content-muted'
              }`}
            >
              <Icon name={market.tone === 'good' ? 'trending-down' : 'trending-up'} size={11} />
              {market.label}
            </span>
          ) : null}
        </div>

        {listedAgo(car) ? (
          <p className="mt-3 border-t border-line-soft pt-3 text-[11px] text-content-muted">
            {listedAgo(car)}
            {car.saves_count ? ` · ${car.saves_count} saved` : ''}
          </p>
        ) : null}
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
