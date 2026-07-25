import { ImageResponse } from 'next/og'

// The home-screen icon iOS uses when someone adds the site to their home
// screen. iOS applies its own rounded mask and never respects transparency, so
// the soft field goes edge to edge and the car sits inside the safe area.

/** Edge runtime for the same reason as src/app/icon.tsx — the Node build of
 *  @vercel/og cannot locate its own font on Windows. */
export const runtime = 'edge'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const BRAND = '#DB0632'
const FIELD = '#F2F0EF'

/** Path data copied verbatim from CarPaths in src/components/brand/Logo.tsx. */
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

/** btoa, not Buffer — no Node globals in the edge runtime. */
const CAR_URI = `data:image/svg+xml;base64,${btoa(CAR_GLYPH)}`

export default function AppleIcon() {
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
        {/* 130 × 55 keeps the 742:312 ratio and stays clear of the iOS mask. */}
        <img src={CAR_URI} width={130} height={55} alt="" />
      </div>
    ),
    size
  )
}
