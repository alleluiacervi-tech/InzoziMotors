'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'

// The card's image area, made flickable — our translation of a colour-swatch
// carousel. AVATR lets you flick through paint finishes; what makes an Inzozi
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
}: {
  images: string[]
  alt: string
  sizes: string
  priority?: boolean
}) {
  const preview = images.slice(0, MAX_PREVIEW)
  const [index, setIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const multi = preview.length > 1

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
    setIndex((i) => (i + 1) % preview.length)
  }

  return (
    <div
      ref={ref}
      className="relative h-full w-full"
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
          // stacked, so flicking is instant once they're in. Contain, not
          // cover: studio photography shows the whole car on its background —
          // cropping a 2.7:1 side profile into 4:3 showed a door, not a car.
          className={`object-contain p-2 transition-opacity duration-200 ${
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
          {preview.map((src, i) => (
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
