'use server'

import { revalidatePath } from 'next/cache'
import { ApiError, submissions } from '@/lib/api'
import { getToken } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'

export type ScheduleResult = { ok: true } | { ok: false; error: string }

// G6 in docs/WEB-PARITY-PLAN.md. The backend owns every rule — ownership,
// schedulable status, date not in the past, "10:00 AM" format and the
// centre's daily capacity — so its message is shown as it comes, including
// "fully booked on …", which names the centre and the day.
export async function scheduleInspectionAction(
  submissionId: string,
  center: string,
  date: string,
  time: string
): Promise<ScheduleResult> {
  const t = await getServerT()
  if (!center || !date || !time) return { ok: false, error: t('onboarding.schedule.incomplete') }

  const token = await getToken()
  if (!token) return { ok: false, error: t('dashboard.errors.sessionExpired') }

  try {
    await submissions.schedule(token, submissionId, { center, date, time })
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, error: err.isNetworkError ? t('onboarding.submit.unreachable') : err.message }
    }
    return { ok: false, error: t('onboarding.schedule.failed') }
  }
  revalidatePath('/dashboard/selling')
  return { ok: true }
}
