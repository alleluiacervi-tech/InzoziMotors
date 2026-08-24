'use client'

import { useActionState } from 'react'
import { updateProfileAction } from '@/app/(dashboard)/dashboard/profile/actions'
import { SubmitButton } from '@/components/dashboard/SubmitButton'
import { Alert, Field, Input, LiveRegion } from '@/components/ui'

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
  const [state, action] = useActionState(updateProfileAction, null)

  return (
    <form action={action} className="space-y-5">
      <Field label="Full name" htmlFor="profile-name" error={state?.fieldErrors?.name} required>
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
        label="Phone"
        htmlFor="profile-phone"
        hint="Your account phone. Sellers can separately choose whether acknowledged buyers may request it."
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

      <Field label="WhatsApp" htmlFor="profile-whatsapp" hint="Optional. Enter the full international number before enabling WhatsApp contact." error={state?.fieldErrors?.whatsapp_phone}>
        <Input id="profile-whatsapp" name="whatsapp_phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+250 788 123 456" defaultValue={whatsapp} error={Boolean(state?.fieldErrors?.whatsapp_phone)} />
      </Field>

      <fieldset className="space-y-3 rounded-xl border border-line-soft bg-surface-alt p-4">
        <legend className="px-1 text-caption font-bold text-content">Seller contact consent</legend>
        <p className="text-micro leading-relaxed text-content-muted">Enabled details are never placed in the public catalogue. They are disclosed only to a signed-in buyer who acknowledges the direct-deal notice, and the disclosure is recorded.</p>
        <label className="flex items-center gap-3 text-caption font-semibold text-content"><input type="checkbox" name="phone_visible" defaultChecked={phoneVisible} className="h-4 w-4 accent-brand" />Allow buyers to request my phone number</label>
        <label className="flex items-center gap-3 text-caption font-semibold text-content"><input type="checkbox" name="whatsapp_visible" defaultChecked={whatsappVisible} className="h-4 w-4 accent-brand" />Allow buyers to request my WhatsApp number</label>
      </fieldset>

      <Field
        label="Email"
        htmlFor="profile-email"
        hint="Your email is your sign-in and cannot be changed here. Contact support if you need it moved."
      >
        <Input id="profile-email" type="email" value={email} readOnly disabled />
      </Field>

      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}

      <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
      <LiveRegion>{state?.ok ? state.message : state?.error ?? ''}</LiveRegion>
    </form>
  )
}

export default ProfileForm
