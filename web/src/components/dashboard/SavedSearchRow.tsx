'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  deleteSearchAction,
  toggleSearchNotifyAction,
} from '@/app/(dashboard)/dashboard/saved/actions'
import { Button, Icon } from '@/components/ui'
import { formatKm, formatUSD } from '@/lib/business'
import { useT } from '@/lib/i18n/context'
import type { TFunction } from '@/lib/i18n/dictionary'
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

function summarise(filters: SavedSearch['filters'], t: TFunction): string[] {
  const parts: string[] = []
  if (filters.make) parts.push(filters.make)
  if (filters.model) parts.push(filters.model)
  if (filters.category) parts.push(filters.category)
  if (typeof filters.maxPrice === 'number') parts.push(t('dashboard.saved.under', { value: formatUSD(filters.maxPrice) }))
  if (typeof filters.maxMileage === 'number') parts.push(t('dashboard.saved.under', { value: formatKm(filters.maxMileage) }))
  if (filters.query) parts.push(`“${filters.query}”`)
  return parts
}

function ToggleButton({ enabled }: { enabled: boolean }) {
  const t = useT()
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="ghost"
      size="compact"
      disabled={pending}
      aria-pressed={enabled}
      aria-busy={pending || undefined}
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
      {enabled ? t('dashboard.saved.alertsOn') : t('dashboard.saved.alertsOff')}
    </Button>
  )
}

function DeleteButtons({ onCancel }: { onCancel: () => void }) {
  const t = useT()
  const { pending } = useFormStatus()
  return (
    <>
      <Button
        type="submit"
        variant="danger"
        size="compact"
        disabled={pending}
        aria-busy={pending || undefined}
      >
        {pending ? t('dashboard.saved.deleting') : t('dashboard.saved.yesDelete')}
      </Button>
      <Button type="button" variant="ghost" size="compact" onClick={onCancel} disabled={pending}>
        {t('dashboard.saved.keepIt')}
      </Button>
    </>
  )
}

export function SavedSearchRow({ search }: { search: SavedSearch }) {
  const t = useT()
  const [toggleState, toggle] = useActionState(toggleSearchNotifyAction, null)
  const [deleteState, remove] = useActionState(deleteSearchAction, null)
  const [confirming, setConfirming] = useState(false)

  const parts = summarise(search.filters, t)
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
            {parts.length > 0 ? parts.join(' · ') : t('dashboard.saved.allCertified')}
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
              aria-label={t('dashboard.saved.deleteSearchLabel', { label: search.label })}
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
