import Link from 'next/link'
import { Icon } from '@/components/ui'
import { buildBrowseHref, PAGE_SIZE, type Filters, type SortValue } from './query'

// ─────────────────────────────────────────────────────────────────────────────
// Pagination without a total.
//
// GET /cars returns a page of rows, not a count, so there is no honest way to
// say "page 2 of 9". What we can say is where this page starts and ends, and
// whether another page exists — which we know because a full page came back.
// Inventing a total to fill a nicer-looking pager would be inventing data.
//
// Real <a> links, so crawlers walk the whole catalogue.
// ─────────────────────────────────────────────────────────────────────────────

export function Pagination({
  filters,
  sort,
  offset,
  count,
}: {
  filters: Filters
  sort: SortValue
  offset: number
  /** Rows on this page. Equal to PAGE_SIZE ⇒ assume there is another. */
  count: number
}) {
  const hasPrevious = offset > 0
  const hasNext = count === PAGE_SIZE
  if (!hasPrevious && !hasNext) return null

  const page = Math.floor(offset / PAGE_SIZE) + 1
  const from = offset + 1
  const to = offset + count

  return (
    <nav
      aria-label="Listing pages"
      className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-line-soft pt-6 sm:flex-row"
    >
      <p className="text-caption text-content-secondary">
        Showing <span className="font-bold text-content">{from}–{to}</span>
        <span className="text-content-muted"> · page {page}</span>
      </p>

      <div className="flex items-center gap-2">
        {hasPrevious ? (
          <Link
            href={buildBrowseHref(filters, { sort, offset: Math.max(0, offset - PAGE_SIZE) })}
            rel="prev"
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-caption font-bold text-content transition-colors hover:border-content-muted hover:bg-surface-alt"
          >
            <Icon name="chevron-left" size={16} className="text-content-secondary" />
            Previous
          </Link>
        ) : (
          <span className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-line-soft px-4 text-caption font-bold text-content-muted">
            <Icon name="chevron-left" size={16} />
            Previous
          </span>
        )}

        {hasNext ? (
          <Link
            href={buildBrowseHref(filters, { sort, offset: offset + PAGE_SIZE })}
            rel="next"
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-caption font-bold text-content transition-colors hover:border-content-muted hover:bg-surface-alt"
          >
            Next
            <Icon name="chevron-right" size={16} className="text-content-secondary" />
          </Link>
        ) : (
          <span className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-line-soft px-4 text-caption font-bold text-content-muted">
            Next
            <Icon name="chevron-right" size={16} />
          </span>
        )}
      </div>
    </nav>
  )
}

export default Pagination
