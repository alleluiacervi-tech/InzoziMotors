import { Button, Icon } from '@/components/ui'
import { FILTER_FIELDS, type Filters, type SortValue } from './query'
import { getServerT } from '@/lib/i18n/server'

/**
 * The /cars search bar: one field at the top of the page, at every width.
 *
 * A plain GET form — no JavaScript involved — that carries the other active
 * filters and the sort along as hidden fields, so searching narrows the
 * current view instead of resetting it. It is the header search icon's
 * destination (`/cars#search`), and the only keyword field on the page: the
 * filter panel keeps `q` as a hidden input so applying filters never drops it.
 */
export async function BrowseSearch({ filters, sort }: { filters: Filters; sort: SortValue }) {
  const t = await getServerT()
  return (
    <form
      action="/cars"
      method="get"
      role="search"
      aria-label={t('cars.browse.searchLabel')}
      className="flex w-full max-w-2xl items-center gap-2 rounded-2xl border border-line bg-surface p-1.5 shadow-card transition-shadow focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/25"
    >
      {FILTER_FIELDS.filter((f) => f !== 'q' && filters[f]).map((field) => (
        <input key={field} type="hidden" name={field} value={filters[field]} />
      ))}
      <input type="hidden" name="sort" value={sort} />
      <label htmlFor="search" className="sr-only">
        {t('cars.browse.searchLabel')}
      </label>
      <span aria-hidden="true" className="pl-2.5 text-content-muted">
        <Icon name="search" size={18} />
      </span>
      <input
        id="search"
        name="q"
        type="search"
        autoComplete="off"
        defaultValue={filters.q ?? ''}
        placeholder={t('cars.filter.keywordPlaceholder')}
        className="h-11 min-w-0 flex-1 scroll-mt-28 bg-transparent text-field text-content placeholder:text-content-muted focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-body"
      />
      <Button type="submit" size="sm">
        {t('cars.browse.searchButton')}
      </Button>
    </form>
  )
}

export default BrowseSearch
