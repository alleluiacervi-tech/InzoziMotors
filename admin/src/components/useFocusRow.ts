'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

// ─────────────────────────────────────────────────────────────────────────────
// The receiving end of the Action Center's ?focus=<id> links.
//
// Every queue item already knew which record it was about, but the link went
// to the bare list — so clicking "Verify Jean" landed you on a page of users
// to find Jean again. This scrolls the row into view and marks it, then lets
// the mark fade so the page does not stay decorated for the rest of the
// session.
//
// Returns the focused id and a className to apply to the matching row.
// ─────────────────────────────────────────────────────────────────────────────
const HIGHLIGHT_MS = 2600

export function useFocusRow(ready: boolean = true) {
  const focusId = useSearchParams().get('focus')
  const [lit, setLit] = useState(true)

  useEffect(() => {
    if (!focusId || !ready) return
    // After the list has painted, not before: the node does not exist yet on
    // the render that starts the fetch.
    const raf = requestAnimationFrame(() => {
      document.getElementById(`row-${focusId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    const fade = setTimeout(() => setLit(false), HIGHLIGHT_MS)
    return () => { cancelAnimationFrame(raf); clearTimeout(fade) }
  }, [focusId, ready])

  return {
    focusId,
    /** Spread onto the row: `{...focusProps(item.id)}` */
    focusProps: (id: string) => ({
      id: `row-${id}`,
      className: focusId === id && lit ? 'ring-2 ring-brand ring-offset-2 rounded-xl transition-shadow' : '',
    }),
  }
}
