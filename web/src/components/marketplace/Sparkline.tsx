import { formatDate, formatUSD } from '@/lib/business'
import type { PricePoint } from '@/lib/types'

// A price-history line drawn by hand, because pulling a charting library for
// one polyline would cost more kilobytes than the rest of this page.
//
// The line itself is neutral ink; only the point showing today's price gets
// brand red, since that point IS the price.

const VIEW_W = 240
const VIEW_H = 56
const PAD = 4

export function Sparkline({ points, className = '' }: { points: PricePoint[]; className?: string }) {
  // Two points is the minimum that says anything. One price is not a history.
  if (!Array.isArray(points) || points.length < 2) return null

  const values = points.map((point) => Number(point.price)).filter((n) => Number.isFinite(n))
  if (values.length < 2) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  const coords = values.map((value, index) => {
    const x = PAD + (index / (values.length - 1)) * (VIEW_W - PAD * 2)
    const y = PAD + (1 - (value - min) / span) * (VIEW_H - PAD * 2)
    return { x, y }
  })

  const line = coords.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')
  const area = `${PAD},${VIEW_H} ${line} ${(VIEW_W - PAD).toFixed(1)},${VIEW_H}`
  const last = coords[coords.length - 1]

  const opening = values[0]
  const current = values[values.length - 1]
  const direction = current < opening ? 'down' : current > opening ? 'up' : 'unchanged'

  return (
    <figure className={className}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        className="h-14 w-full text-content-muted"
        role="img"
        aria-label={`Asking price since listing: ${formatUSD(opening)} to ${formatUSD(current)} — ${direction}`}
      >
        <polygon points={area} fill="currentColor" opacity={0.1} />
        <polyline
          points={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={last.x} cy={last.y} r={3} className="fill-brand" />
      </svg>

      <figcaption className="mt-2 flex items-center justify-between text-micro text-content-muted">
        <span>
          {formatUSD(opening)} · {formatDate(points[0].at)}
        </span>
        <span className="font-bold text-content">
          {formatUSD(current)} · today
        </span>
      </figcaption>
    </figure>
  )
}

export default Sparkline
