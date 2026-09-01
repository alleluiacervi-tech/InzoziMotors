'use client'

import { useId, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Select } from '@/components/ui'
import { useT } from '@/lib/i18n/context'
import {
  buildBrowseHref,
  FILTER_FIELDS,
  SORT_OPTIONS,
  type Filters,
  type SortValue,
} from './query'

/**
 * Sort control. Its own GET form, carrying the active filters as hidden fields
 * so submitting it — with or without JavaScript — re-sorts the same result set
 * instead of resetting it. The submit button exists for the no-JS path and for
 * anyone driving the select from the keyboard; it is visually hidden because
 * with JavaScript the change event has already navigated.
 */
export function SortSelect({ filters, sort }: { filters: Filters; sort: SortValue }) {
  const t = useT()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const id = useId()

  return (
    <form
      method="get"
      action="/cars"
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        const value = new FormData(event.currentTarget).get('sort')
        startTransition(() => router.push(buildBrowseHref(filters, { sort: String(value) as SortValue })))
      }}
    >
      {FILTER_FIELDS.map((field) =>
        filters[field] ? (
          <input key={field} type="hidden" name={field} value={filters[field]} />
        ) : null
      )}

      <label htmlFor={id} className="hidden text-caption font-semibold text-content-muted sm:block">
        {t('cars.sort.label')}
      </label>
      <label htmlFor={id} className="sr-only sm:hidden">
        {t('cars.sort.resultsLabel')}
      </label>

      <Select
        id={id}
        // Uncontrolled, so it needs remounting when the URL changes underneath
        // it — a back button that leaves the control lying about the order is a
        // small bug that reads as a broken site.
        key={sort}
        name="sort"
        defaultValue={sort}
        disabled={pending}
        className="h-11 w-full min-w-[11rem] sm:w-auto"
        onChange={(event) => {
          const value = event.currentTarget.value as SortValue
          startTransition(() => router.push(buildBrowseHref(filters, { sort: value })))
        }}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {t(`cars.sort.${option.value}`)}
          </option>
        ))}
      </Select>

      <button type="submit" className="sr-only">
        {t('cars.sort.apply')}
      </button>
    </form>
  )
}

export default SortSelect
