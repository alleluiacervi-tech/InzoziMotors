import colors, { lightColors, darkColors } from './colors';

// Spacing scale (4pt base)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// The icon scale. Three named sizes for a STANDALONE, structural icon — a
// tab bar glyph, a header chevron, a save/heart button, a button's leading
// icon — plus one explicit micro size for an icon set INSIDE a badge or
// inline with dense text (a certification pill, a star rating, a boat/flag
// glyph beside a caption).
//
// These are two different design problems, not one spread across twelve
// arbitrary values. A structural icon has its own tap target and needs to
// read clearly at a glance; a badge icon shares a few square millimetres
// with a number or a word and has to stay small enough not to dominate it.
// Collapsing both onto one three-value scale would either shrink every nav
// icon to fit inside a badge, or blow up every badge to nav-icon size —
// both wrong. So: standalone icons reach for sm/md/lg below; a badge icon
// stays a bespoke small value chosen for that specific pill, the same way it
// always has.
export const iconSize = { xs: 12, sm: 16, md: 20, lg: 24 };

// Border radius scale
export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 20,
  pill: 999,
  phone: 44,
};

// Satoshi font family map — bundled files loaded in App.js via expo-font.
//
// Satoshi publishes 400/500/700/900 (no 600 or 800), so two of the six slots
// double up. Each maps DOWN to the nearest real weight rather than up: Satoshi
// sets optically heavier than Inter at the same nominal weight, so rounding up
// would make the whole interface read bolder than it was designed to.
export const fonts = {
  regular: 'Satoshi-Regular',   // 400
  medium: 'Satoshi-Medium',     // 500
  semiBold: 'Satoshi-Medium',   // 600 → 500
  bold: 'Satoshi-Bold',         // 700
  extraBold: 'Satoshi-Bold',    // 800 → 700
  black: 'Satoshi-Black',       // 900
};

// Typography presets
export const typography = {
  display: { fontFamily: fonts.extraBold, fontSize: 42, letterSpacing: -1.2, lineHeight: 46 },
  h1: { fontFamily: fonts.extraBold, fontSize: 30, letterSpacing: -0.9, lineHeight: 34 },
  h2: { fontFamily: fonts.bold, fontSize: 24, letterSpacing: -0.5, lineHeight: 28 },
  h3: { fontFamily: fonts.bold, fontSize: 22, letterSpacing: -0.4, lineHeight: 26 },
  h4: { fontFamily: fonts.bold, fontSize: 18, letterSpacing: -0.2, lineHeight: 22 },
  title: { fontFamily: fonts.bold, fontSize: 17, letterSpacing: -0.2, lineHeight: 21 },
  price: { fontVariant: ['tabular-nums'], fontFamily: fonts.extraBold, fontSize: 21, letterSpacing: -0.4 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semiBold, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.semiBold, fontSize: 13 },
  caption: { fontFamily: fonts.medium, fontSize: 12 },
  micro: { fontFamily: fonts.semiBold, fontSize: 11, letterSpacing: 0.3 },

  // ── The dense tier ────────────────────────────────────────────────────────
  // Grid cells (two cards per row on a phone) cannot carry `title`/`body` at
  // full size, and every card in the app had been inventing its own ladder
  // instead — 13, 11.5, 9.5 and so on, sizes that exist nowhere in this file.
  // Naming the tier is what stops that: a card reaches for `cardTitle`, not a
  // number it guessed. Nothing here drops below 11, which is the floor for
  // legible secondary text at arm's length.
  cardTitle: { fontFamily: fonts.bold, fontSize: 15, letterSpacing: -0.2, lineHeight: 19 },
  cardMeta: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  cardPrice: { fontVariant: ['tabular-nums'], fontFamily: fonts.extraBold, fontSize: 17, letterSpacing: -0.3 },
  badge: { fontFamily: fonts.extraBold, fontSize: 11, letterSpacing: 0.2 },
};

// ─────────────────────────────────────────────────────────────────────────────
// The elevation ladder. Four tiers, one shadow language for the whole app.
//
// A fifth tier used to live here — `blueGlow`, a coloured halo under primary
// buttons. It is gone, and deliberately: the website deleted the identical
// pattern with the same reasoning ("a colored drop shadow under every primary
// button was the most dated element on the site — a coloured halo reads as
// 2012 skeuomorphism... the confident version is flat"). By the time this was
// removed `blueGlow` itself had zero call sites, but the PATTERN had been
// hand-copied onto two real buttons anyway instead of reaching for a shared
// token — Welcome's primary CTA and the floating Compare pill. Both now use
// the neutral tiers below.
//
// Every tier is a neutral, brand-warm black. Colour never appears in a
// shadow — the discipline in colors.js ("red appears ONLY as a price, a
// primary action, a selected state...") already forbids using red as
// decoration, and a red shadow is decoration wearing the accent as a costume.
//
// A fifth case is intentionally NOT a token: an element sitting flush on the
// page casts no shadow at all. Reach for one of these four only when
// something is actually lifted off the surface beneath it.
export const shadows = {
  // RAISED — a card sitting a few points off the page. The workhorse: every
  // CarCard, list row and panel in the app uses this.
  card: {
    shadowColor: '#1A1413',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  // FLOATING — a sticky footer, CTA bar, or pill anchored over content rather
  // than sitting in the scroll flow. Deeper than `card` because it has to
  // read as detached from whatever is scrolling beneath it.
  floating: {
    shadowColor: '#1A1413',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  // HEADER — the lightest lift: a bar at the very top of the stack that only
  // needs to separate itself from the content sliding under it by a hair.
  header: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  // OVERLAY — a surface that covers other content rather than sitting beside
  // it: a drawer, a sheet, a modal. The deepest tier, because it has to read
  // as unambiguously ABOVE everything beneath it, not just slightly raised.
  // A drawer sliding in from an edge legitimately needs its shadow pointed
  // away from the hinge rather than straight down — override `shadowOffset`
  // for that case, as DrawerMenu.js does, rather than inventing a new tier.
  overlay: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 16,
  },
};

export { colors, lightColors, darkColors };
export default { colors, spacing, radius, typography, shadows, fonts, iconSize };
