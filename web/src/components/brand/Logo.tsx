// The Inzozi Motors identity — a direct port of src/components/Logo.js.
// Same path data, same proportions, so the mark on the website and the mark in
// the app are pixel-identical rather than "close enough".

const BRAND = '#DB0632'
const FIELD = '#F2F0EF'

/**
 * Shared car silhouette. `glass` is the cut-out colour: set it to whatever the
 * mark sits on, exactly as in the React Native original.
 */
function CarPaths({ body = BRAND, glass = FIELD }: { body?: string; glass?: string }) {
  return (
    <g>
      <path
        d="M 150 520 C 150 494 160 480 188 472 L 250 456 C 262 452 271 446 279 436
           C 300 398 339 370 390 366 L 560 366 C 610 368 648 390 675 430
           C 689 450 705 460 724 464 L 812 478 C 850 484 872 498 872 524 L 872 550
           C 872 556 867 560 860 560 L 160 560 C 153 560 150 554 150 548 Z"
        fill={body}
      />
      <path d="M 316 450 C 332 410 360 388 392 386 L 468 386 L 468 450 Z" fill={glass} />
      <path d="M 484 386 L 556 386 C 596 388 622 410 636 450 L 484 450 Z" fill={glass} />
      <circle cx="340" cy="566" r="92" fill={glass} />
      <circle cx="706" cy="566" r="92" fill={glass} />
      <circle cx="340" cy="566" r="85" fill={body} />
      <circle cx="706" cy="566" r="85" fill={body} />
      <circle cx="340" cy="566" r="37" fill={glass} />
      <circle cx="706" cy="566" r="37" fill={glass} />
      <circle cx="340" cy="566" r="12.5" fill={body} />
      <circle cx="706" cy="566" r="12.5" fill={body} />
    </g>
  )
}

/** Plain car glyph on transparent — cut-outs take the colour of the surface. */
export function CarGlyph({
  width = 120,
  body = BRAND,
  glass = FIELD,
  className,
}: {
  width?: number
  body?: string
  glass?: string
  className?: string
}) {
  const height = width * (312 / 742)
  return (
    <svg
      width={width}
      height={height}
      viewBox="140 358 742 312"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <CarPaths body={body} glass={glass} />
    </svg>
  )
}

/** The canonical badge — red car centred on the soft circular field. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="50" cy="50" r="50" fill={FIELD} />
      <g transform="translate(50, 51)">
        <g transform="scale(0.082)">
          <g transform="translate(-511, -512)">
            <CarPaths body={BRAND} glass={FIELD} />
          </g>
        </g>
      </g>
    </svg>
  )
}

/**
 * Full lockup: mark + wordmark. The `<title>`-free SVGs above are decorative;
 * the accessible name comes from this component's text, so screen readers
 * announce "Inzozi Motors" once rather than twice.
 */
export function Logo({
  size = 20,
  tone = 'dark',
  className = '',
}: {
  size?: number
  tone?: 'dark' | 'light'
  className?: string
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size + 12} />
      <span
        className={`font-extrabold tracking-[-0.02em] ${
          tone === 'light' ? 'text-white' : 'text-content'
        }`}
        style={{ fontSize: size }}
      >
        Inzozi Motors
      </span>
    </span>
  )
}

export default Logo
