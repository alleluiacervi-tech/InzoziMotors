'use client'

import { useActionState } from 'react'
import { unsaveCarAction } from '@/app/(dashboard)/dashboard/saved/actions'
import { SubmitButton } from '@/components/dashboard/SubmitButton'
import { Icon } from '@/components/ui'
import { useT } from '@/lib/i18n/context'

// Sits under the card rather than on top of it: CarCard is one big link, and
// a button inside a link is invalid markup that keyboards handle badly.

export function UnsaveButton({ carId, title }: { carId: string; title: string }) {
  const t = useT()
  const [state, action] = useActionState(unsaveCarAction, null)

  return (
    <form action={action} className="mt-2">
      <input type="hidden" name="car_id" value={carId} />
      <SubmitButton
        variant="ghost"
        size="sm"
        fullWidth
        pendingLabel={t('dashboard.saved.removing')}
        leadingIcon={<Icon name="heart-filled" size={15} />}
      >
        <span className="truncate">{t('dashboard.saved.remove')}</span>
        <span className="sr-only"> — {title}</span>
      </SubmitButton>
      {state?.error ? (
        <p role="alert" className="mt-1 text-center text-micro font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  )
}

export default UnsaveButton
