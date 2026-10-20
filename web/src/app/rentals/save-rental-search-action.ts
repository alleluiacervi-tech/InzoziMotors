'use server'

import { revalidatePath } from 'next/cache'
import { describeError } from '@/components/dashboard/data'
import type { ActionState } from '@/components/dashboard/types'
import { saved } from '@/lib/api'
import { getToken } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'

// Saves "tell me when a new car for hire is listed" (optionally one category) as
// an alert. The same endpoint and filter shape the app uses (POST /saved-searches
// with listingType 'rental'); backend/src/lib/rental-alerts.js announces a match.
export async function saveRentalSearchAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getServerT()
  const token = await getToken()
  if (!token) return { error: t('dashboard.errors.sessionExpired') }

  const category = String(formData.get('category') ?? '').trim().slice(0, 60)
  const label = category
    ? t('cars.saveSearch.promptRentalCategory', { category })
    : t('cars.saveSearch.promptRental')

  try {
    await saved.createSearch(token, label, { listingType: 'rental', ...(category ? { category } : {}) })
  } catch (err) {
    return { error: describeError(err, t('cars.saveSearch.failed')) }
  }
  revalidatePath('/dashboard/saved')
  return { ok: true, message: t('cars.saveSearch.saved') }
}
