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
  imagePresentation = 'backdrop',
}: {
  headline: ReactNode
  /** One paragraph. More belongs in the page body, not the closer. */
  children: ReactNode
  /** Exactly two buttons: one `primary`, one `inverse`. */
  actions: ReactNode
  /** Optional photographic backdrop. */
  image?: { src: string; alt: string }
  /** Portrait keeps a vertical photograph intact on the right instead of
   *  stretching it behind the full copy block. */
  imagePresentation?: 'backdrop' | 'portrait'
}) {
  const portrait = Boolean(image && imagePresentation === 'portrait')

  return (
    // `ambient-ink` and `grain` are the same two utilities the hero uses
    // (globals.css). A closing band and an opening band lit by the same rig is
    // what makes a page read as one room rather than two.
    <section className={`ambient-ink grain relative isolate overflow-hidden border-b border-white/[0.06] bg-ink-800 text-white ${portrait ? 'py-16 sm:py-24 lg:min-h-[580px] lg:py-28' : 'py-20 sm:py-28'}`}>
      {image ? (
        portrait ? (
          <>
            {/* An editorial split for portrait photography: the picture owns
                the right edge at its natural orientation instead of becoming
                a badly cropped full-width wallpaper. */}
            <div className="absolute inset-y-0 right-0 w-full lg:w-[48%]">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 48vw"
                className="object-cover object-[center_48%]"
              />
            </div>
            {/* On phones the photograph becomes atmosphere; on large screens
                this is only a soft seam between ink and workshop. */}
            <div className="absolute inset-0 bg-ink-900/85 lg:bg-transparent" />
            <div className="absolute inset-0 hidden bg-gradient-to-r from-ink-900 via-ink-900 lg:block lg:via-[54%] lg:to-transparent lg:to-[78%]" />
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink-900/70 to-transparent" />
          </>
        ) : (
          <>
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="100vw"
              // object-[50%_35%] rather than centre: on a wide crop of a car
              // park the interesting half is the roofline and the receding
              // row, not the tarmac.
              className="object-cover object-[50%_35%]"
            />
            {/* Ink flows from the text side: near-solid where the words live,
                open where the photograph earns its keep. */}
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-ink-900/95 via-ink-900/78 to-ink-900/35" />
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-900/65 to-transparent" />
          </>
        )
      ) : (
        // The mark, finally used at size. Decorative — hidden from readers.
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 top-1/2 -translate-y-1/2 opacity-[0.07]">
          <CarGlyph width={480} body="#38302C" glass="#241F1D" />
        </div>
      )}

      {/* z-10 lifts the copy above the grain layer, which is a ::after and
          would otherwise paint on top of it. */}
      <Container className="relative z-10">
        <div className={portrait ? 'max-w-2xl lg:max-w-[52%]' : 'max-w-2xl'}>
          {/* A short brand rule above the headline. It is the same piece of
              magazine furniture the Eyebrow component draws, borrowed here so
              the closer opens the way every section on the site opens — and it
              is the one red mark on an otherwise monochrome band. */}
          <span aria-hidden="true" className="mb-6 block h-0.5 w-12 rounded-full bg-brand" />
          <h2 className="text-headline font-extrabold">{headline}</h2>
          <p className="mt-5 max-w-prose text-title-sm leading-relaxed text-pretty text-white/70">{children}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">{actions}</div>
        </div>
      </Container>
    </section>
  )
}

export default InkClose
