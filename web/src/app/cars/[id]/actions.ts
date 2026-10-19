'use server'

import { ApiError, cars, messages } from '@/lib/api'
import { getServerT } from '@/lib/i18n/server'
import { getToken } from '@/lib/session'

export type ContactState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | {
      status: 'done'
      channel: 'phone' | 'whatsapp' | 'in_app'
      contact: string | null
      /** Set when channel is 'in_app' — G1 in docs/WEB-PARITY-PLAN.md: the
       *  website now has somewhere to send this to. */
      conversationId?: string
    }

export async function contactSellerAction(
  _previous: ContactState,
  formData: FormData
): Promise<ContactState> {
  const carId = String(formData.get('car_id') || '').trim()
  const channel = String(formData.get('channel') || 'in_app') as 'phone' | 'whatsapp' | 'in_app'
  const message = String(formData.get('message') || '').trim().slice(0, 1000)
  const acknowledge = formData.get('acknowledge') === 'yes'
  const t = await getServerT()

  if (!carId || !['phone', 'whatsapp', 'in_app'].includes(channel)) {
    return { status: 'error', message: t('cars.detail.contactForm.errorChannel') }
  }
  if (!acknowledge) {
    return { status: 'error', message: t('cars.detail.contactForm.errorAcknowledge') }
  }
  if (channel === 'in_app' && message.length < 2) {
    return { status: 'error', message: t('cars.detail.contactForm.errorMessage') }
  }

  const token = await getToken()
  if (!token) return { status: 'error', message: t('cars.detail.contactForm.errorSession') }

  try {
    const disclosure = await cars.contact(token, carId, channel, true)
    let conversationId: string | undefined
    if (channel === 'in_app') {
      const started = await messages.start(token, carId, message)
      conversationId = started.conversation.id
    }
    return { status: 'done', channel, contact: disclosure.contact, conversationId }
  } catch (error) {
    return { status: 'error', message: t(`cars.detail.contactForm.${contactErrorKey(error)}`) }
  }
}

// The API's error text is English; its status and code are not. Map those so
// the visitor reads the reason in their own language.
function contactErrorKey(error: unknown): string {
  if (!(error instanceof ApiError)) return 'errorGeneric'
  if (error.isNetworkError) return 'errorNetwork'
  switch (error.code) {
    case 'MARKETPLACE_TERMS_REQUIRED': return 'errorAcknowledge'
    case 'CONTACT_NOT_AVAILABLE': return 'channelUnavailable'
    case 'CONTACT_BLOCKED':
    case 'BLOCKED': return 'contactBlocked'
    case 'LISTING_NOT_FOUND': return 'listingGone'
    case 'CONTENT_REJECTED': return 'contentRejected'
  }
  if (error.status === 401) return 'errorSession'
  if (error.status === 404) return 'listingGone'
  if (error.status === 403) return 'contactBlocked'
  if (error.status === 409) return 'channelUnavailable'
  if (error.status === 428) return 'errorAcknowledge'
  if (error.status === 429) return 'tooMany'
  return 'errorGeneric'
}
