const fs = require('fs');
const path = require('path');

// Fonts for the contract PDF, and the glyph check that stops a contract being
// issued with a party's name printed as blank boxes.
//
// WHY THE CHECK EXISTS. pdfkit draws whatever the embedded font has and silently
// emits .notdef for anything it doesn't. Feeding it a Chinese name produced a
// PDF where the buyer's name rendered as three empty rectangles — the document
// still printed, still looked plausible, and would have been signed. In a legal
// document that is not a cosmetic defect, it is silent identity loss. So every
// party-supplied string is verified against the font's cmap BEFORE rendering,
// and generation is refused with the offending field named.
//
// Coverage: Satoshi carries Latin + Latin Extended (the accents Rwandan, French
// and Turkish names need) but no Cyrillic, so body text uses DejaVu Sans
// (~6000 glyphs: Latin, Greek, Cyrillic). Neither covers CJK, Arabic, Devanagari
// or Thai — and pdfkit cannot shape connected scripts in any case. For those,
// the admin records the Latin transliteration the travel document itself carries
// in its machine-readable zone, and may attach the original as an annex.

const DIR = path.join(__dirname, '../../../assets/fonts');

const FONTS = {
  // Sawa's own type — letterhead, headings, labels. Our copy, our control.
  brand:     path.join(DIR, 'Satoshi-Bold.ttf'),
  brandHeavy:path.join(DIR, 'Satoshi-Black.ttf'),
  brandBody: path.join(DIR, 'Satoshi-Regular.ttf'),
  // Party-supplied text and clause bodies — widest coverage wins here.
  body:      path.join(DIR, 'DejaVuSans.ttf'),
  bodyBold:  path.join(DIR, 'DejaVuSans-Bold.ttf'),
};

function assertFontsPresent() {
  const missing = Object.entries(FONTS).filter(([, p]) => !fs.existsSync(p)).map(([k]) => k);
  if (missing.length) {
    throw new Error(`Contract fonts missing from ${DIR}: ${missing.join(', ')}`);
  }
}

// ─── cmap parsing ────────────────────────────────────────────────────────────
// Read the covered codepoints straight out of the TrueType cmap. Parsing 40
// lines of table here beats adding a font-introspection dependency, and it is
// the same data the renderer will consult.

function readCoverage(file) {
  const d = fs.readFileSync(file);
  const numTables = d.readUInt16BE(4);
  let cmapOff = null;
  for (let i = 0; i < numTables; i++) {
    const e = 12 + i * 16;
    if (d.toString('latin1', e, e + 4) === 'cmap') cmapOff = d.readUInt32BE(e + 8);
  }
  if (cmapOff == null) throw new Error(`No cmap table in ${path.basename(file)}`);

  const nSub = d.readUInt16BE(cmapOff + 2);
  let best = null;
  for (let i = 0; i < nSub; i++) {
    const e = cmapOff + 4 + i * 8;
    const platform = d.readUInt16BE(e);
    const encoding = d.readUInt16BE(e + 2);
    const offset = d.readUInt32BE(e + 4);
    // Unicode BMP / full-repertoire subtables only.
    const unicode =
      (platform === 3 && (encoding === 1 || encoding === 10)) ||
      (platform === 0 && (encoding === 3 || encoding === 4 || encoding === 6));
    if (unicode) best = cmapOff + offset;
  }
  if (best == null) throw new Error(`No Unicode cmap in ${path.basename(file)}`);

  const ranges = [];
  const format = d.readUInt16BE(best);
  if (format === 4) {
    const segX2 = d.readUInt16BE(best + 6);
    const segs = segX2 / 2;
    const endBase = best + 14;
    const startBase = endBase + segX2 + 2;
    for (let i = 0; i < segs; i++) {
      const end = d.readUInt16BE(endBase + i * 2);
      const start = d.readUInt16BE(startBase + i * 2);
      if (start === 0xffff) continue;
      ranges.push([start, end]);
    }
  } else if (format === 12) {
    const nGroups = d.readUInt32BE(best + 12);
    for (let i = 0; i < nGroups; i++) {
      const e = best + 16 + i * 12;
      ranges.push([d.readUInt32BE(e), d.readUInt32BE(e + 4)]);
    }
  } else {
    throw new Error(`Unsupported cmap format ${format} in ${path.basename(file)}`);
  }
  return ranges;
}

