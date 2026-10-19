'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Alert, Button, Icon } from '@/components/ui'
import { useT } from '@/lib/i18n/context'
import { formatDay, kigaliToday } from '@/lib/rental-dates'
import { sendRentalInquiryAction, type RentalInquiryState } from './actions'

type Availability = { phone: boolean; whatsapp: boolean; in_app: boolean }

// The renter's availability request. It opens a conversation with the
// provider (continue in Messages), and optionally hands over to WhatsApp or a
// call. The renter's own number goes to the provider only if they choose
// WhatsApp or Phone, or tick the box: in Messages alone it stays private.
export function RentalInquiryForm({ rentalId, minDays, available }: { rentalId: string; minDays: number; available?: Availability }) {
  const t = useT()
  const [state, action] = useActionState<RentalInquiryState, FormData>(sendRentalInquiryAction, { status: 'idle' })
  if (state.status === 'done') {
    const whatsappHref = state.channel === 'whatsapp' && state.contact
      ? `https://wa.me/${state.contact.replace(/\D/g, '')}${state.whatsappText ? `?text=${encodeURIComponent(state.whatsappText)}` : ''}`
      : null
    const phoneHref = state.channel === 'phone' && state.contact ? `tel:${state.contact}` : null
    const overlap = state.busyOverlap
      .map((r) => (r.from === r.to ? formatDay(r.from) : `${formatDay(r.from)} – ${formatDay(r.to)}`))
      .join(', ')
    return (
      <div className="space-y-3">
        <Alert tone="success" title={t('rentals.inquiry.sentTitle')}>
          {t('rentals.inquiry.sentBody', { reference: state.reference })}
        </Alert>
        {overlap ? <Alert tone="warning">{t('rentals.inquiry.overlap', { dates: overlap })}</Alert> : null}
        {whatsappHref ? (
          <Button href={whatsappHref} target="_blank" fullWidth leadingIcon={<Icon name="whatsapp" size={18} />}>
            {t('rentals.inquiry.continueWhatsapp')}
          </Button>
        ) : null}
        {phoneHref ? (
          <Button href={phoneHref} fullWidth leadingIcon={<Icon name="phone" size={18} />}>{t('rentals.inquiry.call', { number: state.contact ?? '' })}</Button>
        ) : null}
        {state.conversationId ? (
          <Button href={`/dashboard/messages/${state.conversationId}`} variant={whatsappHref || phoneHref ? 'outline' : 'primary'} fullWidth leadingIcon={<Icon name="mail" size={18} />}>
            {t('rentals.inquiry.openChat')}
          </Button>
        ) : null}
        <p className="text-micro leading-relaxed text-content-muted">{t('rentals.inquiry.notice')}</p>
      </div>
    )
  }
  const channels = ([
    ['in_app', t('rentals.inquiry.channelInApp'), true], ['whatsapp', t('rentals.inquiry.channelWhatsapp'), !!available?.whatsapp], ['phone', t('rentals.inquiry.channelPhone'), !!available?.phone],
  ] as const).filter((item) => item[2])
  // Today in Kigali, the day the server checks against.
  const today = kigaliToday()
  return <form action={action} className="space-y-3">
    <input type="hidden" name="rental_id" value={rentalId} />
    <div className="grid grid-cols-2 gap-3"><label className="text-caption font-bold text-content">{t('rentals.inquiry.startDate')}<input name="start_date" type="date" min={today} required className="mt-1.5 h-11 w-full rounded-xl border border-line px-3 font-normal" /></label><label className="text-caption font-bold text-content">{t('rentals.inquiry.days')}<input name="days" type="number" min={minDays} max={365} defaultValue={minDays} required className="mt-1.5 h-11 w-full rounded-xl border border-line px-3 font-normal" /></label></div>
    <label className="block text-caption font-bold text-content">{t('rentals.inquiry.pickup')}<input name="pickup_location" placeholder={t('rentals.inquiry.pickupPlaceholder')} maxLength={200} className="mt-1.5 h-11 w-full rounded-xl border border-line px-3 font-normal" /></label>
    <label className="block text-caption font-bold text-content">{t('rentals.inquiry.message')}<textarea name="message" rows={2} placeholder={t('rentals.inquiry.messagePlaceholder')} maxLength={1500} className="mt-1.5 w-full rounded-xl border border-line px-3 py-2 font-normal" /></label>
    <fieldset><legend className="text-caption font-bold text-content">{t('rentals.inquiry.preferredReply')}</legend><div className="mt-2 flex flex-wrap gap-2">{channels.map(([id, label], index) => <label key={id} className="flex min-h-[44px] items-center rounded-xl border border-line-soft px-3 py-2 text-caption font-bold has-[:checked]:border-brand has-[:checked]:bg-brand-tint"><input type="radio" name="preferred_channel" value={id} defaultChecked={index === 0} className="mr-2 accent-brand" />{label}</label>)}</div></fieldset>
    <label className="flex items-start gap-2 text-micro leading-relaxed text-content-secondary"><input type="checkbox" name="share_contact" value="yes" className="mt-0.5 accent-brand" /><span>{t('rentals.inquiry.shareContact')}<span className="mt-0.5 block text-content-muted">{t('rentals.inquiry.shareContactHint')}</span></span></label>
    <label className="flex items-start gap-2 rounded-xl bg-surface-alt p-3 text-micro leading-relaxed text-content-secondary"><input type="checkbox" name="acknowledge" value="yes" className="mt-0.5 accent-brand" /><span>{t('rentals.inquiry.acknowledge')}</span></label>
    {state.status === 'error' ? <Alert tone="danger">{state.message}</Alert> : null}<Submit />
  </form>
}

function Submit() { const { pending } = useFormStatus(); const t = useT(); return <Button type="submit" size="lg" fullWidth disabled={pending}>{pending ? t('rentals.inquiry.sending') : t('rentals.inquiry.submit')}</Button> }
