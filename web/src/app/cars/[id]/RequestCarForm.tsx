'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Alert, Button, Icon } from '@/components/ui'
import { useT } from '@/lib/i18n/context'
import { contactSellerAction, type ContactState } from './actions'

type Availability = { phone: boolean; whatsapp: boolean; in_app: boolean }

export function RequestCarForm({ carId, available }: { carId: string; available?: Availability }) {
  const t = useT()
  const [state, action] = useActionState<ContactState, FormData>(contactSellerAction, { status: 'idle' })
  const channels = [
    { id: 'in_app', label: 'Message seller', icon: 'mail' as const, enabled: available?.in_app !== false },
    { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp' as const, enabled: !!available?.whatsapp },
    { id: 'phone', label: 'Phone', icon: 'phone' as const, enabled: !!available?.phone },
  ].filter((item) => item.enabled)
  const [channel, setChannel] = useState(channels[0]?.id ?? 'in_app')

  // The phone bar links to #contact-<channel>; select that channel when the
  // hash arrives, whether on load or from a tap on the same page.
  useEffect(() => {
    const ids = channels.map((item) => item.id)
    const selectFromHash = () => {
      const wanted = window.location.hash.replace(/^#contact-/, '')
      if (ids.includes(wanted)) setChannel(wanted)
    }
    selectFromHash()
    window.addEventListener('hashchange', selectFromHash)
    return () => window.removeEventListener('hashchange', selectFromHash)
    // channels is rebuilt each render; its ids only change with `available`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available?.in_app, available?.whatsapp, available?.phone])

  if (state.status === 'done') {
    const href = state.channel === 'whatsapp' && state.contact
      ? `https://wa.me/${state.contact.replace(/\D/g, '')}`
      : state.channel === 'phone' && state.contact ? `tel:${state.contact}` : null
    return <div className="space-y-4">
      <Alert tone="success" title={state.channel === 'in_app' ? t('messages.contact.sentTitle') : 'Contact unlocked'}>
        {state.channel === 'in_app'
          ? t('messages.contact.sentBody')
          : 'The seller chose to make this contact channel available. You can now contact them directly.'}
      </Alert>
      {state.channel === 'in_app' && state.conversationId ? (
        <Button href={`/dashboard/messages/${state.conversationId}`} size="lg" fullWidth leadingIcon={<Icon name="mail" size={18} />}>
          {t('messages.contact.viewThread')}
        </Button>
      ) : href ? <Button href={href} target={state.channel === 'whatsapp' ? '_blank' : undefined} size="lg" fullWidth leadingIcon={<Icon name={state.channel === 'whatsapp' ? 'whatsapp' : 'phone'} size={18} />}>
        {state.channel === 'whatsapp' ? `Open WhatsApp${state.contact ? ` · ${state.contact}` : ''}` : `Call ${state.contact}`}
      </Button> : null}
      <p className="text-micro leading-relaxed text-content-muted">{state.notice}</p>
    </div>
  }

  return <form action={action} className="space-y-4">
    <input type="hidden" name="car_id" value={carId} />
    <fieldset>
      <legend className="text-caption font-bold text-content">How would you like to contact the seller?</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
        {channels.map((item) => <label key={item.id} id={`contact-${item.id}`} className="flex cursor-pointer scroll-mt-[calc(var(--header-h)+24px)] items-center gap-3 rounded-xl border border-line-soft px-3 py-3 text-caption font-bold text-content has-[:checked]:border-brand has-[:checked]:bg-brand-tint">
          <input type="radio" name="channel" value={item.id} checked={channel === item.id} onChange={() => setChannel(item.id)} className="accent-brand" />
          <Icon name={item.icon} size={17} />{item.label}
        </label>)}
      </div>
    </fieldset>
    <label className="block text-caption font-bold text-content">Message
      <textarea name="message" rows={3} defaultValue="Hi, is this vehicle still available?" maxLength={1000}
        className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 font-normal outline-none focus:border-brand" />
      <span className="mt-1 block text-micro font-normal text-content-muted">Used for the chat on Sawa Cars; ignored when you choose phone or WhatsApp.</span>
    </label>
    <label className="flex items-start gap-3 rounded-xl bg-surface-alt p-3 text-micro leading-relaxed text-content-secondary">
      <input type="checkbox" name="acknowledge" value="yes" className="mt-0.5 h-4 w-4 shrink-0 accent-brand" />
      <span>I understand Sawa Cars provides listing and inspection information but is not a party to any negotiation, contract, payment, delivery or dispute between me and the seller.</span>
    </label>
    {state.status === 'error' ? <Alert tone="danger">{state.message}</Alert> : null}
    <SubmitButton />
  </form>
}

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useT()
  return <Button type="submit" size="lg" fullWidth disabled={pending} trailingIcon={pending ? undefined : <Icon name="arrow-right" size={18} />}>
    {pending ? t('cars.detail.connecting') : t('cars.detail.contactSeller')}
  </Button>
}

export default RequestCarForm
