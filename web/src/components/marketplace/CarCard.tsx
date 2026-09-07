import Image from 'next/image'
import Link from 'next/link'
import { Badge, Icon } from '@/components/ui'
import { CardPhotoFlick } from './CardPhotoFlick'
import { formatKm, formatMoney, getCertTier, isDemoListing, listedAgo, marketPosition, priceDrop } from '@/lib/business'
import { Price } from '@/components/Price'
import type { Car } from '@/lib/types'
import { getServerT } from '@/lib/i18n/server'

// The listing card, ported in spirit from src/components/CarCard.js and
// CarListCard.js. Everything it claims is server-verified: the certification
// tier comes from the inspection score, the market position only renders when
// the backend found 3+ real comparables, and "high demand" is a true save count.

const FALLBACK_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#F6F4F4"/></svg>`
  )

export async function CarCard({
  car, priority = false, layout = 'grid',
}: {
  car: Car
  /** Set on the first row so the LCP image is not lazy-loaded. */
  priority?: boolean
  layout?: 'grid' | 'row'
}) {
  const t = await getServerT()
  const tier = getCertTier(car)
  const demo = isDemoListing(car)
  // The alt text is a claim. For a seeded listing, "photographed at a Sawa
  // inspection center" would be false in markup.
  const photoAlt = demo
    ? t('cars.card.altPreview', { title: car.title })
    : t('cars.card.altReal', { title: car.title })
  const market = marketPosition(car)
  const drop = priceDrop(car)
  const image = car.images?.[0] || FALLBACK_IMAGE
  const isRow = layout === 'row'

  return (
    <Link
      href={`/cars/${car.id}`}
      className={`group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-line-soft bg-surface shadow-card
                  transition-all duration-500 ease-brand
                  hover:-translate-y-1.5 hover:border-line hover:shadow-float
                  ${isRow ? 'sm:flex-row' : ''}`}
    >
      <div
        // 4/3 rather than 16/10: the photograph is what a car is bought on, and
        // the elements removed from the body below are given back to it. The
        // card still ends up shorter than it was.
        className={`relative shrink-0 overflow-hidden bg-surface-alt ${
          isRow ? 'aspect-[16/10] sm:w-72' : 'aspect-[4/3]'
        }`}
      >
        {/* Multi-photo listings preview their available gallery on hover or tap.
            Seeded press renders use object-contain because their wide side
            profiles would otherwise crop into a door. */}
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

        {/* ONE badge per corner, hard limit.
            Top-left is the score, because the score is the product: 141/150 is
            a fact a buyer can compare across two cars without first learning
            what "Certified+" means in our vocabulary. The tier word survives on
            the detail page, where there is room to explain it.
            Top-right is reserved for a price drop and nothing else — "new" and
            "high demand" could fire alongside it, and three chips stacked in
            one corner is how a listing starts to look like an advert instead of
            a record. Both still render on the detail page. */}
        <div className="absolute left-3 top-3 flex max-w-[62%]">
          {demo ? (
            <Badge tone="preview" className="max-w-full truncate">
              {t('cars.card.previewListing')}
            </Badge>
          ) : car.inspection_score ? (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-ink-900/85 px-2.5 py-1 text-micro font-bold tabular-nums text-white backdrop-blur-sm">
              <Icon name="shield-check" size={12} />
              {car.inspection_score}/150
            </span>
          ) : tier ? (
            <Badge tone={tier.key === 'plus' ? 'certPlus' : tier.key === 'certified' ? 'cert' : 'inspected'} icon="shield-check" className="max-w-full truncate">
              {tier.short}
            </Badge>
          ) : null}
        </div>
        {drop > 0 ? (
          <div className="absolute right-3 top-3">
            <Badge tone="warning" icon="trending-down">{t('cars.card.priceDrop')}</Badge>
          </div>
        ) : null}

        {/* The photo set is the signature — advertise it on every card, as a
            count rather than a sentence. Only a real count renders; one
            fallback image is not a photo set. */}
        {(car.images?.length ?? 0) >= 2 ? (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-pill bg-ink-900/70 px-2 py-1 text-micro font-bold tabular-nums text-white backdrop-blur-sm">
            <Icon name="camera" size={11} />
            {car.images!.length}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-5">
        {/* Title and price share a line. People scan a grid for price down its
            right edge, so putting the price under the spec strip made them
            travel the card twice; here one eye path answers both questions,
            and tabular figures line the prices up across adjacent cards. */}
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 truncate text-title-sm font-extrabold tracking-[-0.01em] text-content transition-colors group-hover:text-brand">
            {car.title}
          </h3>
          {/* One component, one conversion. The franc figure is the price;
              the dollar line under it is an approximation that follows the
              live rate without this card knowing anything about currency. */}
          <Price amountRwf={car.price} className="shrink-0 text-right" />
        </div>

        {/* Three specs, not five. Year, distance and town decide whether to
            open a listing; fuel and transmission decide whether to buy it, and
            that decision is made on the detail page. */}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-content-secondary">
          <span>{car.year}</span>
          <span aria-hidden className="text-line">·</span>
          <span>{formatKm(car.mileage)}</span>
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
          <p className="line-clamp-2 text-body leading-relaxed text-content-secondary">
            {car.description}
          </p>
        ) : null}

        {/* The market line shows its work — an amount and a sample size, never
            a bare percentage — and nobody else in this market prints it. It is
            the one number that earns its place on a card, so it takes the
            footer the "View car" arrow used to occupy: the whole card is the
            link, and the arrow only ever restated that. */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line-soft pt-3">
          {market && car.market_avg ? (
            <p
              className={`min-w-0 truncate text-micro font-semibold ${
                market.tone === 'good'
                  ? 'text-success-text'
                  : market.tone === 'high'
                  ? 'text-warning-text'
                  : 'text-content-muted'
              }`}
            >
              {market.tone === 'neutral'
                ? t('cars.card.atMarketPrice', { count: car.comparables ?? 0 })
                : t(market.tone === 'good' ? 'cars.card.belowAverage' : 'cars.card.aboveAverage', { amount: formatMoney(Math.abs(car.market_avg - car.price)), count: car.comparables ?? 0 })}
            </p>
          ) : (
            <span className="min-w-0" />
          )}
          <p className="shrink-0 text-micro text-content-muted">
            {listedAgo(car) || t('cars.card.availableNow')}
          </p>
        </div>
      </div>
    </Link>
  )
}

export function CarCardSkeleton({ layout = 'grid' }: { layout?: 'grid' | 'row' }) {
  return (
    <div
      className={`flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-line-soft bg-surface ${
        layout === 'row' ? 'sm:flex-row' : ''
      }`}
    >
      <div className={`skeleton shrink-0 ${layout === 'row' ? 'aspect-[16/10] sm:w-72' : 'aspect-[16/10]'}`} />
      <div className="flex min-w-0 flex-1 flex-col space-y-3 p-5">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton h-6 w-28 rounded" />
      </div>
    </div>
  )
}

export default CarCard
