import type { ReactNode } from 'react'
import { Container, Eyebrow } from '@/components/ui'

/**
 * The workspace opening — one of exactly two sanctioned page openings on the
 * site (the other is marketing/PageHeader's white display band). Used by
 * /cars, /rentals and the dashboard: page-tone, compact, with an optional
 * right-aligned slot for a count or sort control.
 *
 * Rendered SERVER-SIDE and outside any Suspense boundary on the marketplace
 * pages, so crawlers and no-JS visitors always get the h1 even when the data
 * behind the grid is unreachable.
 */
export function PageIntro({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow?: string
  title: string
  description?: string
  aside?: ReactNode
}) {
  return (
    <div className="border-b border-line-soft bg-surface-page py-8 sm:py-10">
      <Container className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <h1 className="text-headline font-extrabold text-content">{title}</h1>
          {description ? (
            <p className="mt-3 text-body text-content-secondary">{description}</p>
          ) : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </Container>
    </div>
  )
}

export default PageIntro
