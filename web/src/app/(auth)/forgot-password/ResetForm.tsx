'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { confirmResetAction, requestResetAction, type ResetState } from '@/app/actions/auth'
import { Alert, Button, Field, Icon, Input, LiveRegion } from '@/components/ui'
import { useT } from '@/lib/i18n/context'
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
  const t = useT()
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
        <Alert tone="success" title={t('auth.forgot.doneTitle')}>
          {t('auth.forgot.doneBody')}
        </Alert>
        <Button
          href={email ? `/signin?email=${encodeURIComponent(email)}` : '/signin'}
          size="lg"
          fullWidth
        >
          {t('auth.forgot.signIn')}
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
            {t('auth.forgot.requestIntro')}
          </p>

          <Field label={t('auth.forgot.email')} htmlFor="reset-email">
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

          <SubmitButton pendingLabel={t('auth.forgot.sending')}>{t('auth.forgot.sendCode')}</SubmitButton>

          <p className="text-center text-caption text-content-secondary">
            {t('auth.forgot.remembered')}{' '}
            <Link href="/signin" className="font-bold text-brand transition-colors hover:text-brand-deep">
              {t('auth.forgot.backToSignIn')}
            </Link>
          </p>
        </>
      ) : (
        <>
          <input type="hidden" name="email" value={sentTo} />

          <p className="text-body leading-relaxed text-content-secondary">
            {t('auth.forgot.sentPrefix')}{' '}
            <span className="font-bold text-content">{sentTo}</span>{' '}
            {t('auth.forgot.sentSuffix')}
          </p>

          {devCode ? (
            <Alert tone="warning" title={t('auth.forgot.devTitle')}>
              {t('auth.forgot.devBody')}
              <span className="mt-2 block text-xl font-extrabold tabular-nums tracking-[0.35em]">
                {devCode}
              </span>
            </Alert>
          ) : null}

          <Field label={t('auth.forgot.codeLabel')} htmlFor="code">
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
            label={t('auth.forgot.newPassword')}
            autoComplete="new-password"
            required
            placeholder={t('auth.forgot.newPasswordPlaceholder')}
            hint={t('auth.forgot.newPasswordHint')}
          />

          <PasswordField
            id="confirm"
            name="confirm"
            label={t('auth.forgot.confirmPassword')}
            autoComplete="new-password"
            required
            placeholder={t('auth.forgot.confirmPlaceholder')}
          />

          {/* First submit button in the form, so pressing Enter in a field
              confirms the reset rather than requesting another code. */}
          <SubmitButton pendingLabel={t('auth.forgot.updating')} name="intent" value="confirm">
            {t('auth.forgot.reset')}
          </SubmitButton>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-caption">
            <button
              type="submit"
              name="intent"
              value="resend"
              className="min-h-[44px] font-bold text-brand transition-colors hover:text-brand-deep"
            >
              {t('auth.forgot.resend')}
            </button>
            <button
              type="button"
              onClick={() => setRestartedFrom(state)}
              className="inline-flex min-h-[44px] items-center gap-1.5 text-content-secondary transition-colors hover:text-content"
            >
              <Icon name="chevron-left" size={14} />
              {t('auth.forgot.differentEmail')}
            </button>
          </div>
        </>
      )}

      {/* The form swaps wholesale between steps; without this the change is
          silent for a screen reader. */}
      <LiveRegion>
        {stage === 'code' ? t('auth.forgot.liveStep2', { email: sentTo }) : ''}
      </LiveRegion>
    </form>
  )
}
