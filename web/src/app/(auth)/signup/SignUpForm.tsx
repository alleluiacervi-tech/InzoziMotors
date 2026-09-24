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

const COUNTRY_CODES = [
  { code: '+250', flag: '🇷🇼', name: 'Rwanda (+250)' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya (+254)' },
  { code: '+256', flag: '🇺🇬', name: 'Uganda (+256)' },
  { code: '+255', flag: '🇹🇿', name: 'Tanzania (+255)' },
  { code: '+257', flag: '🇧🇮', name: 'Burundi (+257)' },
  { code: '+243', flag: '🇨🇩', name: 'DR Congo (+243)' },
  { code: '+211', flag: '🇸🇸', name: 'South Sudan (+211)' },
  { code: '+1', flag: '🇺🇸', name: 'USA / Canada (+1)' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom (+44)' },
  { code: '+86', flag: '🇨🇳', name: 'China (+86)' },
  { code: '+82', flag: '🇰🇷', name: 'South Korea (+82)' },
  { code: '+33', flag: '🇫🇷', name: 'France (+33)' },
  { code: '+971', flag: '🇦🇪', name: 'UAE (+971)' },
  { code: '+91', flag: '🇮🇳', name: 'India (+91)' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa (+27)' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria (+234)' },
]

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

      <Field label={t('auth.signup.phone') || 'Phone number'} htmlFor="phone" error={fieldErrors.phone}>
        <div className="flex gap-2">
          <select
            name="countryCode"
            defaultValue="+250"
            aria-label="Country calling code"
            className="h-12 rounded-xl border border-line bg-surface px-3 text-field sm:text-caption font-semibold text-content focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code}
              </option>
            ))}
          </select>
          <div className="flex-1">
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder={t('auth.signup.phonePlaceholder') || '0788 123 456'}
              error={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
            />
          </div>
        </div>
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
        <legend className="mb-2 block text-caption font-bold text-content-muted">
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
