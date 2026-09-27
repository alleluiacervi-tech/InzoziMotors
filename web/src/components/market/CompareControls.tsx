'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui'
import { COMPARE_MAX, compareHref, removeFromCompare, toggleCompare, useCompare } from '@/lib/compare'
import { useT } from '@/lib/i18n/context'

/** On the car page, as in the app's VehicleDetail. Not on the card: the card
 *  is one big link and can't hold a second control (P3-D4). */
export function CompareToggle({ carId }: { carId: string }) {
  const t = useT()
  const ids = useCompare()
  const added = ids.includes(carId)
  return (
    <button
      type="button"
      onClick={() => toggleCompare(carId)}
      aria-pressed={added}
      className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-caption font-bold transition-colors ${
        added ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-surface text-content hover:bg-surface-alt'
      }`}
    >
      <Icon name={added ? 'check' : 'plus'} size={15} />
      {added ? t('market.compare.added') : t('market.compare.add')}
    </button>
  )
}

/** The app's floating "Compare (n)" pill, on car pages whenever something is
 *  selected. With one car there's nothing to compare yet, so it says so. */
export function CompareTray() {
  const t = useT()
  const ids = useCompare()
  if (!ids.length) return null
  return (
    // Above the car page's own sticky "Contact seller" bar on phones.
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 lg:bottom-6">
      <Link
        href={compareHref(ids)}
        className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-pill bg-ink-900 px-5 text-caption font-bold text-white shadow-card-lg"
      >
        <Icon name="grid" size={16} />
        {t('market.compare.tray', { count: ids.length, max: COMPARE_MAX })}
      </Link>
    </div>
  )
}

/** Removes a car from the comparison on /compare, updating both the stored
 *  selection and the URL the page renders from. */
export function CompareRemove({ carId, remaining }: { carId: string; remaining: string[] }) {
  const t = useT()
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => {
        removeFromCompare(carId)
        router.replace(remaining.length ? compareHref(remaining) : '/compare')
      }}
      aria-label={t('market.compare.remove')}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-content-secondary shadow-card hover:text-content"
    >
      <Icon name="close" size={14} />
    </button>
  )
}

/** Clear the whole comparison. */
export function CompareClear() {
  const t = useT()
  const router = useRouter()
  const ids = useCompare()
  return (
    <button
      type="button"
      onClick={() => {
        ids.forEach(removeFromCompare)
        router.replace('/compare')
      }}
      className="h-10 rounded-xl px-4 text-caption font-bold text-content-secondary hover:bg-surface-alt hover:text-content"
    >
      {t('market.compare.clear')}
    </button>
  )
}
