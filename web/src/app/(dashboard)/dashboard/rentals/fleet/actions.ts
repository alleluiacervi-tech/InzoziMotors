'use server'

import { revalidatePath } from 'next/cache'
import { describeError } from '@/components/dashboard/data'
import type { ActionState } from '@/components/dashboard/types'
import { ApiError, rentals } from '@/lib/api'
import { getToken } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'

// Provider self-serve — the mutations backing /dashboard/rentals/fleet.
// Validation here mirrors backend/src/routes/rentals.js exactly (propose and
// PATCH .../mine), so a value that passes on screen never fails on the server.

function numberField(formData: FormData, name: string): number | undefined {
  const raw = formData.get(name)
  if (raw === null || raw === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : NaN
}

export async function proposeRentalAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getServerT()
  const inspectionId = String(formData.get('inspection_id') || '')
  const make = String(formData.get('make') || '')
  const model = String(formData.get('model') || '')
  const year = String(formData.get('year') || '')
  const title = String(formData.get('title') || '').trim()
  const dailyRate = numberField(formData, 'daily_rate')
  const imagesRaw = String(formData.get('images') || '')
  const images = imagesRaw.split('\n').map((line) => line.trim()).filter(Boolean)

  const fieldErrors: Record<string, string> = {}
  // The inspection is optional now: without one, adding the car asks Sawa for
  // its Rental Check (POST /rentals/propose). With one, the vehicle identity
  // comes from it, as before.
  if (!inspectionId && (!make.trim() || !model.trim() || !/^\d{4}$/.test(year))) {
    fieldErrors.vehicle = t('dashboard.rentalFleet.propose.errors.vehicle')
  }
  if (!title) fieldErrors.title = t('dashboard.rentalFleet.propose.errors.titleRequired')
  if (!dailyRate || dailyRate <= 0 || Number.isNaN(dailyRate)) fieldErrors.daily_rate = t('dashboard.rentalFleet.propose.errors.dailyRate')
  // Photos are optional here: they can be uploaded from the fleet list after
  // the car is added, and it cannot be published without one.
  if (Object.keys(fieldErrors).length) return { fieldErrors }

  const token = await getToken()
  if (!token) return { error: t('dashboard.errors.sessionExpired') }

  try {
    await rentals.propose(token, {
      inspection_id: inspectionId || undefined,
      make: make.trim(), model: model.trim(), year: Number(year),
      title,
      category: String(formData.get('category') || '') || undefined,
      seats: numberField(formData, 'seats'),
      fuel: String(formData.get('fuel') || '') || undefined,
      transmission: String(formData.get('transmission') || '') || undefined,
      mileage: numberField(formData, 'mileage'),
      daily_rate: dailyRate,
      weekly_rate: numberField(formData, 'weekly_rate'),
      deposit: numberField(formData, 'deposit') ?? 0,
      min_days: numberField(formData, 'min_days') ?? 1,
      location: String(formData.get('location') || '') || undefined,
      images,
    })
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) return { error: err.message }
    return { error: describeError(err, t('dashboard.rentalFleet.propose.errors.failed')) }
  }

  revalidatePath('/dashboard/rentals/fleet')
  return { ok: true, message: t('dashboard.rentalFleet.propose.success') }
}

export async function updateRentalTermsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getServerT()
  const id = String(formData.get('id') || '')
  if (!id) return { error: t('dashboard.errors.sessionExpired') }

  const dailyRate = numberField(formData, 'daily_rate')
  const fieldErrors: Record<string, string> = {}
  if (dailyRate !== undefined && (Number.isNaN(dailyRate) || dailyRate <= 0)) {
    fieldErrors.daily_rate = t('dashboard.rentalFleet.propose.errors.dailyRate')
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors }

  const token = await getToken()
  if (!token) return { error: t('dashboard.errors.sessionExpired') }

  try {
    await rentals.updateMine(token, id, {
      title: String(formData.get('title') || '').trim() || undefined,
      daily_rate: dailyRate,
      weekly_rate: numberField(formData, 'weekly_rate'),
      deposit: numberField(formData, 'deposit'),
      min_days: numberField(formData, 'min_days'),
      location: String(formData.get('location') || '') || undefined,
    })
  } catch (err) {
    return { error: describeError(err, t('dashboard.rentalFleet.edit.errors.failed')) }
  }

  revalidatePath('/dashboard/rentals/fleet')
  return { ok: true, message: t('dashboard.rentalFleet.edit.success') }
}

// ─── Rental Check and calendar ───────────────────────────────────────────────
// Small form actions: each changes one thing and re-renders the fleet page,
// which is the source of truth for what the provider sees next.

async function fleetAction(
  run: (token: string) => Promise<unknown>,
  failedKey: string,
  okKey: string
): Promise<ActionState> {
  const t = await getServerT()
  const token = await getToken()
  if (!token) return { error: t('dashboard.errors.sessionExpired') }
  try {
    await run(token)
  } catch (err) {
    return { error: err instanceof ApiError && err.status < 500 ? err.message : t(failedKey) }
  }
  revalidatePath('/dashboard/rentals/fleet')
  return { ok: true, message: t(okKey) }
}

export async function requestCheckAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get('id') || '')
  return fleetAction((token) => rentals.requestCheck(token, id), 'dashboard.rentalFleet.check.failedAction', 'dashboard.rentalFleet.check.requested')
}

export async function markTakenAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get('id') || '')
  const from = String(formData.get('starts_on') || '')
  const to = String(formData.get('ends_on') || '') || from
  return fleetAction((token) => rentals.markTaken(token, id, from, to), 'dashboard.rentalFleet.calendar.failed', 'dashboard.rentalFleet.calendar.saved')
}

export async function removePeriodAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get('id') || '')
  const periodId = String(formData.get('period_id') || '')
  return fleetAction((token) => rentals.removePeriod(token, id, periodId), 'dashboard.rentalFleet.calendar.failed', 'dashboard.rentalFleet.calendar.saved')
}

/** "Back today": the period ends yesterday, so today shows the car home. */
export async function backTodayAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get('id') || '')
  const periodId = String(formData.get('period_id') || '')
  const yesterday = String(formData.get('yesterday') || '')
  return fleetAction((token) => rentals.updatePeriod(token, id, periodId, { ends_on: yesterday }), 'dashboard.rentalFleet.calendar.failed', 'dashboard.rentalFleet.calendar.saved')
}

export async function confirmCalendarAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get('id') || '')
  return fleetAction((token) => rentals.confirmCalendar(token, id), 'dashboard.rentalFleet.calendar.failed', 'dashboard.rentalFleet.calendar.saved')
}
