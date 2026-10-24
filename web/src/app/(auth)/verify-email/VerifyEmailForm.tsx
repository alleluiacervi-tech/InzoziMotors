'use client'

import { useActionState } from 'react'
import {
  confirmEmailCodeAction, sendEmailCodeAction, signOutAction, type EmailCodeState,
} from '@/app/actions/auth'
import { Alert, Field, Input } from '@/components/ui'
import { useT } from '@/lib/i18n/context'
import { SubmitButton } from '../_components/SubmitButton'

/** One form, two actions, picked by the button pressed: "Send a new code"
 *  re-runs the send from inside the confirm step. */
async function run(prev: EmailCodeState, formData: FormData): Promise<EmailCodeState> {
  return formData.get('intent') === 'confirm'
    ? confirmEmailCodeAction(prev, formData)
    : sendEmailCodeAction(prev, formData)
}

export function VerifyEmailForm({ email, next }: { email: string; next: string }) {
  const t = useT()
  const [state, formAction] = useActionState<EmailCodeState, FormData>(run, null)
  const sent = Boolean(state?.sent)

  return (
    <div className="space-y-6">
      <form action={formAction} noValidate className="space-y-5">
        <input type="hidden" name="next" value={next} />
        {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}

        <p className="text-body leading-relaxed text-content-secondary">
          {sent ? t('auth.verify.sentTo') : t('auth.verify.sendTo')}{' '}
          <span className="break-all font-bold text-content">{state?.email || email}</span>
        </p>

        {sent ? (
          <>
            <Field label={t('auth.verify.code')} htmlFor="email-code">
              <Input
                id="email-code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                placeholder="123456"
                className="text-center text-title tracking-[0.4em]"
              />
            </Field>
            <SubmitButton name="intent" value="confirm" pendingLabel={t('auth.verify.confirming')}>
              {t('auth.verify.confirm')}
            </SubmitButton>
            <p className="text-caption leading-relaxed text-content-muted">{t('auth.verify.help')}</p>
            <SubmitButton name="intent" value="send" variant="dark" pendingLabel={t('auth.verify.sending')}>
              {t('auth.verify.resend')}
            </SubmitButton>
          </>
        ) : (
          <SubmitButton name="intent" value="send" pendingLabel={t('auth.verify.sending')}>
            {t('auth.verify.send')}
          </SubmitButton>
        )}
      </form>

      <form action={signOutAction} className="flex items-center justify-center gap-2 text-caption text-content-muted">
        <span>{t('auth.verify.wrongAccount')}</span>
        <button
          type="submit"
          className="min-h-11 px-2 font-bold text-content underline decoration-line underline-offset-4 transition-colors hover:decoration-content"
        >
          {t('auth.verify.signOut')}
        </button>
      </form>
    </div>
  )
}
