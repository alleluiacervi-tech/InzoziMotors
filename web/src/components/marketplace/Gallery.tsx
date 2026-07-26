'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Icon } from '@/components/ui'

// ─────────────────────────────────────────────────────────────────────────────
// Listing gallery.
//
// Client-side only for the switching. The markup still renders on the server,
// so the first photo — the page's LCP element — ships in the HTML with its
// preload hint rather than waiting for hydration.
//
// Photos are ours: every listing is shot by an Inzozi photographer to the same
// 36-angle standard, which is why the frames are consistent enough to put in a
// fixed-ratio frame without letterboxing.
// ─────────────────────────────────────────────────────────────────────────────

export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0)

  if (!images.length) {
    return (
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-2xl border border-line-soft bg-surface-alt text-content-muted">
        <Icon name="camera" size={30} />
        <p className="px-6 text-center text-sm">
          Photos for this car are still being processed at the center.
        </p>
      </div>
    )
  }

  const count = images.length
  const go = (next: number) => setActive((next + count) % count)

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-alt sm:aspect-[16/10]">
        <Image
          key={images[active]}
          src={images[active]}
          alt={`${title} — photo ${active + 1} of ${count}, shot at an Inzozi inspection center`}
          fill
          sizes="(max-width: 1024px) 100vw, 780px"
          className="object-cover"
          priority={active === 0}
        />

        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(active - 1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-pill bg-surface/90 text-content shadow-card backdrop-blur transition-transform hover:scale-105"
            >
              <Icon name="chevron-left" size={20} />
            </button>
            <button
              type="button"
              onClick={() => go(active + 1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-pill bg-surface/90 text-content shadow-card backdrop-blur transition-transform hover:scale-105"
            >
              <Icon name="chevron-right" size={20} />
            </button>
            <p className="absolute bottom-3 right-3 rounded-pill bg-ink-900/70 px-3 py-1.5 text-micro font-bold text-white">
              {active + 1} / {count}
            </p>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <ul className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Choose a photo">
          {images.map((image, index) => (
            <li key={`${index}-${image}`} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show photo ${index + 1} of ${count}`}
                aria-current={index === active ? 'true' : undefined}
                className={`relative block h-16 w-24 overflow-hidden rounded-lg border-2 transition-colors ${
                  index === active
                    ? 'border-brand'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export default Gallery
