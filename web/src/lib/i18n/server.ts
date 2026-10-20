// Server-side locale access, for Server Components and route handlers.
//
// The locale lives in a cookie so the very first server render is already in
// the right language — no flash of English that a client-only store would give.
import { cookies } from 'next/headers'
import { getT, type TFunction } from './dictionary'
import { LOCALE_COOKIE, normalizeLocale, type Locale } from './config'

/** The active locale for this request, read from the cookie. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value)
}

/** The language the person actually chose with the switcher, or null if they
 *  never did (getLocale() answers English then). Only a real choice is worth
 *  telling the server about: a visitor who never picked one must not overwrite
 *  the language they set in the app. */
export async function getChosenLocale(): Promise<Locale | null> {
  const store = await cookies()
  const value = store.get(LOCALE_COOKIE)?.value
  return value ? normalizeLocale(value) : null
}

/** A translator for the current request's locale. Use in Server Components:
 *  `const t = await getServerT()`. */
export async function getServerT(): Promise<TFunction> {
  return getT(await getLocale())
}
