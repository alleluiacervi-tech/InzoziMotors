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
      notice: string
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
    return { status: 'done', channel, contact: disclosure.contact, notice: disclosure.notice, conversationId }
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) return { status: 'error', message: t('cars.detail.contactForm.errorSession') }
      if (error.status === 409) return { status: 'error', message: error.message }
      if (error.isNetworkError) return { status: 'error', message: t('cars.detail.contactForm.errorNetwork') }
      return { status: 'error', message: error.message }
    }
    return { status: 'error', message: t('cars.detail.contactForm.errorGeneric') }
  }
}
