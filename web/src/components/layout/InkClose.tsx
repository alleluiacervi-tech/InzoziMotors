import Image from 'next/image'
import type { ReactNode } from 'react'
import { CarGlyph } from '@/components/brand/Logo'
import { Container } from '@/components/ui'

/**
 * The one sanctioned page closer. Every page that ends on an ink moment ends on
 * THIS one: ink-800 (a visible step above the ink-900 footer, separated by a
 * hairline), and exactly two actions: one primary, one inverse. Rule: maximum
 * one ink band per page before the footer.
 *
 * Two backdrops, one contract:
 *   default — the brand's own car glyph at scale as a watermark.
 *   image   — a real photograph under an ink gradient that runs darkest where
 *             the text sits, so the closer carries a place instead of a
 *             pattern. The copy never competes with the picture: the left
 *             third is near-solid ink.
 */
export function InkClose({
  headline,
  children,
  actions,
  image,
}: {
  headline: ReactNode
  /** One paragraph. More belongs in the page body, not the closer. */
  children: ReactNode
  /** Exactly two buttons: one `primary`, one `inverse`. */
  actions: ReactNode
  /** Optional photographic backdrop. */
  image?: { src: string; alt: string }
}) {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.06] bg-ink-800 py-16 text-white sm:py-24">
      {image ? (
        <>
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="100vw"
            className="object-cover"
          />
          {/* Ink flows from the text side: near-solid where the words live,
              open where the photograph earns its keep. */}
          <div className="absolute inset-0 bg-gradient-to-r from-ink-900/95 via-ink-900/75 to-ink-900/35" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-900/60 to-transparent" />
        </>
      ) : (
        // The mark, finally used at size. Decorative — hidden from readers.
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 top-1/2 -translate-y-1/2 opacity-[0.07]">
          <CarGlyph width={480} body="#3A2D29" glass="#281F1C" />
        </div>
      )}

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
