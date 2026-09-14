// ─────────────────────────────────────────────────────────────────────────────
// Studio renders for catalogue models.
//
// The import catalogue carries no photographs, deliberately: the version before
// it drew 33 image references from 7 recycled stock pictures, so a Hilux and a
// BYD Atto 3 showed the same car. A licensed automotive render library fixes
// that properly — one angle, one ground, the actual vehicle — and this module
// is the only place that talks to it.
//
// ── Off unless configured, and that is the important part ────────────────────
// Without VEHICLE_RENDER_CUSTOMER this module resolves nothing and every caller
// falls back to the brand lettermark. The vendor's free demo key returns
// WATERMARKED images; shipping those to buyers would be worse than showing no
// picture at all, so there is no default key and no "try it and see". Set the
// variable only once a commercial key exists.
//
// ── Why the bytes are copied, not the URL ────────────────────────────────────
// The backend downloads each render once and stores it in our own object
// storage; what the catalogue serves is our URL. The first version of this file
// stored the VENDOR's URL instead, which was wrong in three ways at once, and
// the middle one is a credential leak:
//
//   · the URL contains `customer=<commercial key>`, and /imports/catalog is
//     PUBLIC — so anyone reading the catalogue could lift the key and bill the
//     licence to their own traffic;
//   · every phone then fetched from the vendor's CDN on every scroll, which is
//     the hotlinking this was supposed to avoid;
//   · rotating the key would break every stored image at once.
//
// So the vendor URL is now internal to this module. It is built, fetched from,
// and discarded; it is never returned to a caller and never written to a row.
//
// ── The one rule that matters ────────────────────────────────────────────────
// A miss must never be rendered. Ask this library for a model it does not have
// and it returns a generic shrouded-car silhouette with HTTP 200 — visually a
// picture, semantically nothing, and exactly the bug this catalogue was
// rebuilt to remove. It does say so, in `x-imaginstudio-request-found`, and
// resolveRender() believes that header and nothing else.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = process.env.VEHICLE_RENDER_BASE || 'https://cdn.imagin.studio/getimage';
const CUSTOMER = process.env.VEHICLE_RENDER_CUSTOMER || '';

// Three-quarter front. The angle every dealer photograph uses, because it shows
// the face and the flank at once and reads at card size.
const ANGLE = '23';

/** Configured at all? Callers use this to decide whether to bother. */
function rendersEnabled() {
  return Boolean(CUSTOMER);
}

/** "Land Cruiser Prado" -> "landcruiserprado". The vendor keys on a squashed slug. */
function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * The URL for a model, or null when renders are not configured.
 * Building a URL is not a promise that an image exists — resolveRender() is
 * what establishes that.
 */
function renderUrl(make, model, { width = 640, fileType = 'webp' } = {}) {
  if (!rendersEnabled()) return null;
  if (!slug(make) || !slug(model)) return null;
  const params = new URLSearchParams({
    customer: CUSTOMER,
    make: slug(make),
    modelFamily: slug(model),
    angle: ANGLE,
    width: String(width),
    fileType,
    // Rwanda drives on the right, so the wheel is on the left. The default
    // follows the vendor's market guess, which would hand a Japanese-market
    // model a right-hand wheel and make every buyer wonder what they are being
    // sold.
    steering: 'lhd',
  });
  return `${BASE}?${params.toString()}`;
}

/**
 * Does the library hold this model, and if so what are the bytes?
 *
 * Returns { status, buffer, contentType }:
 *   'found'        the library has it; `buffer` is the image
 *   'no_match'     a SUCCESSFUL answer saying it does not have this model
 *   'unreachable'  the request failed, or the server returned an error status
 *   'timeout'      it did not answer in time
 *
 * The distinction between 'no_match' and 'unreachable' is what makes a backfill
 * re-runnable. 'no_match' is a settled fact and is never re-asked; the other two
 * are transient and are retried. An earlier version folded every non-OK
 * response into 'no_match', so a single 429 or 502 — exactly what a few hundred
 * sequential requests will provoke — marked that model as permanently absent
 * and no re-run would ever look at it again.
 *
 * Never throws. A backfill over hundreds of models should skip what it cannot
 * reach and be resumable, not abort halfway.
 */
async function fetchRender(make, model, { timeoutMs = 20000 } = {}) {
  const url = renderUrl(make, model);
  if (!url) return { status: 'not_configured' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });

    // An error status says nothing about whether the model exists.
    if (!res.ok) return { status: 'unreachable', httpStatus: res.status };

    // 200 with found:false is the vendor's shrouded-car placeholder — a picture
    // of no car in particular. Believing the header rather than the bytes is
    // what stops this catalogue from showing a generic silhouette as a Hilux.
    if (res.headers.get('x-imaginstudio-request-found') !== 'true') {
      return { status: 'no_match' };
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length) return { status: 'unreachable', httpStatus: res.status };
    return {
      status: 'found',
      buffer,
      contentType: res.headers.get('content-type') || 'image/webp',
    };
  } catch (err) {
    return { status: err.name === 'AbortError' ? 'timeout' : 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

// renderUrl is NOT exported: it carries the commercial key, and the only
// correct thing to do with it is fetch from it inside this module.
module.exports = { rendersEnabled, fetchRender, slug };
