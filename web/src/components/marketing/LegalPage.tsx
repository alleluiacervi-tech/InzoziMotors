import type { ReactNode } from 'react'
import { Alert, Container, Section } from '@/components/ui'
import { PageHeader } from './PageHeader'

// Shared shell for the three policy pages. They are drafts, and the page says so
// at the top of every one of them — a policy scaffold that pretends to be a
// reviewed legal document is worse than no policy at all.

export type LegalSection = {
  id: string
  heading: string
  body: ReactNode
  /** Opt out of the shared Prose wrapper. Set this when the section renders a
   *  component of its own — Prose's descendant selectors would otherwise put
   *  bullet dots through, say, the refund table's rows. */
  plain?: boolean
}

/**
 * Long-form body copy. There is no typography plugin in this project, so the
 * element styles are declared once here with descendant selectors rather than
 * repeated on every paragraph in every policy.
 */
export function Prose({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`max-w-prose text-body leading-relaxed text-content-secondary
        [&>*+*]:mt-4
        [&_a]:font-bold [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-2
        [&_h3]:mt-7 [&_h3]:text-body [&_h3]:font-extrabold [&_h3]:text-content
        [&_li]:relative [&_li]:pl-5
        [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[0.62em] [&_li]:before:h-[5px] [&_li]:before:w-[5px] [&_li]:before:rounded-pill [&_li]:before:bg-content-muted [&_li]:before:content-['']
        [&_strong]:font-bold [&_strong]:text-content
        [&_ul]:space-y-2 ${className}`}
    >
      {children}
    </div>
  )
}

export function LegalPage({
  title,
  lede,
  sections,
}: {
  title: string
  lede: string
  sections: readonly LegalSection[]
}) {
  return (
    <>
      <PageHeader eyebrow="Legal" title={title} lede={lede} />

      <Section tone="page">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[220px_1fr] lg:gap-16">
            {/* min-w-0: a grid child's default min-width is `auto`, so the
                chip rail's content width would otherwise become the DOCUMENT
                width — every legal page scrolled sideways ~2000px on phones. */}
            <nav
              aria-label="On this page"
              className="min-w-0 lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start"
            >
              <h2 className="mb-4 text-eyebrow font-bold uppercase text-content-muted">
                On this page
              </h2>

              {/* A twelve-item vertical list would push the policy itself a
                  screen and a half down on a phone, so below lg it becomes a
                  scrolling rail of chips that bleeds to the container edge. */}
              <ol className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:block lg:space-y-1 lg:overflow-visible lg:px-0">
                {sections.map((section, i) => (
                  <li key={section.id} className="shrink-0">
                    <a
                      href={`#${section.id}`}
                      className="flex items-center gap-2 whitespace-nowrap rounded-pill border border-line bg-surface px-3.5 py-2 text-caption font-semibold text-content-secondary transition-colors hover:border-content-muted lg:whitespace-normal lg:items-start lg:rounded-lg lg:border-0 lg:bg-transparent lg:px-2 lg:py-1.5 lg:text-caption lg:font-normal lg:hover:bg-surface-alt lg:hover:text-content"
                    >
                      <span className="tabular-nums text-content-muted">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="min-w-0">
              <Alert tone="warning" title="Draft — pending legal review">
                This document describes how Sawa Cars actually operates today, written in
                plain language. It has not yet been reviewed by a qualified lawyer in Rwanda and
                is not legal advice. The version handed to you at a Sawa center governs any
                transaction.
              </Alert>

              <div className="mt-12 space-y-12">
                {sections.map((section) => (
                  <section key={section.id} id={section.id} className="scroll-mt-28">
                    <h2 className="text-title font-extrabold text-content">{section.heading}</h2>
                    {section.plain ? (
                      <div className="mt-4">{section.body}</div>
                    ) : (
                      <Prose className="mt-4">{section.body}</Prose>
                    )}
                  </section>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  )
}

export default LegalPage
