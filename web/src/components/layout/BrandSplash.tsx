'use client'

import { useEffect, useState } from 'react'
import { LogoMark } from '@/components/brand/Logo'

/**
 * The site's opening moment: the Sawa mark turning clockwise over a clean
 * field while the first page loads, then a fade that hands over to the hero.
 *
 * Built like a professional splash, not a vanity delay:
 *   - It only covers REAL loading. It leaves on window `load` (or a 2.2s
 *     ceiling — a slow connection must never be punished twice), with a 900ms
 *     floor so it can never flicker.
 *   - Once per browser session. A tiny inline script in layout.tsx marks
 *     returning visits on <html> BEFORE first paint, and CSS hides this
 *     overlay under that class — repeat navigations never see it, without a
 *     flash. (Server-rendering the overlay is what makes it cover paint #1.)
 *   - Content stays in the DOM underneath: crawlers, readers and no-JS
 *     visitors are unaffected. The reduced-motion kill-switch in globals.css
 *     freezes the spin; the timing still releases the page.
 */
export function BrandSplash() {
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    // Repeat visit this session — the CSS class already hid us; just unmount.
    if (document.documentElement.classList.contains('splash-done')) {
      setGone(true)
      return
    }
    try { sessionStorage.setItem('sawa-splash', '1') } catch { /* private mode */ }

    const MIN = 900
    const MAX = 2200
    const t0 = performance.now()
    let maxTimer = 0
    let minTimer = 0

    const leave = () => {
      const elapsed = performance.now() - t0
      minTimer = window.setTimeout(() => setLeaving(true), Math.max(0, MIN - elapsed))
    }

    if (document.readyState === 'complete') leave()
    else {
      window.addEventListener('load', leave, { once: true })
      maxTimer = window.setTimeout(leave, MAX)
    }
    return () => { window.clearTimeout(maxTimer); window.clearTimeout(minTimer) }
  }, [])

  if (gone) return null

  return (
    <div
      id="brand-splash"
      aria-hidden="true"
      onTransitionEnd={() => leaving && setGone(true)}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-surface-page
                  transition-opacity duration-500 ease-brand ${leaving ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      {/* One turn every 1.1s — brisk enough to read as motion, slow enough to
          read as the mark rather than a blur. Clockwise, like time. */}
      <span className="animate-[spin_1.1s_cubic-bezier(0.45,0.05,0.55,0.95)_infinite]">
        <LogoMark size={64} id="splashMark" />
      </span>
      <span className="text-caption font-bold tracking-[0.14em] text-content-muted">
        SAWA CARS
      </span>
    </div>
  )
}

export default BrandSplash
