import type { IconName } from '@/components/ui'

// What every rental includes. Ported from RENTAL_INCLUDES in
// src/data/rentals.js so the website promises exactly what the app promises —
// change both in the same commit.
export const RENTAL_INCLUDES: { icon: IconName; label: string }[] = [
  { icon: 'shield-check', label: 'Comprehensive insurance' },
  { icon: 'settings', label: '24/7 roadside assistance' },
  { icon: 'gauge', label: 'Unlimited kilometres' },
  { icon: 'sparkles', label: 'Cleaned and sanitised between trips' },
]

/** What a renter must bring. Mirrors the booking notification the backend sends
 *  (routes/rentals.js): licence, ID, and payment at the center. */
export const RENTAL_REQUIREMENTS = [
  'A valid driving licence, held for at least two years',
  'Your national ID or passport',
  'The deposit, paid at the center on pickup and returned after the return check',
]
