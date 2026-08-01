'use client'

import { useActionState, useState } from 'react'
import { raiseDisputeAction } from '@/app/(dashboard)/dashboard/disputes/actions'
import { SubmitButton } from '@/components/dashboard/SubmitButton'
import { Alert, Field, LiveRegion, Textarea } from '@/components/ui'

// One form per eligible handover, so there is no car-picker to get wrong. The
// form only appears where the guarantee still applies.

export function DisputeForm({
  handoverId,
  carTitle,
  daysLeft,
}: {
  handoverId: string
  carTitle: string
  daysLeft: number
}) {
  const [state, action] = useActionState(raiseDisputeAction, null)
  const [open, setOpen] = useState(false)
  const fieldId = `reason-${handoverId}`

  if (state?.ok) {
    return (
      <Alert tone="success" title="Dispute received">
        {state.message}
      </Alert>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center rounded-xl border border-line px-4 text-caption font-bold text-content-secondary transition-colors hover:border-content-muted hover:bg-surface-alt hover:text-content"
      >
        Raise a dispute
        <span className="sr-only"> for the {carTitle}</span>
      </button>
    )
  }

  return (
    <form action={action}>
      <input type="hidden" name="handover_id" value={handoverId} />

      <Field
        label="What is wrong with the car?"
        htmlFor={fieldId}
        hint={`Be specific — which part, and how it differs from the inspection report. You have ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left to raise this.`}
        error={state?.fieldErrors?.reason}
        required
      >
        <Textarea
          id={fieldId}
          name="reason"
          required
          minLength={10}
          maxLength={2000}
          placeholder="The inspection report lists the brakes as pass, but the car pulls left under braking and the pads are worn."
          error={Boolean(state?.fieldErrors?.reason)}
        />
      </Field>

      {state?.error ? (
        <Alert tone="danger" className="mt-3">
          {state.error}
        </Alert>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <SubmitButton size="sm" pendingLabel="Sending…">
          Send to the Sawa team
        </SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex h-10 items-center rounded-lg px-4 text-caption font-bold text-content-secondary transition-colors hover:bg-surface-alt hover:text-content"
        >
          Cancel
        </button>
      </div>

      <LiveRegion>{state?.error ?? ''}</LiveRegion>
    </form>
  )
}

export default DisputeForm
