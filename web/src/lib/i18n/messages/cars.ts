// Message section: cars. One subtree per locale, all sharing the shape of `en`.
// English is complete first; other locales fall back to it per missing key.
import type { Locale } from '../config'

export const cars: Record<Locale, Record<string, unknown>> = {
  en: {},
  rw: {},
  fr: {},
  sw: {},
  ko: {},
}
