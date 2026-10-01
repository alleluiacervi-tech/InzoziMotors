'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui'
import { useT } from '@/lib/i18n/context'

/**
 * Every photo of the car. The first loads at once (it is the page's largest
 * element); the strip below lazy-loads, so a car with sixty photos costs no more
 * to open than one with six. Plain <img>: see KoreaCard for why.
 */
export function KoreaGallery({ photos, title }: { photos: string[]; title: string }) {
  const t = useT()
  const [active, setActive] = useState(0)
  const count = photos.length
  if (!count) return <div className="aspect-[4/3] rounded-2xl bg-surface-alt" />
  const go = (delta: number) => setActive((i) => (i + delta + count) % count)

  return (
    <div
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1) }}
      className="min-w-0"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-alt sm:aspect-[16/10]">
        {/* eslint-disable-next-line @next/next/no-img-element -- provider photo host */}
        <img
          key={photos[active]}
          src={photos[active]}
          alt={t('imports.korea.photoAlt', { title, index: active + 1, count })}
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain"
        />
        {count > 1 ? (
          <>
            <button type="button" onClick={() => go(-1)} aria-label={t('imports.korea.prevPhoto')}
              className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-ink-900/70 text-white hover:bg-ink-900">
              <Icon name="chevron-left" size={18} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label={t('imports.korea.nextPhoto')}
              className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-ink-900/70 text-white hover:bg-ink-900">
              <Icon name="chevron-right" size={18} aria-hidden="true" />
            </button>
            <span className="absolute bottom-2 right-2 rounded-pill bg-ink-900/80 px-2.5 py-1 text-micro font-bold text-white tabular-nums">
              {active + 1} / {count}
            </span>
          </>
        ) : null}
      </div>
      {count > 1 ? (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label={title}>
          {photos.map((src, i) => (
            <li key={src} className="shrink-0">
              <button type="button" onClick={() => setActive(i)} aria-current={i === active ? 'true' : undefined}
                aria-label={t('imports.korea.photoAlt', { title, index: i + 1, count })}
                className={`block h-16 w-24 overflow-hidden rounded-lg border-2 ${i === active ? 'border-brand' : 'border-transparent opacity-80 hover:opacity-100'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- provider photo host */}
                <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
