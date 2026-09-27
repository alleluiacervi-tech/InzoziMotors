'use client'

// The comparison selection (G8 / P3-D4 in docs/WEB-PARITY-PLAN.md): up to
// three car ids, oldest dropped first — the app's addToComparison rule. It is
// a per-viewer convenience, so it lives in localStorage, and every access is
// guarded: private windows and blocked storage throw, and the site must work
// without it. The /compare page itself is driven by its URL, not by this.

import { useEffect, useState } from 'react'

const KEY = 'sawa.compare'
const EVENT = 'sawa:compare'
export const COMPARE_MAX = 3

export function readCompare(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string').slice(-COMPARE_MAX) : []
  } catch {
    return []
  }
}

function writeCompare(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids.slice(-COMPARE_MAX)))
  } catch {
    /* storage unavailable — the in-page state still updates below */
  }
  window.dispatchEvent(new Event(EVENT))
}

export function toggleCompare(id: string) {
  const current = readCompare()
  writeCompare(current.includes(id) ? current.filter((x) => x !== id) : [...current, id])
}

export function removeFromCompare(id: string) {
  writeCompare(readCompare().filter((x) => x !== id))
}

export function compareHref(ids: string[]) {
  return `/compare?ids=${ids.map(encodeURIComponent).join(',')}`
}

/** The live selection, kept in step across components and tabs. Empty on the
 *  server and during hydration, then filled from storage. */
export function useCompare(): string[] {
  const [ids, setIds] = useState<string[]>([])
  useEffect(() => {
    const sync = () => setIds(readCompare())
    sync()
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return ids
}
