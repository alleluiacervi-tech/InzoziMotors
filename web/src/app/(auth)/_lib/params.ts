// Search-param helpers for the account pages. In Next 15 `searchParams` is a
// promise of a record whose values may be arrays — a repeated `?next=` gives
// `string[]` — so every read goes through `first()` rather than a cast.

export type SearchParams = Promise<Record<string, string | string[] | undefined>>

export function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

/** Sending a signed-in user "back" to an account page bounces them forever. */
const LOOPS = ['/signin', '/signup', '/forgot-password']

/**
 * Same rule as `safeNext` in actions/auth.ts: only same-origin paths survive, so
 * `?next=https://evil.example` cannot turn the sign-in page into an open
 * redirect. Duplicated deliberately — the server action must not trust the page,
 * and the page must not trust the URL.
 */
export function safePath(value: string, fallback = '/dashboard'): string {
  if (!value.startsWith('/') || value.startsWith('//')) return fallback
  if (LOOPS.some((path) => value === path || value.startsWith(`${path}?`))) return fallback
  return value
}
