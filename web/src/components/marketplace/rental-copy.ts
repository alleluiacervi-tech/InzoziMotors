import type { IconName } from '@/components/ui'

// Provider-stated features. The detail page labels this list clearly; Sawa does
// not turn provider information into a platform guarantee.
export const RENTAL_INCLUDES: { icon: IconName; label: string }[] = [
  { icon: 'shield-check', label: 'Comprehensive insurance' },
  { icon: 'settings', label: '24/7 roadside assistance' },
  { icon: 'gauge', label: 'Unlimited kilometres' },
  { icon: 'sparkles', label: 'Cleaned and sanitised between trips' },
]

/** Sensible preparation; exact requirements come from the provider's contract. */
export const RENTAL_REQUIREMENTS = [
  'A valid driving licence, held for at least two years',
  'Your national ID or passport',
  'The provider’s confirmed payment and deposit arrangements in writing',
]
