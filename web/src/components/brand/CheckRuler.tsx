import type { CSSProperties } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// The 150-point ruler — the site's signature.
//
// One tick per checklist item, grouped into the seven categories at their real
// widths (Engine is 25 ticks, Tyres is 15), standing on a baseline like the
// graduations of a rule. It says "150 checks" without a word of copy, and it
// is drawn from data, never decoration:
//
//   result    one car's inspection: a tall tick per item earned, a short amber
//             one per item missed, missed items at the end of their category.
//   standard  the checklist itself: critical items stand taller than the rest.
//             A category's critical items are spread evenly across it, because
//             the count is exact and the order is not something a buyer reads.
//
// Pure markup, no client JS, so it is in the HTML a crawler receives. On first
// paint the ticks stand up left to right in one 1.1s pass — the page's single
// orchestrated motion — and `prefers-reduced-motion` skips it (globals.css).
// ─────────────────────────────────────────────────────────────────────────────

export interface RulerGroup {
  key: string
  /** Visible category name, already translated. */
  label: string
  /** Items in the category — one tick each. */
  max: number
  /** result mode: items earned. */
  earned?: number
  /** standard mode: how many of the items are critical. */
  critical?: number
  /** Second line under the label: "25/25", "25 · 4 critical". */
  meta?: string
}

const TONES = {
  paper: {
    full: 'bg-content',
    quiet: 'bg-content/30',
    missed: 'bg-warning',
    base: 'bg-content/25',
    label: 'text-content',
    meta: 'text-content-muted',
  },
  ink: {
    full: 'bg-white',
    quiet: 'bg-white/30',
    missed: 'bg-warning',
    base: 'bg-white/25',
    label: 'text-white',
    meta: 'text-white/60',
  },
} as const

/** Whether tick `i` of `n` is one of `c` evenly spread critical items. */
function isCritical(i: number, n: number, c: number) {
  if (c <= 0) return false
  return Math.floor(((i + 1) * c) / n) > Math.floor((i * c) / n)
}

export function CheckRuler({
  groups,
  mode,
  tone = 'paper',
  height = 44,
  labels = false,
  animate = true,
  label,
  className = '',
}: {
  groups: RulerGroup[]
  mode: 'result' | 'standard'
  tone?: keyof typeof TONES
  /** Tallest tick, in px. */
  height?: number
  /** Category names under each group, from md up (too narrow on a phone —
   *  callers that need them there render their own legend). */
  labels?: boolean
  animate?: boolean
  /** Accessible summary; the ticks themselves are hidden from assistive tech. */
  label: string
  className?: string
}) {
  const c = TONES[tone]
  let index = 0

  return (
    <div role="img" aria-label={label} className={`flex items-start gap-[clamp(5px,0.9vw,12px)] ${className}`}>
      {groups.map((g) => {
        const earned = Math.max(0, Math.min(g.max, g.earned ?? g.max))
        return (
          <div key={g.key} className="min-w-0" style={{ flex: `${g.max} 1 0%` }}>
            <div className="relative flex items-end justify-between" style={{ height }} aria-hidden="true">
              {Array.from({ length: g.max }, (_, i) => {
                const n = index++
                let cls: string
                let h: number
                if (mode === 'result') {
                  const hit = i < earned
                  cls = hit ? c.full : c.missed
                  h = hit ? (i % 5 === 0 ? 1 : 0.82) : 0.42
                } else {
                  const crit = isCritical(i, g.max, g.critical ?? 0)
                  cls = crit ? c.full : c.quiet
                  h = crit ? 1 : 0.5
                }
                const style: CSSProperties = { height: `${h * 100}%` }
                if (animate) style.animationDelay = `${120 + n * 4}ms`
                return (
                  <span
                    key={i}
                    className={`block w-px origin-bottom rounded-full sm:w-[2px] ${cls} ${
                      animate ? 'animate-tick motion-reduce:animate-none' : ''
                    }`}
                    style={style}
                  />
                )
              })}
            </div>
            <span aria-hidden="true" className={`mt-1.5 block h-px w-full ${c.base}`} />
            {labels ? (
              <p className="mt-3 hidden min-w-0 md:block">
                <span className={`block text-caption font-bold leading-snug text-balance ${c.label}`}>{g.label}</span>
                {g.meta ? (
                  <span className={`mt-0.5 block text-caption tabular-nums ${c.meta}`}>{g.meta}</span>
                ) : null}
              </p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export default CheckRuler
