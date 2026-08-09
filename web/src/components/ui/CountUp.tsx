'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * A number that counts up when it scrolls into view — once, fast enough to
 * feel alive (1.1s), slow enough to be read climbing. The easing front-loads
 * the movement so the last few digits settle rather than snap.
 *
 * Honesty rules, same as everything else on this site:
 *   - The real value is in the DOM from the first server render (SEO, no-JS,
 *     and screen readers all see "150", never "0").
 *   - prefers-reduced-motion users get the final value with no animation.
 *   - tabular-nums, so the layout doesn't breathe while the digits change.
 */
export function CountUp({ value, className = '' }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        const t0 = performance.now()
        const DURATION = 1100
        const tick = (now: number) => {
          const p = Math.min(1, (now - t0) / DURATION)
          const eased = 1 - Math.pow(1 - p, 3) // cubic ease-out
          setDisplay(Math.round(value * eased))
          if (p < 1) raf = requestAnimationFrame(tick)
        }
        setDisplay(0)
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.6 }
    )
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [value])

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {display}
    </span>
  )
}

export default CountUp
