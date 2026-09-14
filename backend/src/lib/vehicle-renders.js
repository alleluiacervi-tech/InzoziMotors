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
// ── Why the results are stored rather than fetched live ──────────────────────
// The app never calls the vendor. The backend resolves each model once, keeps
// the URL, and serves it from our own payload. So a vendor outage, a rotated
// key or a price change never reaches a phone, and we are not hotlinking
// somebody else's CDN on every scroll.
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
 * Does the library actually hold this model?
 *
 * Returns { found, url } — `found: false` means fall back to the lettermark,
 * never to the URL. A network failure is reported as not-found rather than
 * thrown: a backfill over hundreds of models should skip what it cannot reach
 * and be re-runnable, not abort halfway and leave the catalogue half-resolved.
 */
async function resolveRender(make, model, { timeoutMs = 15000 } = {}) {
  const url = renderUrl(make, model);
  if (!url) return { found: false, url: null, reason: 'not_configured' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    // The header is the whole point. A 200 with found:false is the shroud.
    const found = res.ok && res.headers.get('x-imaginstudio-request-found') === 'true';
    return { found, url: found ? url : null, reason: found ? 'found' : 'no_match' };
  } catch (err) {
    return { found: false, url: null, reason: err.name === 'AbortError' ? 'timeout' : 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { rendersEnabled, renderUrl, resolveRender, slug };
