// Message section: marketing. One subtree per locale, all sharing the shape of `en`.
// English is complete first; other locales fall back to it per missing key.
import type { Locale } from '../config'

export const marketing: Record<Locale, Record<string, unknown>> = {
  en: {},
  rw: {},
  fr: {},
  sw: {},
  ko: {},
}
