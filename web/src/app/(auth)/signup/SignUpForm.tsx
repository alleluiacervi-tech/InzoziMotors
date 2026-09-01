'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { signUpAction, type AuthState } from '@/app/actions/auth'
import { Alert, Field, Icon, Input, type IconName } from '@/components/ui'
import { useT } from '@/lib/i18n/context'
import { PasswordField } from '../_components/PasswordField'
import { SubmitButton } from '../_components/SubmitButton'

/**
 * Radio card. The real <input> stays in the DOM as a screen-reader-visible
 * radio and drives every visual state through `peer` — so arrow-key selection,
 * form serialisation and the styling all come from one control rather than a
 * div pretending to be one.
 */
function RoleCard({
  value, icon, title, desc, defaultChecked,
}: {
  value: 'buyer' | 'seller'
  icon: IconName
  title: string
  desc: string
  defaultChecked?: boolean
}) {
  return (
    <label className="relative block cursor-pointer">
      <input
        type="radio"
        name="role"
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      {/* Only properties the checked state does not touch may react to hover,
          or a selected card would lose its red border under the cursor. */}
      <span className="flex h-full flex-col rounded-2xl border-2 border-line bg-surface p-4 pr-11 transition-all duration-200 ease-brand hover:shadow-card peer-checked:border-brand peer-checked:bg-brand/[0.04] peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2">
        <Icon name={icon} size={20} className="text-content-muted" />
        <span className="mt-2.5 text-body font-extrabold text-content">{title}</span>
        <span className="mt-1 text-caption leading-relaxed text-content-secondary">{desc}</span>
      </span>

      {/* Two siblings rather than one styled child: `peer-*` reaches siblings
          of the input only, never their descendants. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3.5 top-3.5 block h-5 w-5 rounded-full border-2 border-line peer-checked:hidden"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3.5 top-3.5 hidden h-5 w-5 items-center justify-center rounded-full bg-brand text-white peer-checked:flex"
      >
        <Icon name="check" size={12} />
      </span>
    </label>
  )
}

export function SignUpForm({ next }: { next: string }) {
  const t = useT()
  const [state, formAction] = useActionState<AuthState, FormData>(signUpAction, null)
  const fieldErrors = state?.fieldErrors ?? {}

  return (
    <form action={formAction} noValidate className="space-y-5">
      <input type="hidden" name="next" value={next} />

      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field label={t('auth.signup.name')} htmlFor="name" error={fieldErrors.name}>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          autoCapitalize="words"
          required
          placeholder={t('auth.signup.namePlaceholder')}
          error={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? 'name-error' : undefined}
        />
      </Field>

      <Field label={t('auth.signup.email')} htmlFor="email" error={fieldErrors.email}>
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
          error={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
        />
      </Field>

      <PasswordField
        id="password"
        name="password"
        label={t('auth.signup.password')}
        autoComplete="new-password"
        required
        placeholder={t('auth.signup.passwordPlaceholder')}
        hint={t('auth.signup.passwordHint')}
        error={fieldErrors.password}
      />

      <fieldset>
        <legend className="mb-2 block text-caption font-bold uppercase tracking-wide text-content-muted">
          {t('auth.signup.legend')}
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <RoleCard
            value="buyer"
            icon="search"
            title={t('auth.signup.buyerTitle')}
            desc={t('auth.signup.buyerDesc')}
            defaultChecked
          />
          <RoleCard
            value="seller"
            icon="key"
            title={t('auth.signup.sellerTitle')}
            desc={t('auth.signup.sellerDesc')}
          />
        </div>
        <p className="mt-3 flex gap-2 text-micro leading-relaxed text-content-muted">
          <Icon name="info" size={14} className="mt-px" />
          <span>
            {t('auth.signup.sellerNote')}
          </span>
        </p>
      </fieldset>

      <SubmitButton pendingLabel={t('auth.signup.submitting')}>{t('auth.signup.submit')}</SubmitButton>

      <p className="text-center text-micro leading-relaxed text-content-muted">
        {t('auth.signup.termsPrefix')}{' '}
        <Link href="/legal/terms" className="font-bold text-brand transition-colors hover:text-brand-deep">
          {t('auth.signup.termsLink')}
        </Link>{' '}
        {t('auth.signup.termsAnd')}{' '}
        <Link href="/legal/privacy" className="font-bold text-brand transition-colors hover:text-brand-deep">
          {t('auth.signup.privacyLink')}
        </Link>
        .
      </p>
    </form>
  )
}
