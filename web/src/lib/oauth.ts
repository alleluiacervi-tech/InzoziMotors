import 'server-only'

// ─────────────────────────────────────────────────────────────────────────────
// Google sign-in for the website — configuration.
//
// The website runs Google's standard server-side flow (authorization code with
// PKCE). Nothing here trusts what comes back: the ID token goes to the backend,
// which verifies it (lib/oauth.js) and returns the same session token a
// password sign-in gets.
//
// Environment (runtime, server-only — never NEXT_PUBLIC_):
//   GOOGLE_CLIENT_ID       the "Web application" OAuth client
//   GOOGLE_CLIENT_SECRET   its secret (used only for the code exchange)
// Without both, no button is drawn.
// ─────────────────────────────────────────────────────────────────────────────

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002').replace(/\/+$/, '')
}

export const googleRedirectUri = () => `${siteUrl()}/api/auth/oauth/google/callback`

export const googleConfig = () => ({
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
})

export function googleEnabled(): boolean {
  const g = googleConfig()
  return Boolean(g.clientId && g.clientSecret)
}
