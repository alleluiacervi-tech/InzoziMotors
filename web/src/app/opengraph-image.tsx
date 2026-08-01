import { ImageResponse } from 'next/og'
import { SITE } from '@/lib/site'

// The card that shows up when someone shares sawacars.com in WhatsApp — by
// far the most common way a Rwandan buyer meets this site for the first time.
//
// next/og ships exactly one font (Noto Sans 400), and loading Inter over the
// network at build time would make the image a build-time dependency on Google.
// So hierarchy here is carried by size, colour and letter-spacing rather than
// weight. Red appears only in the mark and the eyebrow — the same discipline as
// the rest of the site.

/** Edge runtime for the same reason as src/app/icon.tsx — the Node build of
 *  @vercel/og cannot locate its own font on Windows, which fails the build. */
export const runtime = 'edge'

export const alt = `${SITE.name} — ${SITE.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const BRAND = '#C63F3D'
const FIELD = '#F2F0EF'
const INK = '#1B1313'
const SECONDARY = '#423737'
const MUTED = '#7A6E6E'
const PAGE = '#FAF8F8'
const LINE = '#E8E3E3'

/** Path data copied verbatim from CarPaths in src/components/brand/Logo.tsx.
 *  Satori cannot draw arbitrary SVG children, so the mark is passed as an image. */
const CAR_PATHS =
  `<path d="M 150 520 C 150 494 160 480 188 472 L 250 456 C 262 452 271 446 279 436 C 300 398 339 370 390 366 L 560 366 C 610 368 648 390 675 430 C 689 450 705 460 724 464 L 812 478 C 850 484 872 498 872 524 L 872 550 C 872 556 867 560 860 560 L 160 560 C 153 560 150 554 150 548 Z" fill="${BRAND}"/>` +
  `<path d="M 316 450 C 332 410 360 388 392 386 L 468 386 L 468 450 Z" fill="${FIELD}"/>` +
  `<path d="M 484 386 L 556 386 C 596 388 622 410 636 450 L 484 450 Z" fill="${FIELD}"/>` +
  `<circle cx="340" cy="566" r="92" fill="${FIELD}"/><circle cx="706" cy="566" r="92" fill="${FIELD}"/>` +
  `<circle cx="340" cy="566" r="85" fill="${BRAND}"/><circle cx="706" cy="566" r="85" fill="${BRAND}"/>` +
  `<circle cx="340" cy="566" r="37" fill="${FIELD}"/><circle cx="706" cy="566" r="37" fill="${FIELD}"/>` +
  `<circle cx="340" cy="566" r="12.5" fill="${BRAND}"/><circle cx="706" cy="566" r="12.5" fill="${BRAND}"/>`

const LOGO_MARK =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
  `<circle cx="50" cy="50" r="50" fill="${FIELD}"/>` +
  `<g transform="translate(50 51) scale(0.082) translate(-511 -512)">${CAR_PATHS}</g>` +
  `</svg>`

/** btoa, not Buffer — no Node globals in the edge runtime. */
const MARK_URI = `data:image/svg+xml;base64,${btoa(LOGO_MARK)}`

/** Falls back to the bare string if SITE.url is ever set to something odd —
 *  an unparseable env var must not take the whole image route down. */
function displayHost(): string {
  try {
    return new URL(SITE.url).host
  } catch {
    return SITE.url
  }
}

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          background: PAGE,
          padding: '72px 80px',
        }}
      >
        {/* Lockup */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src={MARK_URI} width={92} height={92} alt="" />
          <div
            style={{
              display: 'flex',
              marginLeft: 22,
              fontSize: 44,
              color: INK,
              letterSpacing: '-0.02em',
            }}
          >
            {SITE.name}
          </div>
        </div>

        {/* Positioning */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 21, color: BRAND, letterSpacing: '0.2em' }}>
            150-POINT INSPECTED
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 20,
              fontSize: 70,
              color: INK,
              letterSpacing: '-0.035em',
              lineHeight: 1.04,
            }}
          >
            {SITE.tagline}
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 24,
              maxWidth: 880,
              fontSize: 27,
              color: SECONDARY,
              lineHeight: 1.45,
            }}
          >
            Every car is physically inspected, photographed by our team, and backed by a 7-day
            drive-it guarantee.
          </div>
        </div>

        {/* Footer rule */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: `1px solid ${LINE}`,
            paddingTop: 26,
            fontSize: 24,
            color: MUTED,
          }}
        >
          <div style={{ display: 'flex' }}>{displayHost()}</div>
          <div style={{ display: 'flex' }}>Buy · Rent · Sell · Kigali</div>
        </div>
      </div>
    ),
    size
  )
}
