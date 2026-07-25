'use client'

import { useActionState } from 'react'
import { redeemReferralAction } from '@/app/(dashboard)/dashboard/referrals/actions'
import { SubmitButton } from '@/components/dashboard/SubmitButton'
import { Alert, Field, Input, LiveRegion } from '@/components/ui'

export function RedeemForm() {
  const [state, action] = useActionState(redeemReferralAction, null)

  return (
    <form action={action}>
      <Field
        label="Referral code"
        htmlFor="referral-code"
        hint="A code can only be redeemed once, and not your own."
        error={state?.fieldErrors?.code}
      >
        <Input
          id="referral-code"
          name="code"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={20}
          placeholder="INZ4F2A9C"
          className="uppercase tracking-[0.08em]"
          error={Boolean(state?.fieldErrors?.code)}
        />
      </Field>

      {state?.error ? (
        <Alert tone="danger" className="mt-3">
          {state.error}
        </Alert>
      ) : null}

      {state?.ok ? (
        <Alert tone="success" className="mt-3">
          {state.message}
        </Alert>
      ) : null}

      <div className="mt-4">
        <SubmitButton size="sm" pendingLabel="Applying…">
          Apply code
        </SubmitButton>
      </div>

      <LiveRegion>{state?.ok ? state.message : state?.fieldErrors?.code ?? ''}</LiveRegion>
    </form>
  )
}

export default RedeemForm
