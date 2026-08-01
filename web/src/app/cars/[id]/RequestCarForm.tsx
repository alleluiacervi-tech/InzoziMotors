'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Alert, Button, Field, Icon, Input } from '@/components/ui'
import { requestCarAction, type RequestState } from './actions'

/**
 * The buy CTA. Deliberately small: one optional phone number and one button,
 * because the request itself commits a buyer to nothing. Everything that
 * follows — the slot, the paperwork, the money — happens with a person at a
 * center, so this form's real job is to say that clearly.
 */
export function RequestCarForm({ carId, phone }: { carId: string; phone?: string | null }) {
  const [state, formAction] = useActionState<RequestState, FormData>(requestCarAction, {
    status: 'idle',
  })

  if (state.status === 'done') {
    return (
      <div className="space-y-4">
        <Alert tone="success" title="Request received">
          The car is reserved for you under booking {state.bookingId}. Sawa Cars will
          contact you on WhatsApp within 24 hours to agree a handover time at the
          center that suits you.
        </Alert>
        <Button href="/dashboard" variant="outline" fullWidth>
          Track this request
        </Button>
        <p className="text-micro leading-relaxed text-content-muted">
          Cancelling before handover is always free, and the car goes back on the
          marketplace when you do.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="car_id" value={carId} />

      <Field
        label="Phone number"
        htmlFor="contact_phone"
        hint="We coordinate handovers on WhatsApp. Leave it blank to use the number on your account."
      >
        <Input
          id="contact_phone"
          name="contact_phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={phone ?? ''}
          placeholder="+250 788 000 000"
        />
      </Field>

      {state.status === 'error' ? <Alert tone="danger">{state.message}</Alert> : null}

      <SubmitButton />

      <p className="text-micro leading-relaxed text-content-muted">
        No payment now, and none in the app. You pay at the center on handover
        day, once you have seen the car and the documents.
      </p>
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      size="lg"
      fullWidth
      disabled={pending}
      trailingIcon={pending ? undefined : <Icon name="arrow-right" size={18} />}
    >
      {pending ? 'Sending your request…' : 'Request this car'}
    </Button>
  )
}

export default RequestCarForm
