// ─────────────────────────────────────────────────────────────────────────────
// Candidate photographs from Wikimedia Commons.
//
// Free, real photography under CC BY / CC BY-SA / CC0, measured against this
// catalogue's own 233 models: a random sample of 45 put the right car in the
// top result 38 times out of 44 that answered (one request errored). Five of
// the six "misses" were the correct vehicle filed under its home-market name
// -- Isuzu NPR is "Isuzu Elf" on Commons, Mitsubishi Montero Sport is "Pajero
// Sport" -- which a filename check cannot tell apart from a genuine mistake.
// That is why this module only ever PROPOSES: nothing it returns reaches a
// buyer without a human looking at it. See catalog_image_candidates
// (migration 0047) and the /admin/catalog/find-images + /image-queue routes.
//
// ── Hotlinking, deliberately ──────────────────────────────────────────────
// Unlike the render library, there is no commercial key here to leak, no
// billing to protect and no rotation to survive -- upload.wikimedia.org is a
// public CDN built for exactly this kind of reuse, and hotlinking a Commons
// thumbnail is the standard, expected way every site that uses Commons uses
// it. So this stores the CDN url straight into `images[]` rather than
// downloading and re-hosting: one fewer moving part, and it is the same
// image Commons itself will keep serving.
//
// ── The one legal obligation this creates ──────────────────────────────────
// CC BY and CC BY-SA require attribution: the author's name, the licence,
// and (in practice) a link back to the source. That is why every candidate
// carries author/license_name/license_url/page_url, and why approving one
// writes those onto the catalogue row instead of discarding them -- the
// mobile and web clients render a credit line from exactly those columns.
// ─────────────────────────────────────────────────────────────────────────────

const ENDPOINT = 'https://commons.wikimedia.org/w/api.php';

// Wikimedia's API etiquette asks for an identifying User-Agent naming the
// application and a contact -- an anonymous default UA is the first thing
// their rate limiter penalises under load.
const USER_AGENT =
  process.env.COMMONS_USER_AGENT ||
  'SawaCarsImportCatalogue/1.0 (https://sawacars.com; contact via sawacars.com)';

/** "Land Cruiser Prado" + filetype filter, the same shape proven during research. */
function buildQuery(make, model) {
  return `${make} ${model} filetype:bitmap`;
}

function stripHtml(value) {
  return typeof value === 'string' ? value.replace(/<[^>]+>/g, '').trim() : null;
}

/**
 * Up to `limit` candidate photographs for one make/model, newest-relevance
 * first per Commons' own search ranking. Never throws: a network failure or
 * an empty result both come back as an empty array, because a backfill over
 * hundreds of models must skip what it cannot resolve and be re-runnable,
 * not abort.
 */
async function findCandidates(make, model, { limit = 3, timeoutMs = 20000 } = {}) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: buildQuery(make, model),
    gsrnamespace: '6', // File: namespace
    gsrlimit: String(Math.min(Math.max(limit, 1), 10)),
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '1024', // the size we would actually publish
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return [];
    const data = await res.json();
    // The generator=search shape nests results under query.pages, keyed by
    // page id in no guaranteed order -- Commons ranks via the `index` field.
    const pageMap = (data && data.query && data.query.pages) || {};
    const ordered = Object.values(pageMap).sort(
      (a, b) => (a.index ?? 99) - (b.index ?? 99)
    );

    return ordered
      .filter((page) => Array.isArray(page.imageinfo) && page.imageinfo.length)
      .map((page) => {
        const info = page.imageinfo[0];
        const meta = info.extmetadata || {};
        // A ?width= request returns a scaled thumbnail (thumburl) alongside
        // the original file (url). We publish the scaled copy -- the
        // original can be many megabytes and a phone never needs it.
        const publishUrl = info.thumburl || info.url;
        return {
          source: 'wikimedia_commons',
          title: page.title,
          image_url: publishUrl,
          thumb_url: info.thumburl || publishUrl,
          page_url: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
          author: stripHtml(meta.Artist && meta.Artist.value) || null,
          license_name: (meta.LicenseShortName && meta.LicenseShortName.value) || null,
          license_url: (meta.LicenseUrl && meta.LicenseUrl.value) || null,
          width: info.thumbwidth || info.width || null,
          height: info.thumbheight || info.height || null,
        };
      });
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { findCandidates };
