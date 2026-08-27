// ─────────────────────────────────────────────────────────────────────────────
// The Sawa Cars plate badge.
//
// A registration plate is personal data. It identifies a vehicle, and through
// the registry a person, so it does not belong on a public listing photo.
//
// ── Why the badge is GENERATED, not a PNG ────────────────────────────────────
// Plates differ in size and the badge has to fit each one. A raster asset
// stretched to a large plate goes soft and squeezed onto a small one turns the
// wordmark to mud. Generating the artwork as SVG at exactly the pixel size
// needed means it is sharp at every plate on every photo, and the design lives
// in code where it can be changed without shipping a binary.
//
// ── Why there is a render assertion ─────────────────────────────────────────
// src/lib/contract/fonts.js records what happens when a renderer cannot find a
// glyph: pdfkit printed a buyer's name as three empty rectangles and the
// document still looked plausible. SVG text has the same failure mode — no fonts
// in the image means a badge with no wordmark, which would ship looking almost
// right. So a render is verified to contain the white wordmark before it is
// trusted, and refuses loudly rather than quietly publishing a blank slab.
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const { log } = require('./log');

const INK = '#0B0A0A';
const RED = '#CC050F';
const WHITE = '#FFFFFF';

/** sharp is required lazily and never at module load.
 *
 *  It is a native dependency and the API image is Alpine (musl). If the binary
 *  is ever missing, the whole server must not fail to boot over an image
 *  library — masking refuses with a clear message and every other route keeps
 *  working. */
function loadSharp() {
  try {
    return require('sharp');
  } catch (err) {
    log.error('sharp is unavailable — plate masking is disabled', { error: err.message });
    const error = new Error(
      'Image processing is not available on this server, so the plate cannot be masked. '
      + 'The photo has not been published.'
    );
    error.status = 503;
    error.code = 'IMAGE_PROCESSING_UNAVAILABLE';
    throw error;
  }
}

/**
 * The badge, as SVG, at a given pixel size.
 *
 * Every dimension is derived from the height so the artwork holds its
 * proportions whether it is drawn over a long single-line plate or a short one.
 *
 * `mountingHoles` defaults to FALSE deliberately. With them the badge reads as a
 * plate fitted to the car, which implies Sawa owns and is selling it — and Sawa
 * is never a party to the deal. Without them it reads as something laid over the
 * photograph, which is what it is.
 */
