'use client'

import Link from 'next/link'
import { formatUsdApprox } from '@/lib/business'
import { useT } from '@/lib/i18n/context'
import type { KoreaCar } from '@/lib/api'

const won = (n: number) => `₩${Math.round(n).toLocaleString('en-US')}`

/**
 * One Korean car in the grid. The photo is loaded straight from the photo host
 * with a plain <img>: running tens of thousands of other people's photos
 * through our own image optimiser would put the load on our server for no gain.
 */
export function KoreaCard({ car }: { car: KoreaCar }) {
  const t = useT()
  const title = `${car.year} ${car.make} ${car.model}`
  const specs = [
    car.badge,
    car.mileage_km != null ? t('imports.korea.mileage', { km: car.mileage_km.toLocaleString('en-US') }) : null,
    car.fuel,
    car.transmission,
  ].filter(Boolean)

  return (
    <li className="min-w-0">
      <Link
        href={`/imports/korea/${encodeURIComponent(car.id)}`}
        className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-line-soft bg-surface transition-shadow hover:shadow-card"
      >
        <div className="relative aspect-[4/3] bg-surface-alt">
          {car.cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- provider photo host, see above
            <img
              src={car.cover}
              alt={title}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-title font-extrabold text-content-muted">{car.make}</div>
          )}
          {car.photo_count > 1 ? (
            <span className="absolute bottom-2 right-2 rounded-pill bg-ink-900/80 px-2 py-0.5 text-micro font-bold text-white">
              {t('imports.korea.photosCount', { count: car.photo_count })}
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
          <h3 className="text-body font-extrabold text-content group-hover:underline">{title}</h3>
          {specs.length ? <p className="text-caption capitalize text-content-secondary">{specs.join(' · ')}</p> : null}
          <div className="mt-auto pt-1">
            <p className="text-micro font-semibold text-content-muted">{t('imports.korea.koreanPrice')}</p>
            <p className="text-title-sm font-extrabold text-brand tabular-nums">{won(car.price_krw)}</p>
            {car.price_usd != null ? (
              <p className="text-caption text-content-secondary">{t('imports.korea.approxUsd', { usd: formatUsdApprox(car.price_usd) })}</p>
            ) : null}
          </div>
        </div>
      </Link>
    </li>
  )
}
