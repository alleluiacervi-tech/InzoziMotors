import type { ReactNode } from 'react'
import { CarGlyph } from '@/components/brand/Logo'
import { Container } from '@/components/ui'

/**
 * The one sanctioned page closer. Every page that ends on an ink moment ends on
 * THIS one: ink-800 (a visible step above the ink-900 footer, separated by a
 * hairline), the brand's own car glyph at scale as a watermark — the imagery
 * strategy for dark sections — and exactly two actions: one primary, one
 * inverse. Rule: maximum one ink band per page before the footer.
 */
export function InkClose({
  headline,
  children,
  actions,
}: {
  headline: ReactNode
  /** One paragraph. More belongs in the page body, not the closer. */
  children: ReactNode
  /** Exactly two buttons: one `primary`, one `inverse`. */
  actions: ReactNode
}) {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.06] bg-ink-800 py-16 text-white sm:py-24">
      {/* The mark, finally used at size. Decorative — hidden from readers. */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 top-1/2 -translate-y-1/2 opacity-[0.07]">
        <CarGlyph width={480} body="#3A2D29" glass="#281F1C" />
      </div>

      <Container className="relative">
        <div className="max-w-2xl">
          <h2 className="text-headline font-extrabold">{headline}</h2>
          <p className="mt-4 text-title-sm leading-relaxed text-white/70">{children}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">{actions}</div>
        </div>
      </Container>
    </section>
  )
}

export default InkClose
