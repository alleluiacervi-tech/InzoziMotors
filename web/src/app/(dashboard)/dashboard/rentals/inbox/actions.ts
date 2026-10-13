'use server'

import { revalidatePath } from 'next/cache'
import { rentals } from '@/lib/api'
import { getToken } from '@/lib/session'

export async function markInquiryContacted(formData: FormData) {
  const id = String(formData.get('id') || '')
  const token = await getToken()
  if (!id || !token) return
  await rentals.updateInquiryStatus(token, id, 'contacted')
  revalidatePath('/dashboard/rentals/inbox')
}

export async function markInquiryClosed(formData: FormData) {
  const id = String(formData.get('id') || '')
  const token = await getToken()
  if (!id || !token) return
  await rentals.updateInquiryStatus(token, id, 'closed')
  revalidatePath('/dashboard/rentals/inbox')
}

/** "Rented out for these dates": the provider agreed this request with the
 *  renter, so its days are marked taken on the car's calendar and it closes.
 *  The calendar stores no link to the renter (backend migration 0061). */
export async function markRentedOut(formData: FormData) {
  const id = String(formData.get('id') || '')
  const token = await getToken()
  if (!id || !token) return
  await rentals.rentedOut(token, id).catch((err) => {
    console.error('rented-out failed:', (err as Error).message)
  })
  revalidatePath('/dashboard/rentals/inbox')
  revalidatePath('/dashboard/rentals/fleet')
}
