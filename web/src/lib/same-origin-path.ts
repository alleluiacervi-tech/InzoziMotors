// ─────────────────────────────────────────────────────────────────────────────
// The one test for "is this ?next= value a path on this site?"
//
// `startsWith('/') && !startsWith('//')` was the old rule, in two places, and
// it let `/\evil.com/…` through: browsers read a backslash in an http(s) URL as
// a slash, so that "path" is `//evil.com`, another site. After a real sign-in
// the user landed wherever the link's author chose — the ideal spot for a fake
// "session expired, sign in again" page.
//
// So the value is parsed the way a browser will parse it, against a base no
// real site uses, and only survives if it is still on that base. What comes
// back is rebuilt from the parsed parts, never the raw input.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = 'https://same-origin.invalid'

export function sameOriginPath(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return fallback
  // Backslashes and control characters (tab and newline are stripped by URL
  // parsers, which is how `/\t/evil.com` becomes `//evil.com`) have no place in
  // a path this site links to.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback
  try {
    const url = new URL(value, BASE)
    if (url.origin !== BASE) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
