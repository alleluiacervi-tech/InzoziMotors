'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Button, Icon } from '@/components/ui'
import type { ActionState } from '@/components/dashboard/types'
import { saveRentalSearchAction } from '@/app/rentals/save-rental-search-action'
import { useT } from '@/lib/i18n/context'

// One line above the fleet: "tell me when a new car for hire is listed", for the
// category being looked at. Signed out, the button goes to sign-in and back.
// The alert says a car was LISTED for hire: never "available" or "booked".
export function RentalSaveSearchPrompt({
  category,
  signedIn,
  returnTo,
}: {
  category: string
  signedIn: boolean
  returnTo: string
}) {
  const t = useT()
  const [state, action, pending] = useActionState<ActionState, FormData>(saveRentalSearchAction, null)
  const label = category
    ? t('cars.saveSearch.promptRentalCategory', { category })
    : t('cars.saveSearch.promptRental')

  return (
    <div className="mt-4 flex flex-col gap-3 border-y border-line-soft py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex min-w-0 items-start gap-2 text-body font-semibold text-content">
        <Icon name="bell" size={18} className="mt-0.5 shrink-0 text-content-muted" aria-hidden="true" />
        <span className="min-w-0">{state?.ok ? state?.message : label}</span>
      </p>
      {state?.ok ? (
        <Link
          href="/dashboard/saved"
          className="shrink-0 text-caption font-bold text-content underline decoration-line underline-offset-4 hover:decoration-content"
        >
          {t('cars.saveSearch.manage')}
        </Link>
      ) : signedIn ? (
        <form action={action} className="shrink-0">
          <input type="hidden" name="category" value={category} />
          <Button type="submit" variant="outline" size="compact" disabled={pending}>
            {t('cars.saveSearch.turnOn')}
          </Button>
        </form>
      ) : (
        <Button href={`/signin?next=${encodeURIComponent(returnTo)}`} variant="outline" size="compact" className="shrink-0">
          {t('cars.saveSearch.signIn')}
        </Button>
      )}
      {state?.error ? <p role="alert" className="text-caption font-semibold text-danger sm:basis-full">{state?.error}</p> : null}
    </div>
  )
}

export default RentalSaveSearchPrompt
