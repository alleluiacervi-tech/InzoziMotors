'use server'

import { revalidatePath } from 'next/cache'
import { describeError } from '@/components/dashboard/data'
import type { ActionState } from '@/components/dashboard/types'
import { saved } from '@/lib/api'
import { getToken } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'
import { saveSearchLabel, toSavedSearchFilters } from '@/components/marketplace/save-search'
import type { Filters } from '@/components/marketplace/query'

// Saves the /cars view a buyer is looking at as an alert. The same endpoint
// and the same filter shape the app uses (POST /saved-searches), so a match is
// announced by backend/src/lib/alerts.js whichever client created it.
export async function saveSearchAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getServerT()
  const token = await getToken()
  if (!token) return { error: t('dashboard.errors.sessionExpired') }

  const filters: Filters = {}
  for (const field of ['make', 'model', 'body_type', 'max_price', 'q'] as const) {
    const value = String(formData.get(field) ?? '').trim().slice(0, 80)
    if (value) filters[field] = value
  }
  const payload = toSavedSearchFilters(filters)
  if (!Object.keys(payload).length) return { error: t('cars.saveSearch.failed') }

  try {
    await saved.createSearch(token, saveSearchLabel(t, filters), payload)
  } catch (err) {
    return { error: describeError(err, t('cars.saveSearch.failed')) }
  }
  revalidatePath('/dashboard/saved')
  return { ok: true, message: t('cars.saveSearch.saved') }
}
