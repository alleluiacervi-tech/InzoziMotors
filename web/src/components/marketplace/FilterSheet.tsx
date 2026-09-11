'use client'

import { useEffect, useRef, useState } from 'react'
import { Button, Icon } from '@/components/ui'
import { useT } from '@/lib/i18n/context'
import { FilterPanel } from './FilterPanel'
import type { Facets } from './facets'
import { activeFilterCount, type Filters, type SortValue } from './query'

// The same filter form as the desktop sidebar, in a slide-over for small
// screens. The panel is only mounted while the sheet is open, so the two copies
// never coexist in the DOM and the ids inside stay unique.

export function FilterSheet({
  facets,
  filters,
  sort,
}: {
  facets: Facets
  filters: Filters
  sort: SortValue
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const count = activeFilterCount(filters)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      // Keep Tab inside the sheet. Without this, a keyboard user tabs straight
      // out of an open modal and into the listings behind it.
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      )
      if (!focusable.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const current = document.activeElement

      if (event.shiftKey && (current === first || !dialogRef.current.contains(current))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && current === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    // Without this the page behind scrolls under the sheet on iOS.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
      // Returning focus to the trigger is the part everyone forgets; without it
      // a keyboard user lands back at the top of the document.
      triggerRef.current?.focus()
    }
  }, [open])

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="compact"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="lg:hidden"
      >
        <Icon name="filter" size={17} className="text-content-secondary" />
        {t('cars.filterSheet.filters')}
        {count > 0 ? (
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-pill bg-brand px-1.5 text-micro font-extrabold text-brand-on">
            {count}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-900/50 animate-fade-in"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('cars.filter.ariaLabel')}
            className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-surface shadow-float"
          >
            <div className="flex items-center justify-between border-b border-line-soft px-5 py-4">
              <h2 className="text-base font-extrabold text-content">{t('cars.filterSheet.filters')}</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('cars.filterSheet.close')}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-content-secondary transition-colors hover:bg-surface-alt hover:text-content"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-6">
              <FilterPanel
                facets={facets}
                filters={filters}
                sort={sort}
                onApplied={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default FilterSheet
