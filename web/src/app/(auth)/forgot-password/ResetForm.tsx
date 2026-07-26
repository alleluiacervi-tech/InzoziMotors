'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { confirmResetAction, requestResetAction, type ResetState } from '@/app/actions/auth'
import { Alert, Button, Field, Icon, Input, LiveRegion } from '@/components/ui'
import { PasswordField } from '../_components/PasswordField'
import { SubmitButton } from '../_components/SubmitButton'

/**
 * One state machine, two server actions. Which one runs is decided by the
 * submitter's `intent`, not by the current stage — that way "send me a new code"
 * can re-run step 1 from inside step 2 without unwinding the flow.
 */
async function runReset(prev: ResetState, formData: FormData): Promise<ResetState> {
  return formData.get('intent') === 'confirm'
    ? confirmResetAction(prev, formData)
    : requestResetAction(prev, formData)
}

export function ResetForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, formAction] = useActionState<ResetState, FormData>(runReset, { stage: 'request' })

  // Kept locally so the address survives step 2 and the success screen; the
  // action's own copy disappears once the stage becomes 'done'.
  const [email, setEmail] = useState(defaultEmail)

  // "Wrong address?" sends the user back a step. Comparing object identity
  // rather than holding a boolean means the next action result automatically
  // wins — no effect, no stale flag.
  const [restartedFrom, setRestartedFrom] = useState<ResetState | null>(null)
  const stage = restartedFrom === state ? 'request' : state.stage

  const error = state.stage === 'done' ? undefined : state.error
  const devCode = state.stage === 'code' ? state.devCode : undefined
  const sentTo = state.stage === 'code' ? state.email : email

  if (stage === 'done') {
    return (
      <div className="space-y-6">
        <Alert tone="success" title="Password updated">
          Your new password is active. Nobody else has been signed out — if you did not make
          this change, contact us straight away.
        </Alert>
        <Button
          href={email ? `/signin?email=${encodeURIComponent(email)}` : '/signin'}
          size="lg"
          fullWidth
        >
          Sign in
        </Button>
      </div>
    )
  }

  return (
    <form action={formAction} noValidate className="space-y-5">
      {/* The reset actions return one message per submission, not per field, so
          everything surfaces in the form-level alert. */}
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {stage === 'request' ? (
        <>
          <p className="text-body leading-relaxed text-content-secondary">
            Enter the email on your account and we will send a 6-digit code. It is valid for 30
            minutes.
          </p>

          <Field label="Email" htmlFor="reset-email">
            <Input
              id="reset-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={Boolean(error)}
            />
          </Field>

          <SubmitButton pendingLabel="Sending…">Send reset code</SubmitButton>

          <p className="text-center text-sm text-content-secondary">
            Remembered it?{' '}
            <Link href="/signin" className="font-bold text-brand transition-colors hover:text-brand-deep">
              Back to sign in
            </Link>
          </p>
        </>
      ) : (
        <>
          <input type="hidden" name="email" value={sentTo} />

          <p className="text-body leading-relaxed text-content-secondary">
            If <span className="font-bold text-content">{sentTo}</span> has an account, a 6-digit
            code is on its way. It expires in 30 minutes, and five wrong attempts cancel it.
          </p>

          {devCode ? (
            <Alert tone="warning" title="Development build — code shown here">
              No email or SMS provider is connected yet, so the server is handing the code back
              instead of sending it. In production it arrives by message and never appears on
              screen.
              <span className="mt-2 block text-xl font-extrabold tabular-nums tracking-[0.35em]">
                {devCode}
              </span>
            </Alert>
          ) : null}

          <Field label="6-digit code" htmlFor="code">
            <Input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              // Moving focus here is the whole point of the stage change.
              autoFocus
              placeholder="000000"
              className="text-center text-lg font-extrabold tabular-nums tracking-[0.4em]"
            />
          </Field>

          <PasswordField
            id="password"
            name="password"
            label="New password"
            autoComplete="new-password"
            required
            placeholder="At least 6 characters"
            hint="Minimum 6 characters. Pick something you do not use on another site."
          />

          <PasswordField
            id="confirm"
            name="confirm"
            label="Confirm new password"
            autoComplete="new-password"
            required
            placeholder="Type it once more"
          />

          {/* First submit button in the form, so pressing Enter in a field
              confirms the reset rather than requesting another code. */}
          <SubmitButton pendingLabel="Updating…" name="intent" value="confirm">
            Reset password
          </SubmitButton>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <button
              type="submit"
              name="intent"
              value="resend"
              className="min-h-[44px] font-bold text-brand transition-colors hover:text-brand-deep"
            >
              Send a new code
            </button>
            <button
              type="button"
              onClick={() => setRestartedFrom(state)}
              className="inline-flex min-h-[44px] items-center gap-1.5 text-content-secondary transition-colors hover:text-content"
            >
              <Icon name="chevron-left" size={14} />
              Use a different email
            </button>
          </div>
        </>
      )}

      {/* The form swaps wholesale between steps; without this the change is
          silent for a screen reader. */}
      <LiveRegion>
        {stage === 'code' ? `Step 2 of 2. Enter the 6-digit code sent to ${sentTo}.` : ''}
      </LiveRegion>
    </form>
  )
}
