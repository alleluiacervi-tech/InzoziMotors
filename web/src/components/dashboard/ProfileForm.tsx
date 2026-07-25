'use client'

import { useActionState } from 'react'
import { updateProfileAction } from '@/app/(dashboard)/dashboard/profile/actions'
import { SubmitButton } from '@/components/dashboard/SubmitButton'
import { Alert, Field, Input, LiveRegion } from '@/components/ui'

export function ProfileForm({
  name,
  phone,
  email,
}: {
  name: string
  phone: string
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
        hint="How our team reaches you on WhatsApp to arrange a handover. Leave it blank to keep the number already on your account."
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
