'use client'

import { useState } from 'react'
import { setListingStatusAction } from '@/app/(dashboard)/dashboard/selling/actions'
import { useT } from '@/lib/i18n/context'

type Target = 'live' | 'paused' | 'sold'

// B1 / P3-D5 in docs/WEB-PARITY-PLAN.md. What a seller may do with their own
// listing, each behind a confirm step:
//   live    → Pause, Mark as sold
//   paused  → Make live again, Mark as sold
// "Mark as sold" says plainly that it is final — the backend can't undo it.
export function ListingStatusControls({ carId, status }: { carId: string; status: 'live' | 'paused' }) {
  const t = useT()
  const [confirming, setConfirming] = useState<Target | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const actions: { target: Target; label: string; confirm: string; danger?: boolean }[] =
    status === 'live'
      ? [
          { target: 'paused', label: t('market.listing.pause'), confirm: t('market.listing.pauseConfirm') },
          { target: 'sold', label: t('market.listing.markSold'), confirm: t('market.listing.soldConfirm'), danger: true },
        ]
      : [
          { target: 'live', label: t('market.listing.resume'), confirm: t('market.listing.resumeConfirm') },
          { target: 'sold', label: t('market.listing.markSold'), confirm: t('market.listing.soldConfirm'), danger: true },
        ]

  async function apply(target: Target) {
    setBusy(true)
    setError(null)
    const result = await setListingStatusAction(carId, target)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    // No router.refresh() here. The action calls revalidatePath, so its own
    // response already carries the updated page. A second refresh racing it
    // could leave the old tree on screen, showing a sold car as "Available"
    // (and failing the e2e "mark as sold" test intermittently).
    setConfirming(null)
  }

  const pending = actions.find((a) => a.target === confirming)

  return (
    <div className="mt-4 border-t border-line-soft pt-4">
      {pending ? (
        <div className={`rounded-xl p-3 ${pending.danger ? 'bg-danger-tint' : 'bg-surface-alt'}`}>
          <p className="text-caption text-content">{pending.confirm}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => apply(pending.target)}
              className={`h-10 rounded-xl px-4 text-caption font-bold disabled:opacity-50 ${
                pending.danger ? 'border border-danger/40 bg-surface text-danger' : 'bg-brand text-brand-on'
              }`}
            >
              {busy ? t('market.listing.saving') : pending.label}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(null)}
              className="h-10 rounded-xl px-4 text-caption font-bold text-content-secondary hover:bg-surface"
            >
              {t('market.listing.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action.target}
              type="button"
              onClick={() => setConfirming(action.target)}
              className={`h-10 rounded-xl border px-4 text-caption font-bold ${
                action.danger
                  ? 'border-danger/40 bg-surface text-danger hover:bg-danger-tint'
                  : 'border-line bg-surface text-content hover:bg-surface-alt'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      {error ? <p role="alert" className="mt-2 text-micro text-danger">{error}</p> : null}
    </div>
  )
}

export default ListingStatusControls
