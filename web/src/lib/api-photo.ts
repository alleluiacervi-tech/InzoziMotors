// Listing photos straight from the API's resized copies, not through /_next/image.
//
// next/image normally fetches a photo from the API, re-encodes it and serves it
// from /_next/image on this server. Cloudflare's free plan cannot cache those
// answers: the URL has no file extension and the body varies with the Accept
// header (AVIF or WebP). So every photo crossed from Frankfurt on every visit.
//
// The API already resizes its own uploads (`?w=`, backend
// middleware/image-variants.js): always WebP, one body per URL, a one-year
// immutable header and a .jpg/.webp path. Cloudflare caches those in Kigali,
// and the app has used them from the start. Pointing the website at the same
// files gives it the same cache. AVIF is given up for WebP, about a fifth
// larger, which the nearer cache more than repays.
import type { ImageLoaderProps } from 'next/image'

/** Widths the API resizes to. Mirrors WIDTHS in backend/src/middleware/image-variants.js. */
export const API_PHOTO_WIDTHS = [200, 400, 800, 1200] as const

// Uploads are stored at 1600 px. Past this requested width (a desktop retina
// gallery) the original is closer than the 1200 copy, so it is sent instead;
// up to it (a phone at 3x is about 1170 px) the 1200 copy is enough.
const ORIGINAL_ABOVE = 1280

const RESIZABLE_PATH = /^\/uploads\/.+\.(jpe?g|png|webp)$/i

function isApiHost(url: URL): boolean {
  // Uploads live on the API host (api.sawacars.com), never on the website itself.
  if (url.protocol === 'https:') return url.hostname.endsWith('.sawacars.com')
  // The API on a developer machine or the Android emulator.
  return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '10.0.2.2')
}

/** True for a photo the API can resize: one of our own uploads, not already sized. */
export function isApiPhoto(src: unknown): src is string {
  if (typeof src !== 'string') return false
  let url: URL
  try {
    url = new URL(src)
  } catch {
    return false
  }
  return isApiHost(url) && RESIZABLE_PATH.test(url.pathname) && !url.searchParams.has('w')
}

/** next/image loader for API uploads: the smallest stored width that covers the request. */
export function apiPhotoLoader({ src, width }: ImageLoaderProps): string {
  if (width > ORIGINAL_ABOVE) return src
  const size = API_PHOTO_WIDTHS.find((w) => w >= width) ?? API_PHOTO_WIDTHS[API_PHOTO_WIDTHS.length - 1]
  return `${src}${src.includes('?') ? '&' : '?'}w=${size}`
}
