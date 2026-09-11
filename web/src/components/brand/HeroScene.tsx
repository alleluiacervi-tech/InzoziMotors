import { CarPaths } from './Logo'

// The brand illustration: the canonical car mark inside an inspection scene —
// a dashed measurement ring, tick marks, and three completed check nodes. Built
// entirely from brand geometry and tokens, so it is unmistakably ours and never
// a stock image standing in for a product we don't have pictures of yet.
//
// Used where a real listing photo is the first choice but none exists: the
// homepage hero fallback and the trust pages. Decorative — always aria-hidden;
// neighbouring copy carries the meaning.

const INK = '#38302C'
const LINE = '#E3DDD5'
const FIELD = '#F2EFEA'
const SUCCESS = '#16A34A'

/** A completed-check node on the measurement ring. */
function CheckNode({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle r="16" fill="#FFFFFF" stroke={LINE} strokeWidth="1.5" />
      <path
        d="M -6 0.5 L -1.5 5 L 6.5 -4.5"
        fill="none"
        stroke={SUCCESS}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}

export function HeroScene({ className = '' }: { className?: string }) {
  // Tick marks around the ring — the 150-point check, abstracted. Every sixth
  // tick is a major one, like a gauge.
  const CX = 280
  const CY = 210
  const ticks = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * Math.PI * 2 - Math.PI / 2
    const inner = 186
    const outer = i % 6 === 0 ? 174 : 180
    return {
      major: i % 6 === 0,
      x1: CX + Math.cos(angle) * inner,
      y1: CY + Math.sin(angle) * inner,
      x2: CX + Math.cos(angle) * outer,
      y2: CY + Math.sin(angle) * outer,
    }
  })

  return (
    <svg
      viewBox="0 0 560 420"
      className={className}
      aria-hidden="true"
      focusable="false"
      role="presentation"
    >
      {/* Soft circular field — the badge's ground, scaled up */}
      <circle cx="280" cy="210" r="164" fill={FIELD} />

      {/* Measurement ring with tick marks */}
      <circle
        cx="280"
        cy="210"
        r="186"
        fill="none"
        stroke={LINE}
        strokeWidth="1.5"
        strokeDasharray="3 7"
      />
      {ticks.map((t, i) => (
        <line
          key={i}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          stroke={LINE}
          strokeWidth={t.major ? 2 : 1.25}
          strokeLinecap="round"
        />
      ))}

      {/* Ground shadow */}
      <ellipse cx="280" cy="292" rx="118" ry="12" fill={INK} opacity="0.07" />

      {/* The mark itself — same paths as the app icon, at scene scale */}
      <g transform="translate(280, 216) scale(0.36) translate(-511, -512)">
        <CarPaths glass={FIELD} />
      </g>

      {/* Three checks complete — pass verdicts, in the semantic green that
          means "verified" everywhere else on the site */}
      <CheckNode x={118} y={100} />
      <CheckNode x={452} y={156} />
      <CheckNode x={162} y={330} />
    </svg>
  )
}

export default HeroScene
