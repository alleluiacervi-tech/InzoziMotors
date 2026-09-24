'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/ui'
import { useT } from '@/lib/i18n/context'

// ─────────────────────────────────────────────────────────────────────────────
// Listing gallery, with a full-screen viewer.
//
// Client-side only for the switching. The markup still renders on the server,
// so the first photo — the page's LCP element — ships in the HTML with its
// preload hint rather than waiting for hydration.
//
// Galleries are flexible (listing_min_photos=1, six recommended), and photos
// arrive in whatever shape they were taken, so every frame is object-contain
// on the page's tinted panel: nothing is cropped into a door.
//
// The viewer is the part a buyer actually decides in: the whole screen, black,
// swipe or arrow keys to move, a tap to zoom into a panel gap or a tyre wall,
// Escape or the close button to leave — and focus returns to the photo that
// opened it. On a phone the inline gallery bleeds to the screen edges.
// ─────────────────────────────────────────────────────────────────────────────

/** Horizontal travel (px) a touch must cover to count as a swipe. */
const SWIPE = 45

function useSwipe(onPrev: () => void, onNext: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null)
  // A swipe ends in a pointerup, and the browser follows it with a click on
  // whatever is under the finger — which here opens the viewer or zooms. The
  // flag lets that click know it was the tail of a swipe, not a tap.
  const swiped = useRef(false)
  return {
    handlers: {
      onPointerDown: (e: ReactPointerEvent) => {
        swiped.current = false
        if (e.pointerType === 'mouse') return
        start.current = { x: e.clientX, y: e.clientY }
      },
      onPointerUp: (e: ReactPointerEvent) => {
        const s = start.current
        start.current = null
        if (!s) return
        const dx = e.clientX - s.x
        const dy = e.clientY - s.y
        // Mostly horizontal, and far enough: a vertical scroll is not a swipe.
        if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy) * 1.4) {
          swiped.current = true
          if (dx > 0) onPrev()
          else onNext()
        }
      },
    },
    /** True once, right after a swipe: the click that follows should be ignored. */
    consume: () => {
      const was = swiped.current
      swiped.current = false
      return was
    },
  }
}

