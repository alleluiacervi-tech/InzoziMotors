'use server'

import { ApiError, cars, messages } from '@/lib/api'
import { getToken } from '@/lib/session'

export type ContactState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'done'; channel: 'phone' | 'whatsapp' | 'in_app'; contact: string | null; notice: string }

export async function contactSellerAction(
  _previous: ContactState,
  formData: FormData
): Promise<ContactState> {
  const carId = String(formData.get('car_id') || '').trim()
  const channel = String(formData.get('channel') || 'in_app') as 'phone' | 'whatsapp' | 'in_app'
  const message = String(formData.get('message') || '').trim().slice(0, 1000)
  const acknowledge = formData.get('acknowledge') === 'yes'

  if (!carId || !['phone', 'whatsapp', 'in_app'].includes(channel)) {
    return { status: 'error', message: 'Choose a valid contact method and try again.' }
  }
  if (!acknowledge) {
    return { status: 'error', message: 'Please acknowledge the direct-deal notice before contacting the seller.' }
  }
  if (channel === 'in_app' && message.length < 2) {
    return { status: 'error', message: 'Write a short message for the seller.' }
  }

  const token = await getToken()
  if (!token) return { status: 'error', message: 'Your session expired. Sign in again to contact the seller.' }

  try {
    const disclosure = await cars.contact(token, carId, channel, true)
    if (channel === 'in_app') {
      await messages.start(token, carId, message)
    }
    return { status: 'done', channel, contact: disclosure.contact, notice: disclosure.notice }
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) return { status: 'error', message: 'Your session expired. Sign in again to continue.' }
      if (error.status === 409) return { status: 'error', message: error.message }
      if (error.isNetworkError) return { status: 'error', message: 'We could not reach Sawa Cars. Please try again.' }
      return { status: 'error', message: error.message }
    }
    return { status: 'error', message: 'Something went wrong. Please try again.' }
  }
}
