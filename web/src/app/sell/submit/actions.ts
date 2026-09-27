'use server'

import { revalidatePath } from 'next/cache'
import { ApiError, submissions } from '@/lib/api'
import { getToken } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'

// G5 in docs/WEB-PARITY-PLAN.md. The checks mirror the backend's
// submissionFieldError() and the app's required fields, so a form that passes
// here isn't refused by the server for a rule the page never mentioned.

export interface SubmissionInput {
  make: string
  model: string
  year: number
  mileage: number
  fuel_type: string
  transmission: string
  body_type?: string
  color?: string
  asking_price?: number | null
  notes?: string
}

export type CreateSubmissionResult = { ok: true; id: string } | { ok: false; error: string }

/** Same as the app's tidy(): trim and collapse whitespace, never change case. */
const tidy = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ')

export async function createSubmissionAction(input: SubmissionInput): Promise<CreateSubmissionResult> {
  const t = await getServerT()

  const make = tidy(input.make)
  const model = tidy(input.model)
  const fuel = tidy(input.fuel_type)
  const transmission = tidy(input.transmission)
  if (!make || !model || !fuel || !transmission) return { ok: false, error: t('onboarding.submit.missing') }

  const year = Number(input.year)
  if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1) {
    return { ok: false, error: t('onboarding.submit.yearInvalid') }
  }
  const mileage = Number(input.mileage)
  if (!Number.isFinite(mileage) || mileage < 0) return { ok: false, error: t('onboarding.submit.mileageInvalid') }
  const price = input.asking_price == null ? 0 : Number(input.asking_price)
  if (!Number.isFinite(price) || price < 0) return { ok: false, error: t('onboarding.submit.priceInvalid') }

  const token = await getToken()
  if (!token) return { ok: false, error: t('dashboard.errors.sessionExpired') }

  try {
    const created = await submissions.create(token, {
      make,
      model,
      year,
      mileage: Math.round(mileage),
      fuel_type: fuel,
      transmission,
      body_type: tidy(input.body_type) || undefined,
      color: tidy(input.color) || undefined,
      asking_price: Math.round(price),
      // `notes`, not the app's `seller_notes`: the backend only stores this
      // one (B5 in docs/WEB-PARITY-PLAN.md §10.1).
      notes: String(input.notes ?? '').trim().slice(0, 2000) || undefined,
    })
    revalidatePath('/dashboard/selling')
    return { ok: true, id: created.id }
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, error: err.isNetworkError ? t('onboarding.submit.unreachable') : err.message }
    }
    return { ok: false, error: t('onboarding.submit.failed') }
  }
}