let coverageCache = null;
function bodyCoverage() {
  if (!coverageCache) coverageCache = readCoverage(FONTS.body);
  return coverageCache;
}

function covers(ranges, cp) {
  for (const [a, b] of ranges) if (cp >= a && cp <= b) return true;
  return false;
}

// Characters we never require a glyph for: they are stripped or normalised
// before drawing anyway.
const IGNORED = new Set([0x09, 0x0a, 0x0d, 0x20]);

/**
 * Every character in `text` that the body font cannot draw.
 * Returns an array of { char, codepoint } — empty means safe to render.
 */
function unsupportedCharacters(text) {
  if (text == null) return [];
  const ranges = bodyCoverage();
  const out = [];
  const seen = new Set();
  // Iterate by codepoint, not code unit, so astral characters (emoji, rare CJK)
  // are reported as one character rather than two broken halves.
  for (const ch of String(text)) {
    const cp = ch.codePointAt(0);
    if (IGNORED.has(cp) || seen.has(cp)) continue;
    seen.add(cp);
    if (!covers(ranges, cp)) out.push({ char: ch, codepoint: cp });
  }
  return out;
}

/** Human-readable hex list for an error message: "U+674E, U+4F1F". */
function describeUnsupported(list) {
  return list.map((u) => `U+${u.codepoint.toString(16).toUpperCase().padStart(4, '0')} ${u.char}`).join(', ');
}

// ─── scripts the RENDERER cannot handle even when glyphs exist ────────────────
// A glyph check alone is not enough. DejaVu ships Arabic and Hebrew glyphs, so
// an Arabic name passes `unsupportedCharacters` — but pdfkit does no complex
// shaping and no bidi reordering, so it would draw isolated letter forms in
// left-to-right order: legible-looking nonsense, which is worse in a contract
// than an outright refusal. Devanagari and Thai need reordering and conjuncts
// for the same reason. Refuse these explicitly.
const SHAPING_SCRIPTS = [
  [0x0590, 0x05ff, 'Hebrew'],
  [0x0600, 0x06ff, 'Arabic'],
  [0x0700, 0x074f, 'Syriac'],
  [0x0750, 0x077f, 'Arabic Supplement'],
  [0x0780, 0x07bf, 'Thaana'],
  [0x0900, 0x097f, 'Devanagari'],
  [0x0980, 0x09ff, 'Bengali'],
  [0x0a00, 0x0a7f, 'Gurmukhi'],
  [0x0b80, 0x0bff, 'Tamil'],
  [0x0e00, 0x0e7f, 'Thai'],
  [0x0e80, 0x0eff, 'Lao'],
  [0x0f00, 0x0fff, 'Tibetan'],
  [0x1780, 0x17ff, 'Khmer'],
  [0xfb50, 0xfdff, 'Arabic Presentation Forms'],
  [0xfe70, 0xfeff, 'Arabic Presentation Forms-B'],
];

/**
 * Scripts present in `text` that this renderer cannot lay out correctly.
 * Returns an array of script names — empty means safe.
 */
function unsupportedScripts(text) {
  if (text == null) return [];
  const found = new Set();
  for (const ch of String(text)) {
    const cp = ch.codePointAt(0);
    for (const [a, b, name] of SHAPING_SCRIPTS) {
      if (cp >= a && cp <= b) found.add(name);
    }
  }
  return [...found];
}

/**
 * The single gate the generator calls per field. Returns null when the string is
 * safe to print, or a reason string explaining precisely what cannot be drawn.
 */
function renderabilityError(text) {
  const scripts = unsupportedScripts(text);
  if (scripts.length) {
    return `contains ${scripts.join(' and ')} text, which this generator cannot typeset correctly. `
      + 'Enter the Latin transliteration exactly as it appears in the machine-readable zone of the '
      + 'identity document, and attach a copy of the original as an annex.';
  }
  const missing = unsupportedCharacters(text);
  if (missing.length) {
    return `contains characters the contract font cannot print (${describeUnsupported(missing)}). `
      + 'Enter the Latin transliteration exactly as it appears in the machine-readable zone of the '
      + 'identity document, and attach a copy of the original as an annex.';
  }
  return null;
}

module.exports = {
  FONTS,
  assertFontsPresent,
  unsupportedCharacters,
  unsupportedScripts,
  describeUnsupported,
  renderabilityError,
  readCoverage,
};
