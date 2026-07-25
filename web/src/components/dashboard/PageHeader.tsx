import type { ReactNode } from 'react'

// Every dashboard page opens the same way: one h1, a sentence of context, and
// an optional action on the right. Keeping it in one place is what stops eight
// pages drifting into eight different headers.

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-prose">
        <h1 className="text-title font-extrabold text-content">{title}</h1>
        {description ? (
          <p className="mt-2 text-[15px] leading-relaxed text-content-secondary">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}

/** A titled block within a page — the level below PageHeader. `id` is what the
 *  wrapping <section> points its aria-labelledby at, so the section's
 *  accessible name is the heading a sighted reader sees. */
export function PanelHeading({
  id,
  title,
  hint,
  action,
  as: Tag = 'h2',
}: {
  id?: string
  title: string
  hint?: string
  action?: ReactNode
  as?: 'h2' | 'h3'
}) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <Tag id={id} className="text-[17px] font-extrabold text-content">
        {title}
      </Tag>
      {hint ? <p className="text-[13px] text-content-muted">{hint}</p> : null}
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
  )
}

export default PageHeader
