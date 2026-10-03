import Link from 'next/link'
import { formatDate, formatMoney } from '@/lib/business'
import type { SoldCar } from '@/lib/types'
import { getServerT } from '@/lib/i18n/server'

// "Recently sold": the quiet proof under the stock grid that inspected cars
// here actually change hands. Text only, no photos, no red: it must never
// compete with the cars that are still for sale.
//
// Shown only with at least three sales in the window (GET /cars/recently-sold
// is already limited to 90 days). One or two sold cars reads as an empty yard,
// not as proof.

export const RECENTLY_SOLD_MIN = 3
const PHONE_MAX = 3

export async function RecentlySold({ cars }: { cars: SoldCar[] }) {
  if (cars.length < RECENTLY_SOLD_MIN) return null
  const t = await getServerT()

  return (
    <section aria-labelledby="recently-sold" className="mt-16 border-t border-line pt-8">
      <h3 id="recently-sold" className="text-title font-extrabold text-content">
        {t('home.front.sold.title')}
      </h3>
      <p className="mt-1.5 text-caption text-content-secondary">{t('home.front.sold.lede')}</p>

      <ul className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {cars.map((car, i) => (
          <li key={car.id} className={`min-w-0 border-t border-line-soft pt-4 ${i >= PHONE_MAX ? 'hidden sm:block' : ''}`}>
            <Link
              href={`/cars/${car.id}`}
              className="block truncate text-body font-bold text-content underline decoration-transparent underline-offset-4 hover:decoration-line"
            >
              {car.title}
            </Link>
            <p className="tnum mt-1 flex flex-wrap gap-x-3 text-caption text-content-secondary">
              {car.inspection_score != null ? (
                <span>{t('home.front.sold.score', { score: car.inspection_score })}</span>
              ) : null}
              <span>{t('home.front.sold.soldOn', { date: formatDate(car.sold_at) })}</span>
              {car.price ? <span className="text-content-muted">{t('home.front.sold.asked', { amount: formatMoney(car.price) })}</span> : null}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default RecentlySold
