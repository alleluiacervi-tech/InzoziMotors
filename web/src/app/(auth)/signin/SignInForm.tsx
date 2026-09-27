'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { reopenAccountAction, signInAction, type AuthState } from '@/app/actions/auth'
import { Alert, Field, Input } from '@/components/ui'
import { useT } from '@/lib/i18n/context'
import { PasswordField } from '../_components/PasswordField'
import { SubmitButton } from '../_components/SubmitButton'

export function SignInForm({ next, defaultEmail }: { next: string; defaultEmail: string }) {
  const t = useT()
  const [state, formAction] = useActionState<AuthState, FormData>(signInAction, null)

  // Held in state only so "Forgot your password?" can carry the address across —
  // retyping an email you just typed is the small insult that makes people leave.
  const [email, setEmail] = useState(defaultEmail)

  // Hidden again by "Not now", until the next sign-in attempt brings it back.
  const [dismissedFor, setDismissedFor] = useState<AuthState>(null)
  if (state?.closed && dismissedFor !== state) {
    return (
      <ReopenPanel
        email={state.closed.email}
        until={state.closed.until}
        next={next}
        onDismiss={() => setDismissedFor(state)}
      />
    )
  }

  const fieldErrors = state?.fieldErrors ?? {}
  const forgotHref = email.trim()
    ? `/forgot-password?email=${encodeURIComponent(email.trim())}`
    : '/forgot-password'

  return (
    // noValidate: the browser's own bubbles are an OS popup we cannot style and
    // cannot make accessible. The action validates the same rules and returns
    // them inline; `required` stays for assistive tech.
    <form action={formAction} noValidate className="space-y-5">
      <input type="hidden" name="next" value={next} />

      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field label={t('auth.signin.email')} htmlFor="email" error={fieldErrors.email}>
        <Input
          id="email"
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
          error={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
        />
      </Field>

      <div>
        <PasswordField
          id="password"
          name="password"
          label={t('auth.signin.password')}
          autoComplete="current-password"
          required
          placeholder={t('auth.signin.passwordPlaceholder')}
          error={fieldErrors.password}
        />
        <p className="mt-2 text-right">
          <Link
            href={forgotHref}
            className="text-caption font-bold text-brand transition-colors hover:text-brand-deep"
          >
            {t('auth.signin.forgot')}
          </Link>
        </p>
      </div>

      <SubmitButton pendingLabel={t('auth.signin.submitting')}>{t('auth.signin.submit')}</SubmitButton>
    </form>
  )
}

// G7 in docs/WEB-PARITY-PLAN.md — the app's closed-account prompt, same copy.
// The password is asked for again: React clears an uncontrolled field once a
// form action finishes, so the first one is already gone.
function ReopenPanel({
  email,
  until,
  next,
  onDismiss,
}: {
  email: string
  until: string | null
  next: string
  onDismiss: () => void
}) {
  const t = useT()
  const [state, formAction] = useActionState<AuthState, FormData>(reopenAccountAction, null)

  return (
    <form action={formAction} noValidate className="space-y-5">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />

      <div className="rounded-2xl border border-line-soft bg-surface-alt p-5">
        <h2 className="text-title-sm font-extrabold text-content">{t('auth.signin.closed.title')}</h2>
        <p className="mt-2 text-caption leading-relaxed text-content-secondary">{t('auth.signin.closed.body')}</p>
        {until ? (
          <p className="mt-2 text-caption font-bold text-content">
            {t('auth.signin.closed.until', { date: until.slice(0, 10) })}
          </p>
        ) : null}
      </div>

      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <PasswordField
        id="reopen-password"
        name="password"
        label={t('auth.signin.password')}
        autoComplete="current-password"
        required
        hint={t('auth.signin.closed.passwordAgain')}
      />

      <SubmitButton pendingLabel={t('auth.signin.closed.reopening')}>{t('auth.signin.closed.reopen')}</SubmitButton>
      <button
        type="button"
        onClick={onDismiss}
        className="w-full rounded-xl py-2 text-caption font-bold text-content-secondary hover:text-content"
      >
        {t('auth.signin.closed.notNow')}
      </button>
    </form>
  )
}
