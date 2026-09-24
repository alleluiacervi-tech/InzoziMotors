'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader, Pill } from '@/components/ui'
import { fmtDateTime } from '@/lib/format'

const PAGE = 50
const TYPES = ['user', 'listing', 'fee', 'mail']

export default function ActivityPage() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof api.auditLog>>>([])
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setItems(await api.auditLog({ q: search, type, limit: PAGE, offset })) }
    catch (e) { setError(e) }
    finally { setLoading(false) }
  }, [search, type, offset])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const timer = setTimeout(() => { setOffset(0); setSearch(query.trim()) }, 350)
    return () => clearTimeout(timer)
  }, [query])

  return <div>
    <PageHeader title="Activity history" description="A durable record of sensitive admin decisions and communication actions." />
    <Card className="mb-5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1"><span className="sr-only">Search activity</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted"><Icon name="search" size={16} /></span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search action, admin, email, or record ID"
            className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-label text-content focus:border-content-muted focus:outline-none" />
        </label>
        <label><span className="sr-only">Filter activity type</span>
          <select value={type} onChange={(e) => { setType(e.target.value); setOffset(0) }}
            className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-label font-semibold text-content focus:outline-none sm:w-48">
            <option value="">All record types</option>{TYPES.map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
          </select>
        </label>
      </div>
    </Card>

    {error ? <ErrorState error={error} onRetry={load} /> : loading ? <LoadingState rows={8} /> : items.length === 0 ?
      <EmptyState icon="clock" title="No matching activity" description="New sensitive admin actions will appear here automatically." /> :
      <Card className="overflow-hidden"><ul className="divide-y divide-line-soft">{items.map((item) =>
        <li key={item.id} className="px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-alt text-content-secondary"><Icon name="clock" size={16} /></span>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-content">{item.summary}</p><Pill status={item.target_type} label={item.target_type} /></div>
              <p className="mt-1 text-caption text-content-muted">{item.actor_name || 'Former admin'}{item.actor_email ? ` · ${item.actor_email}` : ''}{item.target_id ? ` · ${item.target_id}` : ''}</p>
            </div>
            <time dateTime={item.created_at} className="shrink-0 text-caption text-content-muted">{fmtDateTime(item.created_at)}</time>
          </div>
        </li>)}</ul>
        <div className="flex items-center justify-between border-t border-line-soft px-4 py-3">
          <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))} className="rounded-lg px-3 py-2 text-label font-bold text-content-secondary disabled:opacity-40 hover:bg-surface-alt">Newer</button>
          <span className="text-caption text-content-muted">Page {Math.floor(offset / PAGE) + 1}</span>
          <button type="button" disabled={items.length < PAGE} onClick={() => setOffset(offset + PAGE)} className="rounded-lg px-3 py-2 text-label font-bold text-content-secondary disabled:opacity-40 hover:bg-surface-alt">Older</button>
        </div>
      </Card>}
  </div>
}
