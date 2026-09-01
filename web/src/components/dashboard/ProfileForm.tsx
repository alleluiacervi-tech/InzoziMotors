'use client'

import { useActionState } from 'react'
import { updateProfileAction } from '@/app/(dashboard)/dashboard/profile/actions'
import { SubmitButton } from '@/components/dashboard/SubmitButton'
import { Alert, Field, Input, LiveRegion } from '@/components/ui'
import { useT } from '@/lib/i18n/context'

export function ProfileForm({
  name,
  phone,
  whatsapp,
  phoneVisible,
  whatsappVisible,
  email,
}: {
  name: string
  phone: string
  whatsapp: string
  phoneVisible: boolean
  whatsappVisible: boolean
  email: string
}) {
  const t = useT()
  const [state, action] = useActionState(updateProfileAction, null)

  return (
    <form action={action} className="space-y-5">
      <Field label={t('dashboard.profile.form.fullName')} htmlFor="profile-name" error={state?.fieldErrors?.name} required>
        <Input
          id="profile-name"
          name="name"
          type="text"
          autoComplete="name"
          defaultValue={name}
          required
          error={Boolean(state?.fieldErrors?.name)}
        />
      </Field>

      <Field
        label={t('dashboard.profile.form.phone')}
        htmlFor="profile-phone"
        hint={t('dashboard.profile.form.phoneHint')}
        error={state?.fieldErrors?.phone}
      >
        <Input
          id="profile-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+250 788 123 456"
          defaultValue={phone}
          error={Boolean(state?.fieldErrors?.phone)}
        />
      </Field>

      <Field label={t('dashboard.profile.form.whatsapp')} htmlFor="profile-whatsapp" hint={t('dashboard.profile.form.whatsappHint')} error={state?.fieldErrors?.whatsapp_phone}>
        <Input id="profile-whatsapp" name="whatsapp_phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+250 788 123 456" defaultValue={whatsapp} error={Boolean(state?.fieldErrors?.whatsapp_phone)} />
      </Field>

      <fieldset className="space-y-3 rounded-xl border border-line-soft bg-surface-alt p-4">
        <legend className="px-1 text-caption font-bold text-content">{t('dashboard.profile.form.consentLegend')}</legend>
        <p className="text-micro leading-relaxed text-content-muted">{t('dashboard.profile.form.consentBody')}</p>
        <label className="flex items-center gap-3 text-caption font-semibold text-content"><input type="checkbox" name="phone_visible" defaultChecked={phoneVisible} className="h-4 w-4 accent-brand" />{t('dashboard.profile.form.allowPhone')}</label>
        <label className="flex items-center gap-3 text-caption font-semibold text-content"><input type="checkbox" name="whatsapp_visible" defaultChecked={whatsappVisible} className="h-4 w-4 accent-brand" />{t('dashboard.profile.form.allowWhatsapp')}</label>
      </fieldset>

      <Field
        label={t('dashboard.profile.form.email')}
        htmlFor="profile-email"
        hint={t('dashboard.profile.form.emailHint')}
      >
        <Input id="profile-email" type="email" value={email} readOnly disabled />
      </Field>

      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}

      <SubmitButton pendingLabel={t('dashboard.profile.form.saving')}>{t('dashboard.profile.form.save')}</SubmitButton>
      <LiveRegion>{state?.ok ? state.message : state?.error ?? ''}</LiveRegion>
    </form>
  )
}

export default ProfileForm
