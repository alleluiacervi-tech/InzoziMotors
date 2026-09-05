// Web i18n — shared configuration.
//
// Mirrors the mobile app's language set (src/i18n/index.js) so the website and
// the app speak the same languages with the same codes. English is the source
// and fallback: a missing translation never renders blank, and a new key can
// ship before every language is complete.

export type Locale = 'en' | 'rw' | 'fr' | 'sw' | 'ko' | 'zh'

export interface LanguageDef {
  code: Locale
  /** English name, for the secondary line in the switcher. */
  label: string
  /** The language's own name, shown first. */
  nativeLabel: string
  /** BCP-47 tag for <html lang> and Intl formatting. */
  locale: string
  /** Regional-indicator emoji. Renders as a flag on most mobile browsers and
   *  macOS; Windows has no flag glyphs, so the switcher also shows the code. */
  flag: string
}

export const LANGUAGES: LanguageDef[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', locale: 'en-RW', flag: '🇬🇧' },
  { code: 'rw', label: 'Kinyarwanda', nativeLabel: 'Kinyarwanda', locale: 'rw-RW', flag: '🇷🇼' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', locale: 'fr-RW', flag: '🇫🇷' },
  { code: 'sw', label: 'Swahili', nativeLabel: 'Kiswahili', locale: 'sw-KE', flag: '🇰🇪' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어', locale: 'ko-KR', flag: '🇰🇷' },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文', locale: 'zh-CN', flag: '🇨🇳' },
]

export const LOCALES: Locale[] = LANGUAGES.map((l) => l.code)
export const DEFAULT_LOCALE: Locale = 'en'

/** The cookie the switcher writes and the server layout reads. Not httpOnly —
 *  the client switcher sets it — but it carries no secret, only a language. */
export const LOCALE_COOKIE = 'sawa-lang'
/** A year; the choice is a durable preference, not a session thing. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as string[]).includes(value)
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE
}

export function languageFor(code: unknown): LanguageDef {
  const wanted = normalizeLocale(code)
  return LANGUAGES.find((l) => l.code === wanted) || LANGUAGES[0]
}
