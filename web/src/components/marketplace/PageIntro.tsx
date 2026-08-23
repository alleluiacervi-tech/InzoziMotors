import type { ReactNode } from 'react'
import { Container, Eyebrow, Icon } from '@/components/ui'

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
    <div className="relative isolate overflow-hidden bg-ink-900 py-10 text-white sm:py-14">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_12%,rgba(204,5,15,0.24),transparent_34%),radial-gradient(circle_at_8%_92%,rgba(255,255,255,0.08),transparent_27%)]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <Container className="flex flex-wrap items-end justify-between gap-8">
        <div className="max-w-3xl">
          {eyebrow ? <Eyebrow tone="invert">{eyebrow}</Eyebrow> : null}
          <h1 className="text-display font-extrabold text-white">{title}</h1>
          {description ? (
            <p className="mt-4 max-w-2xl text-title-sm leading-relaxed text-white/70">{description}</p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-caption font-semibold text-white/70">
            <span className="inline-flex items-center gap-1.5"><Icon name="shield-check" size={15} className="text-white" />150-point inspection</span>
            <span className="inline-flex items-center gap-1.5"><Icon name="check-circle" size={15} className="text-white" />Admin-approved listings</span>
            <span className="inline-flex items-center gap-1.5"><Icon name="user" size={15} className="text-white" />Direct seller contact</span>
          </div>
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </Container>
    </div>
  )
}

export default PageIntro
