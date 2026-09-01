import Link from 'next/link'
import { Icon } from '@/components/ui'
import { getServerT } from '@/lib/i18n/server'
import {
  buildBrowseHref,
  chipLabel,
  FILTER_FIELDS,
  withoutFilter,
  type Filters,
  type SortValue,
} from './query'

/**
 * The filters currently narrowing the list, each removable. Plain links rather
 * than buttons: they change the URL, they work without JavaScript, and a
 * middle-click opens the wider result set in a new tab like any other link.
 */
export async function ActiveFilters({ filters, sort }: { filters: Filters; sort: SortValue }) {
  const active = FILTER_FIELDS.filter((field) => filters[field])
  if (!active.length) return null
  const t = await getServerT()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-caption font-semibold text-content-muted">{t('cars.activeFilters.filteringBy')}</span>

      {active.map((field) => {
        const value = filters[field]
        if (!value) return null
        return (
          <Link
            key={field}
            href={buildBrowseHref(withoutFilter(filters, field), { sort })}
            scroll={false}
            className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface py-1.5 pl-3 pr-2 text-caption font-semibold text-content transition-colors hover:border-content-muted hover:bg-surface-alt"
          >
            {chipLabel(t, field, value)}
            <span className="sr-only">{t('cars.activeFilters.remove', { label: t(`cars.filterLabel.${field}`).toLowerCase() })}</span>
            <Icon name="close" size={13} className="text-content-muted" />
          </Link>
        )
      })}

      {active.length > 1 ? (
        <Link
          href={buildBrowseHref({}, { sort })}
          scroll={false}
          className="rounded-pill px-2 py-1.5 text-caption font-bold text-brand underline-offset-4 hover:underline"
        >
          {t('cars.activeFilters.clearAll')}
        </Link>
      ) : null}
    </div>
  )
}

export default ActiveFilters
