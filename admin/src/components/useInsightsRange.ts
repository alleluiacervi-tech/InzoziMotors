'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { RangeQuery } from '@/lib/api'

const ISO = /^\d{4}-\d{2}-\d{2}$/
const ALLOWED_DAYS = new Set([7, 30, 90, 365])

/**
 * The Insights window, kept in the URL (?days=90, or ?from=&to=, plus
 * &compare=0 to hide the comparison) so every view is a shareable link and the
 * back button walks through the windows an operator looked at.
 */
export function useInsightsRange() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const range: RangeQuery = useMemo(() => {
    const from = params.get('from')
    const to = params.get('to')
    if (from && to && ISO.test(from) && ISO.test(to) && from <= to) return { from, to }
    const days = Number(params.get('days'))
    return { days: ALLOWED_DAYS.has(days) ? days : 30 }
  }, [params])
  const compare = params.get('compare') !== '0'

  const write = useCallback((next: URLSearchParams) => {
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }, [router, pathname])

  const setRange = useCallback((r: RangeQuery) => {
    const next = new URLSearchParams(params.toString())
    next.delete('days'); next.delete('from'); next.delete('to')
    if (r.from && r.to) { next.set('from', r.from); next.set('to', r.to) } else next.set('days', String(r.days ?? 30))
    write(next)
  }, [params, write])

  const setCompare = useCallback((on: boolean) => {
    const next = new URLSearchParams(params.toString())
    if (on) next.delete('compare'); else next.set('compare', '0')
    write(next)
  }, [params, write])

  /** The same window as a query string, for links between Insights pages. */
  const query = useMemo(() => {
    const q = new URLSearchParams()
    if (range.from && range.to) { q.set('from', range.from); q.set('to', range.to) } else q.set('days', String(range.days))
    if (!compare) q.set('compare', '0')
    return q.toString()
  }, [range, compare])

  return { range, setRange, compare, setCompare, query }
}
