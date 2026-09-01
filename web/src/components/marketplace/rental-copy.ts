import type { IconName } from '@/components/ui'

// Provider-stated features. The detail page labels this list clearly; Sawa does
// not turn provider information into a platform guarantee. Labels are i18n keys
// (rentals.includes.*) resolved by the consuming Server Component.
export const RENTAL_INCLUDES: { icon: IconName; labelKey: string }[] = [
  { icon: 'shield-check', labelKey: 'rentals.includes.insurance' },
  { icon: 'settings', labelKey: 'rentals.includes.roadside' },
  { icon: 'gauge', labelKey: 'rentals.includes.unlimitedKm' },
  { icon: 'sparkles', labelKey: 'rentals.includes.cleaned' },
]

/** Sensible preparation; exact requirements come from the provider's contract.
 *  Values are i18n keys (rentals.requirements.*). */
export const RENTAL_REQUIREMENTS = [
  'rentals.requirements.licence',
  'rentals.requirements.id',
  'rentals.requirements.payment',
]
