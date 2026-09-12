// ─────────────────────────────────────────────────────────────────────────────
// Ask for the photo at the size it will be drawn.
//
// Every listing photo is stored once, at 1600×1200, averaging 488 KB. A card
// draws it about 400 points wide, so without a width the app downloads roughly
// twenty-five times the bytes it can display and throws the rest away. Measured
// on the real marketplace photos: a twenty-car feed of covers costs 9.53 MB
// as stored and 0.39 MB at ?w=400.
//
// The website never had this problem — next/image re-encodes at the requested
// width — which is why it went unnoticed on the side where most of the traffic
// will actually be.
//
// The `w` values here must be in the allowlist in
// backend/src/middleware/image-variants.js; anything else is served the full
// photo, silently. That is the safe failure, but it is also a silent one, so
// the sizes live in one place on each side and are named the same.
// ─────────────────────────────────────────────────────────────────────────────

/** Widths the API will resize to. Mirrors WIDTHS in the middleware. */
export const PHOTO = {
  THUMB: 200,   // avatars, tiny chat previews
  CARD: 400,    // a feed card
  WIDE: 800,    // full-width phone hero, and a retina card
  ZOOM: 1200,   // the gallery viewer
};

/** Only OUR uploads are resizable via query param ?w=. */
export function isOwnUpload(url) {
  return typeof url === 'string' && url.includes('/uploads/');
}

/** Detect Cloudinary delivery URLs. */
export function isCloudinaryUrl(url) {
  return typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/upload/');
}

/**
 * Injects dynamic Cloudinary transformations for high-speed delivery:
 *  - f_auto: best format supported by client (WebP/AVIF)
 *  - q_auto: optimal perceptual quality compression
 *  - w_${width},c_limit: downscale to viewport width without upscaling
 */
export function transformCloudinaryUrl(url, width) {
  if (!isCloudinaryUrl(url)) return url;
  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  const prefix = url.slice(0, idx + marker.length);
  const remainder = url.slice(idx + marker.length);

  const transform = `f_auto,q_auto${width ? `,w_${width},c_limit` : ''}`;

  // If already has transformation parameters right after /upload/ (e.g. w_400,q_auto/v123):
  const firstSlash = remainder.indexOf('/');
  if (firstSlash !== -1) {
    const segment = remainder.slice(0, firstSlash);
    if (/(?:^|,)(?:[a-z]{1,2}_|f_auto|q_auto)/.test(segment)) {
      return `${prefix}${transform}/${remainder.slice(firstSlash + 1)}`;
    }
  }

  return `${prefix}${transform}/${remainder}`;
}

/**
 * @param {string} url    the stored photo URL
 * @param {number} width  one of PHOTO.*
 * @returns {string} the same URL, asking for that width where that is possible
 */
export function photoUrl(url, width) {
  if (!url || typeof url !== 'string') return url;
  if (isCloudinaryUrl(url)) {
    return transformCloudinaryUrl(url, width);
  }
  if (!isOwnUpload(url) || !width) return url;
  // A URL that already carries a width — from a cached list, say — must not
  // gain a second one.
  if (/[?&]w=\d+/.test(url)) return url;
  return url + (url.includes('?') ? '&' : '?') + `w=${width}`;
}

/** The common case: `source={photoSource(car.images[0], PHOTO.CARD)}`. */
export function photoSource(url, width) {
  const uri = photoUrl(url, width);
  return uri ? { uri } : undefined;
}
