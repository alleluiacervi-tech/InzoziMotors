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
