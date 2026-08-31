// Message section: dashboard. One subtree per locale, all sharing the shape of `en`.
// English is complete first; other locales fall back to it per missing key.
import type { Locale } from '../config'

export const dashboard: Record<Locale, Record<string, unknown>> = {
  en: {},
  rw: {},
  fr: {},
  sw: {},
  ko: {},
}
