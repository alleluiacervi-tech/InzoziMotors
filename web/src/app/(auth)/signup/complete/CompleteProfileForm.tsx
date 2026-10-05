'use client'

import { useActionState } from 'react'
import { completeProfileAction, type AuthState } from '@/app/actions/auth'
import { Alert, Field, Icon, Input } from '@/components/ui'
import { useT } from '@/lib/i18n/context'
import { SubmitButton } from '../../_components/SubmitButton'
import { COUNTRY_CODES, RoleCard } from '../SignUpForm'

// The two things Google and Apple cannot tell us: a phone number, and whether
// this person is here to buy or to sell. Same fields, same rules and the same
// look as the email sign-up, so the two ways in end in the same account.
export function CompleteProfileForm({ next, defaultRole }: { next: string; defaultRole: 'buyer' | 'seller' }) {
  const t = useT()
  const [state, formAction] = useActionState<AuthState, FormData>(completeProfileAction, null)
  const fieldErrors = state?.fieldErrors ?? {}

  return (
    <form action={formAction} noValidate className="space-y-5">
      <input type="hidden" name="next" value={next} />
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field label={t('auth.complete.phone')} htmlFor="phone" error={fieldErrors.phone} hint={t('auth.complete.phoneHint')}>
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
              autoFocus
              placeholder={t('auth.signup.phonePlaceholder')}
              error={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
            />
          </div>
        </div>
      </Field>

      <fieldset>
        <legend className="mb-2 block text-caption font-bold text-content-muted">{t('auth.signup.legend')}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <RoleCard value="buyer" icon="search" title={t('auth.signup.buyerTitle')} desc={t('auth.signup.buyerDesc')} defaultChecked={defaultRole === 'buyer'} />
          <RoleCard value="seller" icon="key" title={t('auth.signup.sellerTitle')} desc={t('auth.signup.sellerDesc')} defaultChecked={defaultRole === 'seller'} />
        </div>
        <p className="mt-3 flex gap-2 text-micro leading-relaxed text-content-muted">
          <Icon name="info" size={14} className="mt-px" />
          <span>{t('auth.signup.sellerNote')}</span>
        </p>
      </fieldset>

      <SubmitButton pendingLabel={t('auth.complete.submitting')}>{t('auth.complete.submit')}</SubmitButton>
    </form>
  )
}