export function Gallery({ images, title }: { images: string[]; title: string }) {
  const t = useT()
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const opener = useRef<HTMLButtonElement>(null)

  const count = images.length
  const go = useCallback((next: number) => setActive((next + count) % count), [count])
  const swipe = useSwipe(() => go(active - 1), () => go(active + 1))

  if (!count) {
    return (
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-2xl border border-line-soft bg-surface-alt text-content-muted">
        <Icon name="camera" size={30} />
        <p className="px-6 text-center text-caption">{t('cars.gallery.processing')}</p>
      </div>
    )
  }

  return (
    // Full-bleed below sm: the Container's 20px gutter is given back to the
    // photograph, which is what a car is bought on.
    <div className="-mx-5 sm:mx-0">
      <div
        className="relative aspect-[4/3] touch-pan-y overflow-hidden bg-surface-alt sm:aspect-[16/10] sm:rounded-2xl"
        tabIndex={count > 1 ? 0 : undefined}
        role={count > 1 ? 'region' : undefined}
        aria-label={count > 1 ? t('cars.gallery.galleryAria', { title }) : undefined}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') { event.preventDefault(); go(active - 1) }
          if (event.key === 'ArrowRight') { event.preventDefault(); go(active + 1) }
        }}
        {...(count > 1 ? swipe.handlers : {})}
      >
        {/* The photo itself opens the viewer. A real button, so it is
            reachable and announced; the image inside it is its content. */}
        <button
          ref={opener}
          type="button"
          onClick={() => { if (!swipe.consume()) setOpen(true) }}
          aria-label={t('cars.gallery.viewAll', { count })}
          className="absolute inset-0 block h-full w-full cursor-zoom-in focus-visible:ring-inset"
        >
          <Image
            key={images[active]}
            src={images[active]}
            alt={t('cars.gallery.photoAlt', { title, index: active + 1, count })}
            fill
            sizes="(max-width: 1024px) 100vw, 780px"
            className="object-contain sm:p-3"
            priority={active === 0}
          />
        </button>

        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(active - 1)}
              aria-label={t('cars.gallery.previous')}
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-pill bg-surface/90 text-content shadow-card backdrop-blur transition-transform hover:scale-105"
            >
              <Icon name="chevron-left" size={20} />
            </button>
            <button
              type="button"
              onClick={() => go(active + 1)}
              aria-label={t('cars.gallery.next')}
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-pill bg-surface/90 text-content shadow-card backdrop-blur transition-transform hover:scale-105"
            >
              <Icon name="chevron-right" size={20} />
            </button>
          </>
        ) : null}

        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pointer-events-auto inline-flex h-9 items-center gap-2 rounded-pill bg-surface/95 px-3.5 text-micro font-bold text-content shadow-card backdrop-blur transition-colors hover:bg-surface"
          >
            <Icon name="grid" size={14} aria-hidden="true" />
            {t('cars.gallery.viewAll', { count })}
          </button>
          {count > 1 ? (
            <p aria-live="polite" className="rounded-pill bg-ink-900/70 px-3 py-1.5 text-micro font-bold tabular-nums text-white">
              {active + 1} / {count}
            </p>
          ) : null}
        </div>
      </div>

      {count > 1 ? (
        <ul className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-5 pb-1 sm:px-0" aria-label={t('cars.gallery.choosePhoto')}>
          {images.map((image, index) => (
            <li key={`${index}-${image}`} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={t('cars.gallery.showPhoto', { index: index + 1, count })}
                aria-current={index === active ? 'true' : undefined}
                className={`relative block h-16 w-24 overflow-hidden rounded-lg border-2 bg-surface-alt transition-colors ${
                  index === active ? 'border-brand' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <Image src={image} alt="" fill sizes="96px" className="object-contain p-1" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <Viewer
          images={images}
          title={title}
          index={active}
          onIndex={setActive}
          onClose={() => {
            setOpen(false)
            // Back to where the visitor was, not to the top of the document.
            requestAnimationFrame(() => opener.current?.focus())
          }}
        />
      ) : null}
    </div>
  )
}

function Viewer({
  images,
  title,
  index,
  onIndex,
  onClose,
}: {
  images: string[]
  title: string
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}) {
  const t = useT()
  const count = images.length
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const go = useCallback(
    (next: number) => {
      setZoom(null)
      onIndex((next + count) % count)
    },
    [count, onIndex],
  )
  const swipe = useSwipe(() => go(index - 1), () => go(index + 1))

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => { document.body.style.overflow = previous }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1) }
      else if (e.key === 'Tab' && dialogRef.current) {
        // Keep focus inside the dialog while it is open.
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button')
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, index, onClose])

  const control =
    'flex h-12 w-12 items-center justify-center rounded-pill bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20'

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('cars.gallery.viewerLabel', { title })}
      className="fixed inset-0 z-[120] flex flex-col bg-black text-white animate-fade-in"
    >
      <div className="flex items-center justify-between gap-4 px-4 pt-[calc(env(safe-area-inset-top)+12px)] sm:px-6">
        <p className="min-w-0 truncate text-caption font-semibold text-white/80">
          <span className="tabular-nums text-white">{index + 1} / {count}</span>
          <span className="ml-3 hidden sm:inline">{title}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom(zoom ? null : { x: 50, y: 50 })}
            aria-label={zoom ? t('cars.gallery.zoomOut') : t('cars.gallery.zoomIn')}
            aria-pressed={!!zoom}
            className={control}
          >
            <Icon name={zoom ? 'minus' : 'plus'} size={20} />
          </button>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('cars.gallery.close')} className={control}>
            <Icon name="close" size={20} />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 touch-pan-y overflow-hidden" {...(zoom ? {} : swipe.handlers)}>
        {/* A tap zooms to where it landed; a second tap returns to the whole
            car. The transform is the only thing that moves. */}
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={(e) => {
            if (swipe.consume()) return
            if (zoom) return setZoom(null)
            const r = e.currentTarget.getBoundingClientRect()
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
          }}
          className={`absolute inset-0 block h-full w-full ${zoom ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
        >
          <Image
            key={images[index]}
            src={images[index]}
            alt={t('cars.gallery.photoAlt', { title, index: index + 1, count })}
            fill
            sizes="100vw"
            quality={90}
            className="object-contain transition-transform duration-300 ease-brand"
            style={
              zoom
                ? { transform: 'scale(2.2)', transformOrigin: `${zoom.x}% ${zoom.y}%` }
                : undefined
            }
          />
        </button>

        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label={t('cars.gallery.previous')}
              className={`absolute left-3 top-1/2 -translate-y-1/2 sm:left-6 ${control}`}
            >
              <Icon name="chevron-left" size={22} />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label={t('cars.gallery.next')}
              className={`absolute right-3 top-1/2 -translate-y-1/2 sm:right-6 ${control}`}
            >
              <Icon name="chevron-right" size={22} />
            </button>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <ul
          className="no-scrollbar flex justify-start gap-2 overflow-x-auto px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3 sm:justify-center"
          aria-label={t('cars.gallery.choosePhoto')}
        >
          {images.map((image, i) => (
            <li key={`${i}-${image}`} className="shrink-0">
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={t('cars.gallery.showPhoto', { index: i + 1, count })}
                aria-current={i === index ? 'true' : undefined}
                className={`relative block h-14 w-20 overflow-hidden rounded-lg border-2 transition-opacity ${
                  i === index ? 'border-white' : 'border-transparent opacity-50 hover:opacity-90'
                }`}
              >
                <Image src={image} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>,
    document.body,
  )
}

export default Gallery
