import { ImageResponse } from 'next/og'

// The favicon, generated rather than checked in as a binary — one source of
// geometry for the whole identity instead of a PNG that silently drifts from
// the mark in src/components/brand/Logo.tsx.
//
// At 32px the canonical circular field reads as a grey dot, so the field goes
// full-bleed and the car is drawn larger. Same two colours, same silhouette:
// red car on the soft field.

// Edge runtime, deliberately. The Node build of the bundled @vercel/og reads
// its font and wasm through `path.join(import.meta.url, …)`, which produces a
// broken path on Windows — so with the default runtime `next build` fails on a
// Windows dev machine (verified against Next 15.1.3) while succeeding in the
// Linux image. The edge build takes those assets through the bundler instead
// and works on both. Cost: the route is served on demand rather than
// prerendered, which the immutable one-year cache-control makes irrelevant.
export const runtime = 'edge'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

const BRAND = '#DB0632'
const FIELD = '#F2F0EF'

/** Path data copied verbatim from CarPaths in Logo.tsx. Satori cannot draw
 *  arbitrary SVG children, so the glyph is handed to it as a data-URI image. */
const CAR_GLYPH =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="140 358 742 312">` +
  `<path d="M 150 520 C 150 494 160 480 188 472 L 250 456 C 262 452 271 446 279 436 C 300 398 339 370 390 366 L 560 366 C 610 368 648 390 675 430 C 689 450 705 460 724 464 L 812 478 C 850 484 872 498 872 524 L 872 550 C 872 556 867 560 860 560 L 160 560 C 153 560 150 554 150 548 Z" fill="${BRAND}"/>` +
  `<path d="M 316 450 C 332 410 360 388 392 386 L 468 386 L 468 450 Z" fill="${FIELD}"/>` +
  `<path d="M 484 386 L 556 386 C 596 388 622 410 636 450 L 484 450 Z" fill="${FIELD}"/>` +
  `<circle cx="340" cy="566" r="92" fill="${FIELD}"/><circle cx="706" cy="566" r="92" fill="${FIELD}"/>` +
  `<circle cx="340" cy="566" r="85" fill="${BRAND}"/><circle cx="706" cy="566" r="85" fill="${BRAND}"/>` +
  `<circle cx="340" cy="566" r="37" fill="${FIELD}"/><circle cx="706" cy="566" r="37" fill="${FIELD}"/>` +
  `<circle cx="340" cy="566" r="12.5" fill="${BRAND}"/><circle cx="706" cy="566" r="12.5" fill="${BRAND}"/>` +
  `</svg>`

// btoa, not Buffer — the edge runtime has no Node globals. The glyph is pure
// ASCII, so latin1 encoding is safe.
const CAR_URI = `data:image/svg+xml;base64,${btoa(CAR_GLYPH)}`

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background: FIELD,
        }}
      >
        {/* 742 × 312 in glyph units — 26px wide keeps the proportion exact. */}
        <img src={CAR_URI} width={26} height={11} alt="" />
      </div>
    ),
    size
  )
}
