'use client'

import Script from 'next/script'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useT } from '@/lib/i18n/context'

// ─────────────────────────────────────────────────────────────────────────────
// Google One Tap: the "Sign in to sawacars.com with Google" card Google draws
// in the top-right corner (a bottom sheet on a phone), listing the Google
// accounts already in this browser. One tap signs in, or creates the account.
//
// Rendered by the root layout only for a signed-out visitor, with Google
// sign-in configured, who has not just signed out in this browser session.
// Stays quiet on the pages that already ask how to sign in (and in the middle
// of a reset or an activation), where a second prompt would talk over a form.
//
// Google's own script draws the card; the browser's FedCM dialog replaces it
// where supported. Nothing here sees or stores the token: it goes straight to
// /api/auth/oauth/google/one-tap, which verifies it on the server and sets the
// usual httpOnly session cookie. Dismissing the card is remembered by Google,
// which backs off for longer each time, so nobody is nagged.
// ─────────────────────────────────────────────────────────────────────────────

const ENDPOINT = '/api/auth/oauth/google/one-tap'
const QUIET = [/^\/signin/, /^\/signup/, /^\/forgot-password/, /^\/activate/, /^\/session/, /^\/dashboard/, /^\/sell\/submit/]

type CredentialResponse = { credential?: string }
type GoogleId = {
  initialize: (config: Record<string, unknown>) => void
  prompt: () => void
  cancel: () => void
}
declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } }
  }
}

export function GoogleOneTap({ clientId, locale }: { clientId: string; locale: string }) {
  const t = useT()
  const router = useRouter()
  const pathname = usePathname() || '/'
  const quiet = QUIET.some((rule) => rule.test(pathname))
  const [loaded, setLoaded] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const initialised = useRef(false)

  const onCredential = useCallback(async (response: CredentialResponse) => {
    if (!response?.credential) return
    setSigningIn(true)
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          credential: response.credential,
          next: `${window.location.pathname}${window.location.search}`,
        }),
      })
      const data = await res.json().catch(() => ({} as { redirect?: string }))
      if (data?.redirect) {
        window.location.assign(data.redirect)
        return
      }
      // Signed in where they stand: the header and anything personal refresh.
      router.refresh()
    } catch {
      window.location.assign('/signin?oauth_error=failed')
      return
    }
    setSigningIn(false)
  }, [router])

  useEffect(() => {
    if (!loaded || quiet) return
    let cancelled = false
    ;(async () => {
      const id = window.google?.accounts?.id
      if (!id) return
      if (!initialised.current) {
        const res = await fetch(ENDPOINT, { cache: 'no-store', credentials: 'same-origin' }).catch(() => null)
        if (!res?.ok || cancelled) return
        const { nonce } = await res.json()
        if (!nonce || cancelled) return
        id.initialize({
          client_id: clientId,
          nonce,
          callback: onCredential,
          context: 'signin',
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true,
          use_fedcm_for_prompt: true,
        })
        initialised.current = true
      }
      if (!cancelled) id.prompt()
    })()
    return () => {
      cancelled = true
      window.google?.accounts?.id?.cancel()
    }
  }, [loaded, quiet, clientId, onCredential])

  return (
    <>
      {/* Not even fetched on the quiet pages; loads on the first page that may prompt. */}
      {!quiet ? (
        <Script
          src={`https://accounts.google.com/gsi/client?hl=${encodeURIComponent(locale)}`}
          strategy="afterInteractive"
          onReady={() => setLoaded(true)}
        />
      ) : null}
      {signingIn ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-pill bg-content px-5 py-3 text-caption font-semibold text-surface shadow-lg"
        >
          {t('ui.signingIn')}
        </div>
      ) : null}
    </>
  )
}

export default GoogleOneTap
