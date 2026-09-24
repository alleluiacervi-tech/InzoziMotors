'use server'

import { redirect } from 'next/navigation'
import { ApiError, importOrders } from '@/lib/api'
import { getToken } from '@/lib/session'
import { IMPORT_ORIGINS } from './origins'

export type ImportRequestState =
  | { status: 'idle' }
  | { status: 'error'; code: 'required' | 'session' | 'failed'; message?: string }

/**
 * Creates an import enquiry (POST /imports) for the signed-in buyer and takes
 * them to the order in their dashboard, where the quote, agreement and
 * payments will appear. The website could not start an import at all before
 * this; only the app could.
 */
export async function requestImportAction(
  _previous: ImportRequestState,
  formData: FormData
): Promise<ImportRequestState> {
  const origin = String(formData.get('origin_country') || '')
  const make = String(formData.get('make') || '').trim().slice(0, 80)
  const model = String(formData.get('model') || '').trim().slice(0, 80)
  const yearRaw = String(formData.get('year') || '').trim()
  const notes = String(formData.get('customer_notes') || '').trim().slice(0, 2000)
  const year = yearRaw ? Number(yearRaw) : undefined

  if (!(IMPORT_ORIGINS as readonly string[]).includes(origin) || !make || !model) {
    return { status: 'error', code: 'required' }
  }
  if (year !== undefined && (!Number.isInteger(year) || year < 1980 || year > new Date().getFullYear() + 1)) {
    return { status: 'error', code: 'required' }
  }

  const token = await getToken()
  if (!token) return { status: 'error', code: 'session' }

  let orderId: string
  try {
    const order = await importOrders.create(token, {
      origin_country: origin,
      make,
      model,
      year,
      customer_notes: notes || undefined,
    })
    orderId = order.id
  } catch (error) {
    return {
      status: 'error',
      code: 'failed',
      message: error instanceof ApiError ? error.message : undefined,
    }
  }
  // Outside the try: redirect() works by throwing, and must not be caught.
  redirect(`/dashboard/imports/${orderId}`)
}
