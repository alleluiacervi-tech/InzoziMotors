import { NextResponse, type NextRequest } from 'next/server'
import { notificationTarget } from '@/components/dashboard/meta'
import type { AppNotification } from '@/lib/types'

// Where a tap on a browser notification lands (public/sw.js opens this URL).
// The push payload carries only a type and ids; the destination is decided
// here, by the same notificationTarget() the notifications page uses, so the
// two can never disagree. The middleware sends a signed-out visitor to sign in
// and back.

const ID_KEYS = ['conversationId', 'carId', 'submissionId', 'importOrderId', 'inquiryId', 'bookingId', 'disputeId']
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/

export function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const meta: Record<string, string> = {}
  for (const key of ID_KEYS) {
    const value = params.get(key)
    if (value && SAFE_ID.test(value)) meta[key] = value
  }
  const target = notificationTarget({ type: params.get('type') ?? '', meta } as unknown as AppNotification)
  return NextResponse.redirect(new URL(target?.href ?? '/dashboard/notifications', req.url))
}
