'use server'

import { ApiError, rentals } from '@/lib/api'
import { getToken } from '@/lib/session'

export type RentalInquiryState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'done'; reference: string; contact: string | null; channel: 'in_app' | 'phone' | 'whatsapp'; notice: string }

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
  if (!rentalId || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { status: 'error', message: 'Choose a valid start date.' }
  if (!Number.isInteger(days) || days < 1 || days > 365) return { status: 'error', message: 'Rental length must be between 1 and 365 days.' }
  if (formData.get('acknowledge') !== 'yes') return { status: 'error', message: 'Acknowledge the direct-provider notice to continue.' }
  const token = await getToken()
  if (!token) return { status: 'error', message: 'Your session expired. Sign in again to send the inquiry.' }
  try {
    const result = await rentals.inquire(token, rentalId, {
      start_date: startDate, days, pickup_location: pickup || undefined,
      message: message || undefined, preferred_channel: channel, acknowledge: true,
    })
    return { status: 'done', reference: result.inquiry_ref, contact: result.contact || null, channel, notice: result.notice }
  } catch (error) {
    if (error instanceof ApiError) return { status: 'error', message: error.message }
    return { status: 'error', message: 'The inquiry could not be sent. Please try again.' }
  }
}
