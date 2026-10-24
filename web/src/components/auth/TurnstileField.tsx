'use client'

import { useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Cloudflare Turnstile on the sign-up form (backend lib/turnstile.js checks the
// token). Renders nothing until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set.
//
// "interaction-only": most people never see anything; Cloudflare shows a box
// only when it wants a click. The token lands in a hidden input named
// `turnstile_token` inside this form. Tokens are single-use, so the widget is
// reset after every submission (`resetKey` changes with the form's state).
// If the script cannot load, the form still submits: the API then holds the
// account until its email is confirmed rather than refusing the person.
// ─────────────────────────────────────────────────────────────────────────────

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id: string) => void
  remove: (id: string) => void
}
declare global {
  interface Window { turnstile?: Turnstile }
}

let loading: Promise<Turnstile | null> | null = null
function loadTurnstile(): Promise<Turnstile | null> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (!loading) {
    loading = new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      script.onload = () => resolve(window.turnstile ?? null)
      script.onerror = () => { loading = null; resolve(null) }
      document.head.appendChild(script)
    })
  }
  return loading
}

export function TurnstileField({ resetKey }: { resetKey?: unknown }) {
  const container = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)

  useEffect(() => {
    if (!SITE_KEY) return
    let cancelled = false
    loadTurnstile().then((turnstile) => {
      if (cancelled || !turnstile || !container.current || widget.current) return
      widget.current = turnstile.render(container.current, {
        sitekey: SITE_KEY,
        action: 'signup',
        appearance: 'interaction-only',
        theme: 'auto',
        'response-field-name': 'turnstile_token',
      })
    })
    return () => {
      cancelled = true
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current)
      widget.current = null
    }
  }, [])

  useEffect(() => {
    if (resetKey !== undefined && widget.current && window.turnstile) window.turnstile.reset(widget.current)
  }, [resetKey])

  if (!SITE_KEY) return null
  return <div ref={container} className="flex justify-center empty:hidden" />
}

/**
 * A field no person can see or reach, and many form-filling scripts fill in.
 * Filled means the API refuses the sign-up. Off-screen rather than display:none,
 * which some scripts skip; out of the tab order and hidden from screen readers.
 */
export function HoneypotField() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor="website">Leave this empty</label>
      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  )
}
