'use server'

import { redirect } from 'next/navigation'
import { ApiError, importOrders } from '@/lib/api'
import { getToken } from '@/lib/session'

export type KoreanRequestState =
  | { status: 'idle' }
  | { status: 'error'; code: 'session' | 'gone' | 'failed'; message?: string }

/**
 * Requests one specific Korean car. The browser sends only the listing id: the
 * make, model, year and price are read from our own data on the server and
 * frozen into the order, so nothing the page showed can be edited on the way.
 */
export async function requestKoreanCarAction(
  _previous: KoreanRequestState,
  formData: FormData
): Promise<KoreanRequestState> {
  const id = String(formData.get('listing_id') || '').trim().slice(0, 40)
  if (!/^[A-Za-z0-9:_-]{1,40}$/.test(id)) return { status: 'error', code: 'failed' }

  const token = await getToken()
  if (!token) return { status: 'error', code: 'session' }

  let orderId: string
  try {
    orderId = (await importOrders.create(token, { encar_listing_id: id })).id
  } catch (error) {
    if (error instanceof ApiError) {
      // The same car requested twice: take them to the request they already have.
      if (error.code === 'ALREADY_REQUESTED' && typeof error.data?.order_id === 'string') {
        redirect(`/dashboard/imports/${error.data.order_id}`)
      }
      if (error.code === 'LISTING_GONE') return { status: 'error', code: 'gone' }
      return { status: 'error', code: 'failed', message: error.message }
    }
    return { status: 'error', code: 'failed' }
  }
  // Outside the try: redirect() works by throwing, and must not be caught.
  redirect(`/dashboard/imports/${orderId}`)
}
