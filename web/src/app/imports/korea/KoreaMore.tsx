'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { useT } from '@/lib/i18n/context'
import type { KoreaCar, KoreaList } from '@/lib/api'
import { KoreaCard } from './KoreaCard'

/**
 * The cars after the first page. The first page is rendered by the server (so
 * it is in the HTML, fast and indexable); this appends the rest on request.
 *
 * Cursor paging, so the nth page costs what the first does and a car that sells
 * in between is never shown twice. `filters` is the page's own query string,
 * passed through untouched.
 */
export function KoreaMore({ filters, initialCursor }: { filters: string; initialCursor: string | null }) {
  const t = useT()
  const [cars, setCars] = useState<KoreaCar[]>([])
  const [cursor, setCursor] = useState<string | null>(initialCursor)
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')

  async function more() {
    if (!cursor || state === 'loading') return
    setState('loading')
    try {
      const params = new URLSearchParams(filters)
      params.set('cursor', cursor)
      const res = await fetch(`/api/imports/korea?${params.toString()}`)
      if (!res.ok) throw new Error('failed')
      const page = (await res.json()) as KoreaList
      // A repeated id (the stock moved between pages) is dropped, never shown twice.
      setCars((prev) => {
        const seen = new Set(prev.map((c) => c.id))
        return [...prev, ...page.items.filter((c) => !seen.has(c.id))]
      })
      setCursor(page.next_cursor)
      setState('idle')
    } catch {
      setState('error')
    }
  }

  return (
    <>
      {cars.length ? (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cars.map((c) => <KoreaCard key={c.id} car={c} />)}
        </ul>
      ) : null}
      <div className="mt-8 flex flex-col items-center gap-3" aria-live="polite">
        {state === 'error' ? <p className="text-caption text-danger">{t('imports.korea.loadError')}</p> : null}
        {cursor ? (
          <Button variant="outline" size="lg" onClick={more} disabled={state === 'loading'}>
            {state === 'loading' ? t('imports.korea.loading') : t('imports.korea.loadMore')}
          </Button>
        ) : (cars.length ? <p className="text-caption text-content-muted">{t('imports.korea.end')}</p> : null)}
      </div>
    </>
  )
}
