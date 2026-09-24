import type { ReactNode } from 'react'
import { Container, Icon } from '@/components/ui'
import { getServerT } from '@/lib/i18n/server'

/**
 * The workspace opening for /cars and /rentals: the site's own paper, compact,
 * with an optional search row under the title and an optional aside.
 *
 * It used to be a dark ink band with a red glow, ~330px tall on a phone, so a
 * buyer scrolled past a banner before seeing a car — and it contradicted the
 * homepage, whose hero was moved off ink precisely because a dark slab "reads
 * as a different website" (home/Hero.tsx). Now it is one surface with the
 * header and the grid, and on a phone the title, one line of context and the
 * search field fit in about 200px.
 *
 * Rendered SERVER-SIDE and outside any Suspense boundary on the marketplace
 * pages, so crawlers and no-JS visitors always get the h1 even when the data
 * behind the grid is unreachable.
 */
export async function PageIntro({
  title,
  description,
  search,
  aside,
}: {
  /** Kept for call-site compatibility; the opening no longer prints one. */
  eyebrow?: string
  title: string
  description?: string
  /** A search form, set full-width under the title (see BrowseSearch). */
  search?: ReactNode
  aside?: ReactNode
}) {
  const t = await getServerT()
  return (
    <div className="border-b border-line-soft bg-surface-page">
      <Container className="pb-6 pt-6 sm:pb-8 sm:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div className="min-w-0 max-w-3xl">
            <h1 className="text-headline font-extrabold text-content sm:text-display">{title}</h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-body leading-relaxed text-content-secondary sm:mt-3 sm:text-title-sm">
                {description}
              </p>
            ) : null}
            {/* The marketplace's terms in three phrases. Hidden on a phone,
                where each card and the listing page carry them and the space
                belongs to the cars. */}
            <ul className="mt-4 hidden flex-wrap gap-x-6 gap-y-2 text-caption font-semibold text-content-secondary sm:flex">
              <li className="inline-flex items-center gap-1.5">
                <Icon name="shield-check" size={15} className="text-content-muted" aria-hidden="true" />
                {t('cars.pageIntro.inspection')}
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Icon name="check-circle" size={15} className="text-content-muted" aria-hidden="true" />
                {t('cars.pageIntro.approved')}
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Icon name="user" size={15} className="text-content-muted" aria-hidden="true" />
                {t('cars.pageIntro.contact')}
              </li>
            </ul>
          </div>
          {aside ? <div className="shrink-0">{aside}</div> : null}
        </div>
        {search ? <div className="mt-5 sm:mt-6">{search}</div> : null}
      </Container>
    </div>
  )
}

export default PageIntro
