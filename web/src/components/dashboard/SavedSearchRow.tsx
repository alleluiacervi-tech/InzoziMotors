'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  deleteSearchAction,
  toggleSearchNotifyAction,
} from '@/app/(dashboard)/dashboard/saved/actions'
import { Icon } from '@/components/ui'
import { formatKm, formatUSD } from '@/lib/business'
import type { SavedSearch } from '@/lib/types'

// A saved search is a standing instruction: "tell me when a car like this is
// listed". Two mutations live here — the alert toggle and delete — each its
// own form so one failing never disables the other.

/** Rebuilds the browse URL the search stands for, using the same query keys
 *  GET /cars parses. Filters are stored as free-form JSON, so read defensively. */
function searchHref(filters: SavedSearch['filters']): string {
  const params = new URLSearchParams()
  if (filters.query) params.set('q', filters.query)
  if (filters.make) params.set('make', filters.make)
  if (filters.model) params.set('model', filters.model)
  if (filters.category) params.set('body_type', filters.category)
  if (typeof filters.maxPrice === 'number') params.set('max_price', String(filters.maxPrice))
  const qs = params.toString()
  return qs ? `/cars?${qs}` : '/cars'
}

function summarise(filters: SavedSearch['filters']): string[] {
  const parts: string[] = []
  if (filters.make) parts.push(filters.make)
  if (filters.model) parts.push(filters.model)
  if (filters.category) parts.push(filters.category)
  if (typeof filters.maxPrice === 'number') parts.push(`under ${formatUSD(filters.maxPrice)}`)
  if (typeof filters.maxMileage === 'number') parts.push(`under ${formatKm(filters.maxMileage)}`)
  if (filters.query) parts.push(`“${filters.query}”`)
  return parts
}

function ToggleButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={enabled}
      aria-busy={pending || undefined}
      className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-caption font-bold text-content-secondary transition-colors hover:bg-surface-alt hover:text-content disabled:opacity-50"
    >
      <span
        aria-hidden="true"
        className={`flex h-6 w-10 shrink-0 items-center rounded-pill p-0.5 transition-colors ${
          enabled ? 'bg-brand' : 'bg-line'
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-surface shadow-card transition-transform duration-200 ease-brand ${
            enabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
      {enabled ? 'Alerts on' : 'Alerts off'}
    </button>
  )
}

function DeleteButtons({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus()
  return (
    <>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className="inline-flex h-11 items-center rounded-xl border border-danger/30 px-3 text-caption font-bold text-danger transition-colors hover:bg-danger-tint disabled:opacity-50"
      >
        {pending ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="inline-flex h-11 items-center rounded-xl px-3 text-caption font-bold text-content-secondary transition-colors hover:bg-surface-alt hover:text-content"
      >
        Keep it
      </button>
    </>
  )
}

export function SavedSearchRow({ search }: { search: SavedSearch }) {
  const [toggleState, toggle] = useActionState(toggleSearchNotifyAction, null)
  const [deleteState, remove] = useActionState(deleteSearchAction, null)
  const [confirming, setConfirming] = useState(false)

  const parts = summarise(search.filters)
  const error = toggleState?.error ?? deleteState?.error

  return (
    <li className="hairline">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <Link
            href={searchHref(search.filters)}
            className="text-body font-extrabold text-content hover:text-brand"
          >
            {search.label}
          </Link>
          <p className="mt-1 text-caption text-content-muted">
            {parts.length > 0 ? parts.join(' · ') : 'All certified cars'}
          </p>
          {error ? (
            <p role="alert" className="mt-2 text-micro font-semibold text-danger">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <form action={toggle}>
            <input type="hidden" name="id" value={search.id} />
            <input type="hidden" name="notify" value={search.notify_enabled ? 'off' : 'on'} />
            <ToggleButton enabled={search.notify_enabled} />
          </form>

          {confirming ? (
            <form action={remove} className="flex items-center gap-1">
              <input type="hidden" name="id" value={search.id} />
              <DeleteButtons onCancel={() => setConfirming(false)} />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-content-muted transition-colors hover:bg-surface-alt hover:text-content"
              aria-label={`Delete saved search: ${search.label}`}
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

export default SavedSearchRow
