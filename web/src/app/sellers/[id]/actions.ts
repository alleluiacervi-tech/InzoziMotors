'use server'

import { ApiError, reviews } from '@/lib/api'
import { getToken } from '@/lib/session'

// G10 in docs/WEB-PARITY-PLAN.md. The reason is sent as the app sends it — the
// English label — so the moderation queue reads the same whichever client
// filed the report.
const REASONS: Record<string, string> = {
  scam: 'Scam or fraud',
  harassment: 'Harassment or abuse',
  spam: 'Spam',
  other: 'Something else',
}

export type ReportReviewResult = { ok: true } | { ok: false; signIn?: boolean; error?: string }

export async function reportReviewAction(reviewId: string, reasonKey: string): Promise<ReportReviewResult> {
  const reason = REASONS[reasonKey]
  if (!reason) return { ok: false }
  const token = await getToken()
  if (!token) return { ok: false, signIn: true }
  try {
    await reviews.report(token, reviewId, reason)
    return { ok: true }
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return { ok: false, signIn: true }
    return { ok: false, error: err instanceof ApiError && !err.isNetworkError ? err.message : undefined }
  }
}
