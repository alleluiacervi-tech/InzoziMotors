import 'server-only'

// ─────────────────────────────────────────────────────────────────────────────
// Google and Apple sign-in for the website — configuration.
//
// The website runs the standard server-side redirect flow (authorization code
// with PKCE for Google, form_post for Apple). Nothing here trusts what comes
// back: the ID token goes to the backend, which verifies it (lib/oauth.js) and
// returns the same session token a password sign-in gets.
//
// Environment (runtime, server-only — never NEXT_PUBLIC_):
//   GOOGLE_CLIENT_ID       the "Web application" OAuth client
//   GOOGLE_CLIENT_SECRET   its secret (used only for the code exchange)
//   APPLE_SERVICES_ID      the Services ID configured for Sign in with Apple
// A provider without its configuration draws no button.
// ─────────────────────────────────────────────────────────────────────────────

export type OAuthProvider = 'google' | 'apple'

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002').replace(/\/+$/, '')
}

export function redirectUri(provider: OAuthProvider): string {
  return `${siteUrl()}/api/auth/oauth/${provider}/callback`
}

export const googleConfig = () => ({
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
})

export const appleConfig = () => ({ servicesId: process.env.APPLE_SERVICES_ID || '' })

export function enabledProviders(): Record<OAuthProvider, boolean> {
  const g = googleConfig()
  return { google: Boolean(g.clientId && g.clientSecret), apple: Boolean(appleConfig().servicesId) }
}
