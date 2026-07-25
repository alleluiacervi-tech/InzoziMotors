'use client'

import { useActionState } from 'react'
import { changePasswordAction } from '@/app/(dashboard)/dashboard/profile/actions'
import { SubmitButton } from '@/components/dashboard/SubmitButton'
import { Alert, Field, Input, LiveRegion } from '@/components/ui'

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, null)

  return (
    <form action={action} className="space-y-5">
      <Field
        label="Current password"
        htmlFor="current-password"
        error={state?.fieldErrors?.current_password}
        required
      >
        <Input
          id="current-password"
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
          error={Boolean(state?.fieldErrors?.current_password)}
        />
      </Field>

      <Field
        label="New password"
        htmlFor="new-password"
        hint="At least 6 characters."
        error={state?.fieldErrors?.new_password}
        required
      >
        <Input
          id="new-password"
          name="new_password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          error={Boolean(state?.fieldErrors?.new_password)}
        />
      </Field>

      <Field
        label="Confirm new password"
        htmlFor="confirm-password"
        error={state?.fieldErrors?.confirm_password}
        required
      >
        <Input
          id="confirm-password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          error={Boolean(state?.fieldErrors?.confirm_password)}
        />
      </Field>

      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}

      <SubmitButton variant="outline" pendingLabel="Updating…">
        Change password
      </SubmitButton>
      <LiveRegion>{state?.ok ? state.message : state?.error ?? ''}</LiveRegion>
    </form>
  )
}

export default PasswordForm
