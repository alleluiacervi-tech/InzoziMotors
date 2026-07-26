'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { signInAction, type AuthState } from '@/app/actions/auth'
import { Alert, Field, Input } from '@/components/ui'
import { PasswordField } from '../_components/PasswordField'
import { SubmitButton } from '../_components/SubmitButton'

export function SignInForm({ next, defaultEmail }: { next: string; defaultEmail: string }) {
  const [state, formAction] = useActionState<AuthState, FormData>(signInAction, null)

  // Held in state only so "Forgot your password?" can carry the address across —
  // retyping an email you just typed is the small insult that makes people leave.
  const [email, setEmail] = useState(defaultEmail)

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

      <Field label="Email" htmlFor="email" error={fieldErrors.email}>
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
          label="Password"
          autoComplete="current-password"
          required
          placeholder="Your password"
          error={fieldErrors.password}
        />
        <p className="mt-2 text-right">
          <Link
            href={forgotHref}
            className="text-caption font-bold text-brand transition-colors hover:text-brand-deep"
          >
            Forgot your password?
          </Link>
        </p>
      </div>

      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  )
}
