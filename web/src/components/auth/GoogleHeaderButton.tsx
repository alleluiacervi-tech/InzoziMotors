'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { GoogleMark } from '@/components/auth/SocialButtons'
import { useT } from '@/lib/i18n/context'

// ─────────────────────────────────────────────────────────────────────────────
// "Continue with Google" in the site header, for signed-out visitors.
//
// The dependable way in. One Tap (GoogleOneTap.tsx) is Google's choice to show
// or not: a browser with third-party sign-in off, Firefox, Safari without a
// Google session, or a recent dismissal all keep it hidden. This is the same
// server-side redirect flow as the button on /signin, and works everywhere.
//
// Google's branding rules: white, 1 px #747775 border, #1F1F1F label, the
// four-colour G. `icon` is the G alone (phones and narrow bars), with the full
// label kept for screen readers; `full` spells it out (wide bars, the menu).
// A plain link, so it needs no script; the only state is the "pending" dim.
// ─────────────────────────────────────────────────────────────────────────────

const AUTH_PAGES = /^\/(signin|signup|forgot-password|activate|session)/

export function GoogleHeaderButton({
  variant,
  className = '',
}: {
  variant: 'icon' | 'full' | 'block'
  className?: string
}) {
  const t = useT()
  const pathname = usePathname() || '/'
  const [pending, setPending] = useState(false)
  const next = AUTH_PAGES.test(pathname) ? '/' : pathname
  const href = `/api/auth/oauth/google/start?${new URLSearchParams({ next }).toString()}`
  const label = t('ui.continueWithGoogle')

  const base =
    'inline-flex items-center justify-center gap-2 border border-[#747775] bg-white text-[#1F1F1F] font-semibold transition-[background-color,box-shadow,opacity] duration-150 hover:bg-[#F8FAFF] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4285F4] focus-visible:ring-offset-2 aria-disabled:pointer-events-none aria-disabled:opacity-60'
  const shape =
    variant === 'icon'
      ? 'h-10 w-10 rounded-lg'
      : variant === 'block'
        ? 'h-12 w-full rounded-xl px-4 text-body'
        : 'h-10 rounded-lg px-3.5 text-caption'

  return (
    <a
      href={href}
      onClick={() => setPending(true)}
      aria-disabled={pending}
      aria-label={variant === 'icon' ? label : undefined}
      title={variant === 'icon' ? label : undefined}
      className={`${base} ${shape} ${className}`}
    >
      <GoogleMark />
      {variant === 'icon' ? null : <span className="whitespace-nowrap">{label}</span>}
    </a>
  )
}

export default GoogleHeaderButton
