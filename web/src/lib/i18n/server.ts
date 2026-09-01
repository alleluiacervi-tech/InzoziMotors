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

/** A translator for the current request's locale. Use in Server Components:
 *  `const t = await getServerT()`. */
export async function getServerT(): Promise<TFunction> {
  return getT(await getLocale())
}
