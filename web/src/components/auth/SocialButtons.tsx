'use client'

import { useState } from 'react'
import { useT } from '@/lib/i18n/context'

// ─────────────────────────────────────────────────────────────────────────────
// "Continue with Google" / "Continue with Apple".
//
// Drawn to each company's own rules, because a sign-in button is a trust mark
// and people recognise the real ones:
//   Google — white, 1 px #747775 border, #1F1F1F label, the four-colour "G"
//            (developers.google.com/identity/branding-guidelines)
//   Apple  — black, white logo and label, same height and corner radius as its
//            neighbour (Human Interface Guidelines, Sign in with Apple)
// Both are plain links to the server route that starts the redirect flow: no
// provider script loads on the page, nothing breaks without JavaScript, and
// mobile browsers never meet a blocked popup. The only script here is the
// "Opening…" state, so a slow redirect does not look like a dead button.
// ─────────────────────────────────────────────────────────────────────────────

export type SocialProvider = 'google' | 'apple'

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

function AppleMark() {
  return (
    <svg width="17" height="20" viewBox="0 0 814 1000" aria-hidden="true" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  )
}

function Spinner() {
  return <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
}

export function SocialButtons({
  providers,
  next,
  role,
  reopen = false,
  only,
}: {
  providers: Record<SocialProvider, boolean>
  next: string
  role?: 'buyer' | 'seller'
  reopen?: boolean
  /** Draw just this provider (the reopen panel offers the one that was used). */
  only?: SocialProvider
}) {
  const t = useT()
  const [pending, setPending] = useState<SocialProvider | null>(null)

  const href = (provider: SocialProvider) => {
    const params = new URLSearchParams({ next })
    if (role) params.set('role', role)
    if (reopen) params.set('reopen', '1')
    return `/api/auth/oauth/${provider}/start?${params.toString()}`
  }
  const shown = (['apple', 'google'] as const).filter((p) => providers[p] && (!only || only === p))
  if (!shown.length) return null

  const base =
    'flex h-12 w-full items-center justify-center gap-3 rounded-xl px-4 text-body font-semibold transition-[background-color,box-shadow,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 aria-disabled:pointer-events-none aria-disabled:opacity-70'

  return (
    <div className="space-y-3">
      {shown.map((provider) =>
        provider === 'google' ? (
          <a
            key="google"
            href={href('google')}
            onClick={() => setPending('google')}
            aria-disabled={pending !== null}
            className={`${base} border border-[#747775] bg-white text-[#1F1F1F] hover:bg-[#F8FAFF] hover:shadow-sm focus-visible:ring-[#4285F4]`}
          >
            {pending === 'google' ? <Spinner /> : <GoogleMark />}
            <span>{pending === 'google' ? t('auth.social.opening') : t(reopen ? 'auth.social.reopenGoogle' : 'auth.social.google')}</span>
          </a>
        ) : (
          <a
            key="apple"
            href={href('apple')}
            onClick={() => setPending('apple')}
            aria-disabled={pending !== null}
            className={`${base} bg-black text-white hover:bg-[#1d1d1f] focus-visible:ring-black`}
          >
            {pending === 'apple' ? <Spinner /> : <AppleMark />}
            <span>{pending === 'apple' ? t('auth.social.opening') : t(reopen ? 'auth.social.reopenApple' : 'auth.social.apple')}</span>
          </a>
        ),
      )}
    </div>
  )
}

/** "or" between the provider buttons and the email form. */
export function OrDivider({ label }: { label: string }) {
  return (
    <div className="my-7 flex items-center gap-4" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-line" />
      <span className="text-caption font-semibold text-content-muted">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}