function badgeSvg(width, height, { mountingHoles = false, caption = 'PLATE HIDDEN' } = {}) {
  const w = Math.max(24, Math.round(width));
  const h = Math.max(12, Math.round(height));
  const radius = h * 0.16;
  const border = Math.max(2, h * 0.055);
  const inset = border * 1.6;
  const availW = w - inset * 2 - h * 0.08;

  // ── Fitting the artwork ────────────────────────────────────────────────────
  // Everything is sized from BOTH dimensions. Sizing from height alone ran the
  // wordmark straight off the edge of a short plate, and plates genuinely come
  // in that shape.
  //
  // On a tall plate the wordmark stacks onto two lines — which is what a
  // two-line plate looks like anyway. Squashing the glyphs to force one line
  // would fit but distort the mark, and a distorted logo reads as a mistake
  // rather than a decision.
  const EM_PER_CHAR = 0.62;   // heavy uppercase sans, approximate on purpose
  const stacked = w / h < 2.6;

  const capSize = Math.max(5, Math.min(h * 0.1, availW / 16));
  const captionY = h - inset * 1.05;

  // The monogram gives up room when the wordmark needs two rows.
  const monoR = (stacked ? h * 0.11 : h * 0.15);
  const monoCy = (stacked ? h * 0.17 : h * 0.26);

  let wordSize;
  let lineOne;
  let lineTwo = null;
  if (stacked) {
    wordSize = Math.min(h * 0.26, availW / (4 * EM_PER_CHAR));
    lineOne = monoCy + monoR + wordSize * 0.92;
    lineTwo = lineOne + wordSize * 0.95;
    // Never let the second line reach the caption.
    if (caption && lineTwo > captionY - capSize * 0.9) {
      lineTwo = captionY - capSize * 0.9;
      lineOne = lineTwo - wordSize * 0.95;
    }
  } else {
    wordSize = Math.min(h * 0.36, availW / (8 * EM_PER_CHAR + 0.2));
    lineOne = h * 0.70;
  }

  const rule = Math.max(1, h * 0.018);
  const wordmark = lineTwo === null
    ? `<text x="${w / 2 - wordSize * 0.08}" y="${lineOne}" font-family="Satoshi, DejaVu Sans, sans-serif"
             font-size="${wordSize}" font-weight="900" text-anchor="middle" letter-spacing="${wordSize * 0.02}">
         <tspan fill="${WHITE}">SAWA</tspan><tspan dx="${wordSize * 0.16}" fill="${RED}">CARS</tspan>
       </text>`
    : `<text x="${w / 2}" y="${lineOne}" font-family="Satoshi, DejaVu Sans, sans-serif"
             font-size="${wordSize}" font-weight="900" fill="${WHITE}" text-anchor="middle"
             letter-spacing="${wordSize * 0.04}">SAWA</text>
       <text x="${w / 2}" y="${lineTwo}" font-family="Satoshi, DejaVu Sans, sans-serif"
             font-size="${wordSize}" font-weight="900" fill="${RED}" text-anchor="middle"
             letter-spacing="${wordSize * 0.04}">CARS</text>`;

  // The flanking rules only earn their place when there is width to spare.
  const rules = stacked ? '' : `
    <line x1="${w * 0.1}" y1="${monoCy}" x2="${w / 2 - monoR * 1.9}" y2="${monoCy}"
          stroke="${RED}" stroke-width="${rule}"/>
    <line x1="${w / 2 + monoR * 1.9}" y1="${monoCy}" x2="${w * 0.9}" y2="${monoCy}"
          stroke="${RED}" stroke-width="${rule}"/>`;

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <clipPath id="plate">
      <rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" ry="${radius}"/>
    </clipPath>
  </defs>
  <g clip-path="url(#plate)">
    <rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="${INK}"/>
    <rect x="${border / 2}" y="${border / 2}" width="${w - border}" height="${h - border}"
          rx="${radius}" ry="${radius}" fill="none" stroke="${RED}" stroke-width="${border}"/>
    <rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}"
          rx="${radius * 0.7}" ry="${radius * 0.7}" fill="none" stroke="${RED}"
          stroke-width="${Math.max(1, border * 0.3)}" opacity="0.85"/>
    ${rules}
    <circle cx="${w / 2}" cy="${monoCy}" r="${monoR}" fill="${INK}" stroke="${RED}"
            stroke-width="${Math.max(1.5, monoR * 0.22)}"/>
    <text x="${w / 2}" y="${monoCy + monoR * 0.52}" font-family="Satoshi, DejaVu Sans, sans-serif"
          font-size="${monoR * 1.5}" font-weight="900" fill="${WHITE}"
          text-anchor="middle" letter-spacing="-1">S</text>
    ${wordmark}
    ${caption ? `<text x="${w / 2}" y="${captionY}" font-family="Satoshi, DejaVu Sans, sans-serif"
          font-size="${capSize}" font-weight="700" fill="${WHITE}" opacity="0.55"
          text-anchor="middle" letter-spacing="${capSize * 0.22}">${caption}</text>` : ''}
    ${mountingHoles ? [0.18, 0.82].map((fx) => [0.13, 0.87].map((fy) =>
      `<rect x="${w * fx - w * 0.035}" y="${h * fy - h * 0.035}" width="${w * 0.07}" height="${h * 0.07}"
             rx="${h * 0.035}" fill="${WHITE}" opacity="0.9"/>`).join('')).join('') : ''}
  </g>
