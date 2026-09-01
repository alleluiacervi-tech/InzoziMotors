import type { AppNotification } from '@/lib/types'

// Notification `meta` is written by the backend as JSON (bookingId, carId,
// disputeId, submissionId) and comes back as an untyped object. These readers
// keep the unknown-shaped payload from leaking into JSX.

function readId(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = meta?.[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

/**
 * Where a notification points. Order is deliberate: a handover notification
 * carries both a bookingId and a carId, and the useful destination is the
 * request, not the listing it came from.
 */
export function notificationTarget(
  notification: AppNotification
): { href: string; labelKey: string } | null {
  const meta = notification.meta
  const disputeId = readId(meta, 'disputeId')
  if (disputeId) return { href: '/dashboard', labelKey: 'dashboard.notificationTarget.viewAccount' }

  const bookingId = readId(meta, 'bookingId')
  if (bookingId) return { href: '/dashboard', labelKey: 'dashboard.notificationTarget.viewAccount' }

  const carId = readId(meta, 'carId')
  if (carId) return { href: `/cars/${carId}`, labelKey: 'dashboard.notificationTarget.viewCar' }

  const submissionId = readId(meta, 'submissionId')
  if (submissionId) return { href: '/dashboard/selling', labelKey: 'dashboard.notificationTarget.viewSubmission' }

  return null
}
