'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'

// The card's image area, made flickable — our translation of a colour-swatch
// carousel. AVATR lets you flick through paint finishes; what makes a Sawa
// listing configurable-feeling is its standardized 36-angle photo set, so the
// card previews the first few angles on hover (pointer position steps through
// them) or tap (touch cycles).
//
// Renders as a plain image when the listing has fewer than 2 photos — the
// interaction only exists where the data backs it.

const MAX_PREVIEW = 4

export function CardPhotoFlick({
  images,
  alt,
  sizes,
  priority = false,
  fit = 'contain',
}: {
  images: string[]
  alt: string
  sizes: string
  priority?: boolean
  /** 'cover' for real inventory (shot 4:3 by our 36-angle flow, crops
   *  full-bleed like Encar); 'contain' for seeded press renders, whose 2.7:1
   *  side profiles crop into a door, not a car. The caller decides via
   *  isDemoListing — the same honesty gate as the badges. */
  fit?: 'cover' | 'contain'
}) {
  const available = images.slice(0, MAX_PREVIEW)
  const [index, setIndex] = useState(0)
  // Frames 2-4 are not mounted until somebody could actually use them.
  //
  // They are stacked in the same box as frame 1, so they are inside the
  // viewport whenever the card is and `loading=lazy` does not hold them back:
  // every card cost four full-width downloads to power a hover effect a phone
  // cannot perform. On the mobile listings page — the organic landing page, on
  // Rwandan mobile data — that is a straight 4x multiplier on the heaviest
  // thing the site ships.
  const [armed, setArmed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const preview = armed ? available : available.slice(0, 1)
  const multi = available.length > 1

  // Arm on the first hover with a real pointer. A touch device never fires
  // this, which is the point.
  const onPointerEnter = (e: React.PointerEvent) => {
    if (multi && e.pointerType !== 'touch') setArmed(true)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!multi || e.pointerType === 'touch') return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const next = Math.min(preview.length - 1, Math.max(0, Math.floor(ratio * preview.length)))
    setIndex(next)
  }

  const onTouchCycle = () => {
    if (!multi) return
    // A deliberate tap on the photo is somebody asking for the other angles,
    // so fetch them then — not on every card that scrolls past.
    if (!armed) { setArmed(true); return }
    setIndex((i) => (i + 1) % available.length)
  }

  return (
    <div
      ref={ref}
      className="relative h-full w-full"
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setIndex(0)}
      onTouchEnd={onTouchCycle}
    >
      {preview.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={i === 0 ? alt : ''}
          fill
          sizes={sizes}
          priority={priority && i === 0}
          // Only the first frame loads eagerly; the rest arrive lazily and sit
          // stacked, so flicking is instant once they're in.
          className={`${
            fit === 'cover' ? 'object-cover' : 'object-contain p-2'
          } transition-opacity duration-200 ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      {/* Angle indicator — appears only where flicking is possible */}
      {multi ? (
        <div
          aria-hidden="true"
          className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        >
          {available.map((src, i) => (
            <span
              key={src}
              className={`h-1 rounded-pill transition-all duration-200 ${
                i === index ? 'w-5 bg-white' : 'w-2.5 bg-white/50'
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default CardPhotoFlick
