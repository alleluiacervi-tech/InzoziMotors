'use server'

import { ApiError, rentals } from '@/lib/api'
import { getServerT } from '@/lib/i18n/server'
import { getToken } from '@/lib/session'

export type RentalInquiryState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | {
      status: 'done'
      reference: string
      contact: string | null
      channel: 'in_app' | 'phone' | 'whatsapp'
      /** The thread this request opened, to continue in Messages. */
      conversationId: string | null
      /** A ready WhatsApp message carrying the reference. */
      whatsappText: string | null
      /** Requested days the provider marked taken: a warning, never a refusal. */
      busyOverlap: { from: string; to: string }[]
    }

export async function sendRentalInquiryAction(
  _previous: RentalInquiryState,
  formData: FormData
): Promise<RentalInquiryState> {
  const rentalId = String(formData.get('rental_id') || '')
  const channel = String(formData.get('preferred_channel') || 'in_app') as 'in_app' | 'phone' | 'whatsapp'
  const startDate = String(formData.get('start_date') || '')
  const days = Number(formData.get('days') || 0)
  const pickup = String(formData.get('pickup_location') || '').trim()
  const message = String(formData.get('message') || '').trim()
  const t = await getServerT()
  if (!rentalId || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { status: 'error', message: t('rentals.inquiry.errorStartDate') }
  if (!Number.isInteger(days) || days < 1 || days > 365) return { status: 'error', message: t('rentals.inquiry.errorDays') }
  if (formData.get('acknowledge') !== 'yes') return { status: 'error', message: t('rentals.inquiry.errorAcknowledge') }
  const token = await getToken()
  if (!token) return { status: 'error', message: t('rentals.inquiry.errorSession') }
  try {
    const result = await rentals.inquire(token, rentalId, {
      start_date: startDate, days, pickup_location: pickup || undefined,
      message: message || undefined, preferred_channel: channel,
      share_contact: formData.get('share_contact') === 'yes',
      acknowledge: true,
    })
    return {
      status: 'done', reference: result.inquiry_ref, contact: result.contact || null, channel,
      conversationId: result.conversation_id ?? null,
      whatsappText: result.whatsapp_text ?? null,
      busyOverlap: result.busy_overlap ?? [],
    }
  } catch (error) {
    return { status: 'error', message: t(`rentals.inquiry.${inquiryErrorKey(error)}`) }
  }
}

// The API's error text is English; its status and code are not. Map those so
// the renter reads the reason in their own language.
function inquiryErrorKey(error: unknown): string {
  if (!(error instanceof ApiError)) return 'errorGeneric'
  if (error.isNetworkError) return 'errorNetwork'
  switch (error.code) {
    case 'INVALID_START_DATE': return 'errorStartDate'
    case 'INVALID_DAYS': return 'errorDays'
    case 'MARKETPLACE_TERMS_REQUIRED': return 'errorAcknowledge'
    case 'CONTACT_NOT_AVAILABLE': return 'channelUnavailable'
    case 'CONTACT_BLOCKED':
    case 'BLOCKED': return 'contactBlocked'
    case 'RENTAL_NOT_FOUND': return 'rentalGone'
    case 'OWN_RENTAL': return 'ownRental'
    case 'CONTENT_REJECTED': return 'contentRejected'
  }
  if (error.status === 401) return 'errorSession'
  if (error.status === 404) return 'rentalGone'
  if (error.status === 403) return 'contactBlocked'
  if (error.status === 409) return 'channelUnavailable'
  if (error.status === 428) return 'errorAcknowledge'
  if (error.status === 429) return 'tooMany'
  return 'errorGeneric'
}
