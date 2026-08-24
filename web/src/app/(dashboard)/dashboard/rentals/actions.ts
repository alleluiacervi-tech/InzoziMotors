'use server'

import { revalidatePath } from 'next/cache'
import { rentals } from '@/lib/api'
import { getToken } from '@/lib/session'

export async function cancelRentalInquiry(formData: FormData) {
  const id = String(formData.get('id') || '')
  const token = await getToken()
  if (!id || !token) return
  await rentals.updateInquiry(token, id, 'cancelled')
  revalidatePath('/dashboard/rentals')
  revalidatePath('/dashboard')
}
