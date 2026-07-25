'use client'

import { useActionState } from 'react'
import { markAllReadAction } from '@/app/(dashboard)/dashboard/notifications/actions'
import { SubmitButton } from '@/components/dashboard/SubmitButton'
import { LiveRegion } from '@/components/ui'

export function MarkAllReadButton({ unread }: { unread: number }) {
  const [state, action] = useActionState(markAllReadAction, null)

  return (
    <form action={action}>
      <SubmitButton variant="outline" size="sm" pendingLabel="Marking…">
        Mark all read
        <span className="sr-only"> ({unread} unread)</span>
      </SubmitButton>
      {state?.error ? (
        <p role="alert" className="mt-2 text-xs font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
      <LiveRegion>{state?.ok ? state.message : ''}</LiveRegion>
    </form>
  )
}

export default MarkAllReadButton
