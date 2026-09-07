'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// The live USD⇄RWF rate, held in one place for the whole client tree.
//
// WHY A CONTEXT AND NOT THE MODULE VARIABLE lib/business.ts already has:
// a module variable cannot re-render anything. The rate was already being
// fetched, cached and pushed into three clients, and then read by nobody —
// setting it changed a number in memory and no price on screen ever moved.
// A context is the smallest thing that turns "we know the rate" into "every
// price on the page follows it".
//
// WHY NOT A WEBSOCKET: the providers behind GET /fx publish DAILY. A socket
// held open per visitor to carry roughly one message a day is cost with no
// benefit, and the public site ships no socket client at all. Re-checking on
// a timer and when the tab comes back is indistinguishable to a visitor and
// costs one small request an hour.
//
// SEEDED FROM THE SERVER: the layout already fetches the rate for its own
// server-side formatting, and hands the same value in here as `initial`. So
// the first paint — and what a crawler sees — is already correct, and the
// revalidation below only ever confirms or updates it. No loading state, no
// flash of a fallback figure.
// ─────────────────────────────────────────────────────────────────────────────

export type FxRate = {
  rate: number
  source: string
  fetched_at: string | null
  /** The backend's own word for "this did not come from a provider within 24
   *  hours". Render it, but say so. */
  stale: boolean
}

type CurrencyValue = FxRate & {
  /** When this browser last successfully re-read the rate. Distinct from
   *  fetched_at, which is when the PROVIDER published it. */
  checked_at: string | null
}

const CurrencyContext = createContext<CurrencyValue | null>(null)

/** An hour. The rate changes daily; this is already ten times more often than
 *  the data behind it moves, and it exists mainly so a tab left open overnight
 *  is not showing yesterday's figure. */
const REVALIDATE_MS = 60 * 60 * 1000
/** Don't re-read on every flick between tabs — only if it has actually been a
 *  while since the last successful read. */
const FOCUS_MIN_AGE_MS = 5 * 60 * 1000

export function CurrencyProvider({
  initial, children,
}: {
  initial: FxRate
  children: React.ReactNode
}) {
  const [value, setValue] = useState<CurrencyValue>({ ...initial, checked_at: null })
  // A ref as well as state: the focus handler needs the last read time without
  // re-subscribing the listener every time the rate updates.
  const lastRead = useRef<number>(Date.now())

  const refresh = useCallback(async () => {
    try {
      // Same-origin proxy route, so the browser never needs the API's base URL
      // and no provider key exists on this side at all.
      const res = await fetch('/api/fx', { cache: 'no-store' })
      if (!res.ok) return
      const next = (await res.json()) as Partial<FxRate>
      // Guarded exactly as the server guards it: a malformed response must
      // never be able to zero out or wildly move every price on the page.
      if (typeof next.rate !== 'number' || !Number.isFinite(next.rate)) return
      if (next.rate <= 100 || next.rate >= 10_000) return
      lastRead.current = Date.now()
      setValue({
        rate: next.rate,
        source: typeof next.source === 'string' ? next.source : 'unknown',
        fetched_at: typeof next.fetched_at === 'string' ? next.fetched_at : null,
        stale: Boolean(next.stale),
        checked_at: new Date().toISOString(),
      })
    } catch {
      // Deliberately silent. The previous rate stays on screen, which is the
      // correct behaviour: a display hint must never break a listing page, and
      // the last known good figure beats an error message about currency.
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(refresh, REVALIDATE_MS)
    const onFocus = () => {
      if (Date.now() - lastRead.current > FOCUS_MIN_AGE_MS) refresh()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [refresh])

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

/**
 * The current rate and its provenance.
 *
 * Returns null outside a provider rather than inventing a rate — a component
 * that cannot know the rate must render no dollar figure, not a plausible
 * wrong one.
 */
export function useCurrency(): CurrencyValue | null {
  return useContext(CurrencyContext)
}

export default CurrencyProvider
