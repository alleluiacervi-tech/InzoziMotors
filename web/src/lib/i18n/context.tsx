'use client'

// Client-side locale, for Client Components.
//
// Seeded from the server-resolved locale (passed into the provider in the root
// layout), so the first client render matches the server and there is no
// hydration mismatch. Changing language writes the cookie, updates <html lang>,
// and refreshes server components so their translated strings re-render too.
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getT, type TFunction } from './dictionary'
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  normalizeLocale,
  type Locale,
} from './config'

interface LocaleContextValue {
  locale: Locale
  setLocale: (next: Locale) => void
  t: TFunction
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale
  children: React.ReactNode
}) {
  const [locale, setLocaleState] = useState<Locale>(normalizeLocale(initialLocale))
  const router = useRouter()

  const setLocale = useCallback(
    (next: Locale) => {
      const code = normalizeLocale(next)
      setLocaleState(code)
      try {
        document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`
        document.documentElement.lang = code
      } catch {
        /* cookies disabled — the in-memory state still switches this session */
      }
      // Server Components read the cookie, so re-fetch them to pick up the new
      // language. refresh() keeps client state (open menus, scroll) in place.
      router.refresh()
    },
    [router],
  )

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: getT(locale) }),
    [locale, setLocale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  // Fail open: a client component rendered outside the provider still works in
  // English rather than throwing.
  return ctx ?? { locale: DEFAULT_LOCALE, setLocale: () => {}, t: getT(DEFAULT_LOCALE) }
}

/** Translator hook for Client Components: `const t = useT()`. */
export function useT(): TFunction {
  return useLocaleContext().t
}

/** The active locale and a setter, for the language switcher. */
export function useLocale(): { locale: Locale; setLocale: (next: Locale) => void } {
  const { locale, setLocale } = useLocaleContext()
  return { locale, setLocale }
}
