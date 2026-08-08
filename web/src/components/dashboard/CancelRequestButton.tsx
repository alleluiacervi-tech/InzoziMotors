'use client'

import { useActionState, useState } from 'react'
import { cancelHandoverAction } from '@/app/(dashboard)/dashboard/requests/actions'
import { SubmitButton } from '@/components/dashboard/SubmitButton'
import { Button } from '@/components/ui'

// Cancelling releases the car back to the marketplace, where someone else can
// request it immediately. That is not undoable, so it takes two deliberate
// taps — never a single one next to other controls.

export function CancelRequestButton({ id, carTitle }: { id: string; carTitle: string }) {
  const [state, action] = useActionState(cancelHandoverAction, null)
  const [confirming, setConfirming] = useState(false)

  if (state?.ok) {
    return (
      <p role="status" className="text-caption font-semibold text-content-secondary">
        {state.message}
      </p>
    )
  }

  if (!confirming) {
    return (
      <div>
        <Button type="button" variant="outline" size="compact" onClick={() => setConfirming(true)}>
          Cancel this request
        </Button>
        {state?.error ? (
          <p role="alert" className="mt-2 text-micro font-semibold text-danger">
            {state.error}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-line bg-surface-alt p-4">
      <p className="text-caption font-bold text-content">Cancel your request for the {carTitle}?</p>
      <p className="mt-1 text-caption leading-relaxed text-content-secondary">
        The reservation ends and the car goes back on the marketplace, where another buyer can
        request it. Cancelling is free — nothing has been paid.
      </p>
      <form action={action} className="mt-3 flex flex-wrap gap-2">
        <input type="hidden" name="id" value={id} />
        <SubmitButton variant="dark" size="sm" pendingLabel="Cancelling…">
          Yes, cancel it
        </SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          Keep my request
        </Button>
      </form>
      {state?.error ? (
        <p role="alert" className="mt-2 text-micro font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
    </div>
  )
}

export default CancelRequestButton
