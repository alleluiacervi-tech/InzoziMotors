import type { ReactNode } from 'react'
import { Container } from '@/components/ui'

// One header treatment for every marketing page. Eight pages built by different
// hands still read as one site because they all start with this block.
//
// It renders <header> inside <main>, which is not a banner landmark — the site
// banner is the sticky nav in layout.tsx, and there must only ever be one.

export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
  className = '',
}: {
  eyebrow?: string
  title: ReactNode
  lede?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={`border-b border-line-soft bg-surface ${className}`}>
      <Container className="py-14 sm:py-20 lg:py-24">
        {eyebrow ? (
          <p className="mb-4 text-caption font-bold text-brand">{eyebrow}</p>
        ) : null}

        <h1 className="max-w-4xl text-display font-extrabold text-content">{title}</h1>

        {lede ? (
          <p className="mt-6 max-w-prose text-title-sm leading-relaxed text-content-secondary">
            {lede}
          </p>
        ) : null}

        {actions ? <div className="mt-9 flex flex-wrap gap-3">{actions}</div> : null}
      </Container>
    </header>
  )
}

export default PageHeader
