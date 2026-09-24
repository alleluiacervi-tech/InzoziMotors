'use client'

// Client-side locale, for Client Components.
//
// Seeded from the server-resolved locale (passed into the provider in the root
// layout), so the first client render matches the server and there is no
// hydration mismatch. Changing language writes the cookie, updates <html lang>,
// and refreshes server components so their translated strings re-render too.
//
// WHY THE BROWSER NO LONGER HOLDS THE CATALOGUE. This file used to import
// dictionary.ts, which put every string in all six languages — 657 KB raw,
// 220 KB gzipped — into a chunk every page loaded, on Rwandan mobile networks,
// for a visitor who reads one language. Now the server hands the provider only
// the active language, only the namespaces client components use, already
// merged over English (dictionary.ts `messagesFor`). The root layout supplies
// the chrome's namespaces; route layouts add theirs through <MessagesScope/>
// (see components/i18n/I18nScope.tsx). A key the client was not given renders
// as the key itself and warns in development, so a missing scope is loud.
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fill, lookup, type Messages, type TFunction } from './translate'
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
  messages: Messages
  t: TFunction
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function makeT(messages: Messages): TFunction {
  return (key, vars) => {
    const value = lookup(messages, key)
    if (value == null) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[i18n] "${key}" is not in this subtree's messages — add its namespace to an <I18nScope/>.`)
      }
      return key
    }
    return fill(value, vars)
  }
}

export function LanguageProvider({
  initialLocale,
  messages,
  children,
}: {
  initialLocale: Locale
  /** The chrome's namespaces for the active language, from `messagesFor`. */
  messages: Messages
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
      // language — including the messages this provider and every scope below
      // it are handed. refresh() keeps client state (open menus, scroll).
      router.refresh()
    },
    [router],
  )

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, messages, t: makeT(messages) }),
    [locale, setLocale, messages],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

/**
 * Adds a route's namespaces to the messages above it. Rendered by the server
 * component <I18nScope/>, never directly.
 */
export function MessagesScope({ messages, children }: { messages: Messages; children: React.ReactNode }) {
  const parent = useContext(LocaleContext)
  const value = useMemo<LocaleContextValue | null>(() => {
    if (!parent) return null
    const merged = { ...parent.messages, ...messages }
    return { ...parent, messages: merged, t: makeT(merged) }
  }, [parent, messages])
  if (!value) return <>{children}</>
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  // Fail open: a client component rendered outside the provider shows keys
  // rather than throwing.
  return ctx ?? { locale: DEFAULT_LOCALE, setLocale: () => {}, messages: {}, t: makeT({}) }
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
