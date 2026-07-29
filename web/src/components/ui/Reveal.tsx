'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

// Scroll-reveal: fades content up as it enters the viewport, with an optional
// stagger delay. Progressive enhancement done honestly:
//   - Before hydration / without JavaScript, content is VISIBLE (the hidden
//     state is only applied once JS confirms it can also remove it).
//   - prefers-reduced-motion users get no movement — the global CSS kill-switch
//     zeroes every transition, so the reveal collapses to "just visible".
//   - Once revealed, the observer disconnects; this never re-hides content.

export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode
  /** Stagger offset in ms — pass index * 90 for cascades. */
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  // null = JS not yet in charge (render visible); false = armed and hidden;
  // true = revealed.
  const [shown, setShown] = useState<boolean | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return

    // Already on screen at hydration — reveal immediately, no pop.
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight * 0.9) {
      setShown(true)
      return
    }

    setShown(false)
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -48px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown === true ? `${delay}ms` : undefined }}
      className={`transition-all duration-700 ease-brand ${
        shown === false ? 'translate-y-5 opacity-0' : 'translate-y-0 opacity-100'
      } ${className}`}
    >
      {children}
    </div>
  )
}

export default Reveal