</svg>`);
}

/**
 * Does the badge actually have a wordmark on it?
 *
 * The design is black and red with large WHITE lettering. If the renderer found
 * no font, the text silently disappears and what remains is a black slab with a
 * red border — plausible enough to publish and completely wrong. Counting near
 * white pixels is a cheap, direct test of the one thing that can vanish.
 */
async function assertBadgeRenders() {
  const sharp = loadSharp();
  const png = await sharp(badgeSvg(600, 200)).png().toBuffer();
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  let white = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) white += 1;
  }
  const share = white / (info.width * info.height);
  if (share < 0.005) {
    const error = new Error(
      'The plate badge rendered without its wordmark — the server has no usable font. '
      + 'Publishing it would put a blank panel over the plate. Install fonts in the API image.'
    );
    error.status = 503;
    error.code = 'BADGE_FONT_MISSING';
    throw error;
  }
  return { white_share: Math.round(share * 10000) / 10000 };
}

/** The four corners a client sent, validated and ordered. Fractions of the
 *  image, so the geometry survives any later resize of the source photo. */
function readQuad(value) {
  if (!Array.isArray(value) || value.length !== 4) return { error: 'Give exactly four corner points' };
  const points = [];
  for (const point of value) {
    const x = Number(point && point.x);
    const y = Number(point && point.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
      return { error: 'Each corner needs x and y between 0 and 1' };
    }
    points.push({ x, y });
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  // A degenerate box would composite a one-pixel smear and look like a bug
  // rather than a mask.
  if (width < 0.01 || height < 0.005) {
    return { error: 'The area is too small to cover a plate — drag a larger box' };
  }
  return { points, bounds: { x: Math.min(...xs), y: Math.min(...ys), width, height } };
}

/**
 * Burn the badge into an image and return the new buffer.
 *
 * Rotation is derived from the top edge of the quad, so an angled plate gets an
 * angled badge. Full perspective is not attempted: sharp's affine transform
 * cannot produce a trapezoid, and the four-point geometry is stored so that a
 * perspective fit can be added later without changing any data.
 */
async function maskPlate(sourceBuffer, quad) {
  const sharp = loadSharp();
  await assertBadgeRenders();

  const image = sharp(sourceBuffer, { failOn: 'none' });
  const meta = await image.metadata();
  const W = meta.width;
  const H = meta.height;
  if (!W || !H) {
    const error = new Error('That file is not an image the server can read');
    error.status = 400; throw error;
  }

  const [tl, tr] = quad.points;
  const angle = Math.atan2((tr.y - tl.y) * H, (tr.x - tl.x) * W) * (180 / Math.PI);

  // Cover generously: a badge flush to the plate's edges leaves slivers of
  // character visible at the corners once it is rotated.
  const pad = 1.06;
  const bw = Math.max(24, Math.round(quad.bounds.width * W * pad));
  const bh = Math.max(12, Math.round(quad.bounds.height * H * pad));

  let badge = sharp(badgeSvg(bw, bh)).png();
  if (Math.abs(angle) > 0.5) {
    badge = badge.rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
  }
  const badgeBuffer = await badge.toBuffer({ resolveWithObject: true });

  // Centre the (possibly rotated, therefore larger) badge on the quad's centre.
  const cx = (quad.bounds.x + quad.bounds.width / 2) * W;
  const cy = (quad.bounds.y + quad.bounds.height / 2) * H;
  const left = Math.round(cx - badgeBuffer.info.width / 2);
  const top = Math.round(cy - badgeBuffer.info.height / 2);

  return image
    .composite([{
      input: badgeBuffer.data,
      // Clamped so a plate near an edge still composites instead of throwing.
      left: Math.max(0, Math.min(left, W - 1)),
      top: Math.max(0, Math.min(top, H - 1)),
    }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

module.exports = { badgeSvg, assertBadgeRenders, readQuad, maskPlate, FONT_DIR: path.join(__dirname, '../../assets/fonts') };
