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

  // The daily summary opens onto what it counted. Checked first: it carries
  // no ids, and the generic fallbacks below would send it nowhere useful.
  if (notification.type === 'daily_digest') {
    return { href: '/cars?new=today', labelKey: 'dashboard.notificationTarget.viewNewCars' }
  }

  // Highest priority, matching the app's resolveNotificationRoute — a message
  // notification always carries a conversationId, and the thread (not the
  // inbox, not the car it mentions) is the useful destination.
  const conversationId = readId(meta, 'conversationId')
  if (conversationId) {
    return { href: `/dashboard/messages/${conversationId}`, labelKey: 'dashboard.notificationTarget.viewConversation' }
  }

  const disputeId = readId(meta, 'disputeId')
  if (disputeId) return { href: '/dashboard', labelKey: 'dashboard.notificationTarget.viewAccount' }

  const bookingId = readId(meta, 'bookingId')
  if (bookingId) return { href: '/dashboard', labelKey: 'dashboard.notificationTarget.viewAccount' }

  const carId = readId(meta, 'carId')
  if (carId) return { href: `/cars/${carId}`, labelKey: 'dashboard.notificationTarget.viewCar' }

  const submissionId = readId(meta, 'submissionId')
  if (submissionId) return { href: '/dashboard/selling', labelKey: 'dashboard.notificationTarget.viewSubmission' }

  const importOrderId = readId(meta, 'importOrderId')
  if (importOrderId) return { href: `/dashboard/imports/${importOrderId}`, labelKey: 'dashboard.notificationTarget.viewImport' }

  // A saved search for cars for hire matched: the car's public page. (A
  // rentalCarId on its own, below, is a provider's own fleet car.)
  if (notification.type === 'search_match' && readId(meta, 'rentalCarId')) {
    return { href: `/rentals/${readId(meta, 'rentalCarId')}`, labelKey: 'dashboard.notificationTarget.viewCar' }
  }

  // A rental inquiry sent TO a provider: their inbox, as in the app.
  const inquiryId = readId(meta, 'inquiryId')
  if (inquiryId) return { href: '/dashboard/rentals/inbox', labelKey: 'dashboard.notificationTarget.viewInquiry' }

  // A Rental Check result about one of the provider's own cars.
  const rentalCarId = readId(meta, 'rentalCarId')
  if (rentalCarId) return { href: '/dashboard/rentals/fleet', labelKey: 'dashboard.notificationTarget.viewFleet' }

  return null
}
