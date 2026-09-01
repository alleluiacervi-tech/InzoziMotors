import Image from 'next/image'
import Link from 'next/link'
import { Badge, Icon } from '@/components/ui'
import { formatMoneyExact, formatUSD, getCertTier } from '@/lib/business'
import type { RentalCar } from '@/lib/types'
import { getServerT } from '@/lib/i18n/server'
import { formatRating } from './rental-math'

const FALLBACK_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#F6F4F4"/></svg>`
  )

/**
 * Fleet card. Same shape as CarCard so the two marketplaces feel like one
 * product, but the numbers are rental numbers: a daily rate, a refundable
 * indicative deposit, and a minimum stay. Trips and rating come from the API — a car with
 * no history shows none rather than a flattering placeholder.
 */
export async function RentalCard({ car, priority = false }: { car: RentalCar; priority?: boolean }) {
  const t = await getServerT()
  const tier = getCertTier(car)
  const image = car.images?.[0] || FALLBACK_IMAGE
  const rating = formatRating(car.rating)

  return (
    <Link
      href={`/rentals/${car.id}`}
      className="group block overflow-hidden rounded-3xl border border-line-soft bg-surface shadow-card transition-all duration-500 ease-brand hover:-translate-y-1.5 hover:border-line hover:shadow-float"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-alt">
        <Image
          src={image}
          alt={t('rentals.card.alt', { title: car.title })}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-contain p-2 transition-transform duration-500 ease-brand group-hover:scale-[1.03]"
          priority={priority}
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {tier ? (
            <Badge
              tone={tier.key === 'plus' ? 'certPlus' : tier.key === 'certified' ? 'cert' : 'inspected'}
              icon="shield-check"
            >
              {tier.short}
            </Badge>
          ) : null}
        </div>
        {car.safari_ready ? (
          <div className="absolute right-3 top-3">
            <Badge tone="info" icon="location">
              {t('rentals.card.safariReady')}
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="p-5">
        <h3 className="truncate text-title-sm font-extrabold tracking-[-0.015em] text-content transition-colors group-hover:text-brand">
          {car.title}
        </h3>

        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-content-secondary">
          {car.seats ? <span>{t('rentals.card.seats', { count: car.seats })}</span> : null}
          {car.transmission ? (
            <>
              <span aria-hidden className="text-line">·</span>
              <span>{car.transmission}</span>
            </>
          ) : null}
          {car.fuel ? (
            <>
              <span aria-hidden className="text-line">·</span>
              <span>{car.fuel}</span>
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

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p
              className="text-price font-extrabold tracking-[-0.02em] text-brand"
              title={formatMoneyExact(car.daily_rate)}
            >
              {formatUSD(car.daily_rate)}
              <span className="text-caption font-bold text-content-muted"> {t('rentals.card.perDay')}</span>
            </p>
            <p className="mt-0.5 text-micro text-content-muted">
              {t('rentals.card.depositLine', { amount: formatUSD(car.deposit) })}
            </p>
          </div>

          {rating ? (
            <span className="inline-flex items-center gap-1 rounded-pill bg-surface-alt px-2 py-1 text-micro font-bold text-content-secondary">
              <Icon name="star" size={11} />
              {rating}
              {car.trips > 0 ? ` · ${t('rentals.card.trips', { count: car.trips })}` : ''}
            </span>
          ) : null}
        </div>

        <div className="mt-4 border-t border-line-soft pt-4">
          <p className="mb-3 text-micro text-content-muted">{car.min_days > 1 ? t('rentals.card.minDays', { count: car.min_days }) : t('rentals.card.fromOneDay')} · {t('rentals.card.providerConfirmsDates')}</p>
          <span className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-caption font-extrabold text-white shadow-card transition-colors group-hover:bg-brand-deep">
            {t('rentals.card.viewDetails')} <Icon name="arrow-right" size={15} />
          </span>
        </div>
      </div>
    </Link>
  )
}

export function RentalCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-line-soft bg-surface">
      <div className="skeleton aspect-[16/10]" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton h-6 w-28 rounded" />
      </div>
    </div>
  )
}

export default RentalCard
