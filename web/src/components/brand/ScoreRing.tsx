import { PASS_THRESHOLD, SCORE_MAX } from '@/lib/inspection-policy'

// The inspection score, drawn. This is the one visual signature the site
// repeats — on a card, in the hero certificate, beside a listing's price —
// because the score is the product: a buyer should learn to read the ring
// before they learn the word "Certified".
//
// The arc is the score out of SCORE_MAX. A small tick marks PASS_THRESHOLD on
// the track, so every ring also shows how far above the publication bar the
// car cleared. Pure SVG, no client JS: it renders in the HTML a crawler sees.

export function ScoreRing({
  score,
  size = 44,
  stroke,
  tone = 'ink',
  label,
  className = '',
}: {
  score: number
  size?: number
  stroke?: number
  /** `ink` sits on paper; `light` sits on a photograph or an ink surface. */
  tone?: 'ink' | 'light'
  /** Accessible name. Defaults to "Inspection score 141 of 150". */
  label?: string
  className?: string
}) {
  const clamped = Math.max(0, Math.min(SCORE_MAX, Math.round(score)))
  const w = stroke ?? Math.max(3, Math.round(size / 11))
  const r = (size - w) / 2
  const c = 2 * Math.PI * r
  const filled = (clamped / SCORE_MAX) * c
  // Threshold tick, measured clockwise from 12 o'clock like the arc.
  const angle = (PASS_THRESHOLD / SCORE_MAX) * 2 * Math.PI - Math.PI / 2
  const tickIn = r - w / 2 - 1
  const tickOut = r + w / 2 + 1
  const cx = size / 2
  const light = tone === 'light'

  return (
    <span
      role="img"
      aria-label={label ?? `Inspection score ${clamped} of ${SCORE_MAX}`}
      className={`relative inline-grid shrink-0 place-items-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle
          cx={cx} cy={cx} r={r} fill="none" strokeWidth={w}
          className={light ? 'stroke-white/20' : 'stroke-line'}
        />
        <circle
          cx={cx} cy={cx} r={r} fill="none" strokeWidth={w} strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
          className="stroke-brand"
        />
      </svg>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="absolute inset-0">
        <line
          x1={cx + tickIn * Math.cos(angle)} y1={cx + tickIn * Math.sin(angle)}
          x2={cx + tickOut * Math.cos(angle)} y2={cx + tickOut * Math.sin(angle)}
          strokeWidth={Math.max(1.25, w / 2.5)}
          className={light ? 'stroke-white/70' : 'stroke-content'}
        />
      </svg>
      <span
        aria-hidden="true"
        className={`absolute inset-0 grid place-items-center font-extrabold tabular-nums tracking-[-0.03em] ${
          light ? 'text-white' : 'text-content'
        }`}
        style={{ fontSize: Math.round(size * 0.3) }}
      >
        {clamped}
      </span>
    </span>
  )
}

export default ScoreRing
