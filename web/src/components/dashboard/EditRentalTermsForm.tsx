'use client'

import { useActionState, useState } from 'react'
import { updateRentalTermsAction } from '@/app/(dashboard)/dashboard/rentals/fleet/actions'
import { SubmitButton } from '@/components/dashboard/SubmitButton'
import { Alert, Field, Input, LiveRegion } from '@/components/ui'
import { useT } from '@/lib/i18n/context'
import type { RentalCar } from '@/lib/types'

// Quick terms edit for one of the provider's own cars — status, provider and
// inspection stay out of this form entirely; the backend (PATCH .../mine)
// would ignore them anyway, but not offering the fields is the honest version
// of that.
export function EditRentalTermsForm({ car }: { car: RentalCar }) {
  const t = useT()
  const [state, action] = useActionState(updateRentalTermsAction, null)
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex h-9 items-center rounded-lg border border-line px-3 text-caption font-bold text-content transition-colors hover:bg-surface-alt"
      >
        {t('dashboard.rentalFleet.edit.open')}
      </button>
    )
  }

  return (
    <form action={action} className="mt-4 space-y-3 border-t border-line-soft pt-4">
      <input type="hidden" name="id" value={car.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('dashboard.rentalFleet.propose.dailyRate')} htmlFor={`edit-daily-${car.id}`} error={state?.fieldErrors?.daily_rate}>
          <Input id={`edit-daily-${car.id}`} name="daily_rate" type="number" min={1} defaultValue={car.daily_rate} error={Boolean(state?.fieldErrors?.daily_rate)} />
        </Field>
        <Field label={t('dashboard.rentalFleet.propose.weeklyRate')} htmlFor={`edit-weekly-${car.id}`}>
          <Input id={`edit-weekly-${car.id}`} name="weekly_rate" type="number" min={1} defaultValue={car.weekly_rate ?? undefined} />
        </Field>
        <Field label={t('dashboard.rentalFleet.propose.deposit')} htmlFor={`edit-deposit-${car.id}`}>
          <Input id={`edit-deposit-${car.id}`} name="deposit" type="number" min={0} defaultValue={car.deposit} />
        </Field>
        <Field label={t('dashboard.rentalFleet.propose.minDays')} htmlFor={`edit-mindays-${car.id}`}>
          <Input id={`edit-mindays-${car.id}`} name="min_days" type="number" min={1} defaultValue={car.min_days} />
        </Field>
        <Field label={t('dashboard.rentalFleet.propose.location')} htmlFor={`edit-location-${car.id}`}>
          <Input id={`edit-location-${car.id}`} name="location" defaultValue={car.location ?? ''} />
        </Field>
        <Field
          label={t('dashboard.rentalFleet.edit.unavailableUntil')}
          htmlFor={`edit-unavailable-${car.id}`}
          hint={t('dashboard.rentalFleet.edit.unavailableHint')}
        >
          <Input
            id={`edit-unavailable-${car.id}`}
            name="unavailable_until"
            type="date"
            defaultValue={car.unavailable_until ? car.unavailable_until.slice(0, 10) : ''}
          />
        </Field>
      </div>

      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}
      <LiveRegion>{state?.error || (state?.ok ? state.message : '')}</LiveRegion>

      <div className="flex gap-2">
        <SubmitButton size="sm" pendingLabel={t('dashboard.rentalFleet.propose.submitting')}>
          {t('dashboard.rentalFleet.edit.save')}
        </SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-9 rounded-lg border border-line px-3 text-caption font-bold text-content-secondary transition-colors hover:bg-surface-alt"
        >
          {t('dashboard.rentalFleet.edit.close')}
        </button>
      </div>
    </form>
  )
}

export default EditRentalTermsForm
