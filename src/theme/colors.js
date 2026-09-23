// Sawa — Signal Red Brand System
// Bold, trustworthy red identity — confident and modern for East Africa's
// premier certified car marketplace.
// Rebranded Jul 18 2026: transitioned from Forest Green to Signal Red.
//
// Editorial Showroom pass, Sep 11 2026: Signal Red is unchanged and keeps its
// discipline. What moved is the neutral ramp — the pink-grey surfaces became
// warm bone paper and the ink went darker and less brown, so photography of a
// car sits on a showroom wall rather than on a tinted screen. These values are
// mirrored one-for-one by the light theme in web/src/app/globals.css; change
// them here first, then there, or the two products stop looking alike.
//
// Dark mode pass: `darkColors` mirrors `web/src/app/globals.css`'s `.dark`
// block the same way `lightColors` mirrors its `:root`. Every pair below was
// measured on the web side (see that file's comment: "Dark is not an
// inversion... every pair below was measured, not eyeballed") and carried
// over here, not re-derived — a second measurement could quietly drift from
// the first, and the whole point of a shared brand is that it does not.
//
// `colors` (bottom of this file) is the palette the app actually renders with:
// filled from one of these two at launch, before any screen loads.
export const lightColors = {
  // Dark surfaces (Welcome hero gradient — premium warm charcoal, red kept as accent)
  navyDeep: '#14110F',
  navyMid: '#241F1D',
  navyLight: '#38302C',

  // Brand Red — Sawa signal red #CC050F, taken from the master vector assets/sawa.svg.
  // DISCIPLINE: red appears ONLY as (1) a price, (2) a primary action,
  // (3) a selected/active state, (4) the Certified+ tier badge, or
  // (5) an inline action link. Informational icons, section decorations
  // and menu rows are textSecondary — never red.
  primary: '#CC050F',
  primaryBright: '#DE0714',
  // Soft wash of the brand red — icon chips and other quiet brand surfaces.
  primaryTint: '#FDEBEC',
  blueLight: '#EE8B90',
  // Cool wash for informational chips (message, map, scheduled). Was #F3F2F2 —
  // the same gray as greenTint, so "blue" and "green" surfaces rendered
  // identically and both read as disabled.
  blueTint: '#EFF6FF',
  infoText: '#1D4ED8',
  infoBorder: '#BFDBFE',

  // Badge Colors
  jeondan: '#CC050F',
  jeondanPlus: '#1D4ED8',
  jeondanPlusPlus: '#D97706',
  contract: '#A50410',
  alert: '#D97706',

  // Semantic — true success green (pass / verified / online / savings).
  // Brand red is reserved for prices, CTAs and active states only.
  // `green`/`amber` are ICON/GRAPHIC colours (≥3:1 on white is enough for
  // glyphs); TEXT must use `greenText`/`amberText`, which clear 4.5:1 on
  // white AND on their tint washes.
  green: '#16A34A',
  greenText: '#166534',
  greenLight: '#4ADE80',
  // A real green wash at last. This was #F3F2F2 — plain gray — which made
  // every "Certified"/"ID Verified" chip in the app look disabled and the
  // comparison table's "green highlight" literally not green.
  greenTint: '#EAF6EE',
  amber: '#D97706',
  amberTint: '#FEF3C7',
  amberText: '#B45309',

  // Submission Pipeline Status Colors — every fg/bg pair clears 4.5:1,
  // because these render as 10-12px pill text throughout the app.
  statusPending: '#B45309',
  statusPendingBg: '#FEF3C7',
  statusScheduled: '#1D4ED8',
  statusScheduledBg: '#EFF6FF',
  statusLive: '#166534',
  statusLiveBg: '#EAF6EE',
  statusReserved: '#7C3AED',
  statusReservedBg: '#F5F3FF',
  statusSold: '#57606C',
  statusSoldBg: '#F5F5F5',
  statusRejected: '#B91C1C',
  statusRejectedBg: '#FEF2F2',

  alertRed: '#B91C1C',

  // Feedback — calm, not alarming. Errors use a muted rose; the input
  // border carries the state, message text stays neutral.
  danger: '#B4233A',
  dangerTint: '#FBECEF',

  // Neutrals — very slightly red-warm
  bg: '#FBFAF8',
  surface: '#FFFFFF',
  surfaceAlt: '#F2EFEA',
  border: '#E3DDD5',
  borderSoft: '#EFEAE3',

  // Text
  textPrimary: '#14110F',
  textSecondary: '#3D3733',
  textMuted: '#6E6660',
  // For genuinely de-emphasised text (closed dates, booked slots, disabled
  // steps). Screens used to reach for `border` (#E8E3E3, 1.3:1 — invisible);
  // this stays clearly quieter than textMuted while remaining legible.
  textDisabled: '#9C938B',
  textOnDark: '#FFFFFF',
  slate700: '#14110F',
  slate600: '#3D3733',

  // Photo scrims. Derived from navyDeep — these were three separate hand-typed
  // rgba(23,18,15,…) strings in CarCard, left pointing at the pre-Editorial
  // ink after the palette moved. Scrims sit on a PHOTOGRAPH, not the app's own
  // surface, so unlike everything else on this page they stay identical in
  // both themes — a picture's own darkness does not change with the theme.
  scrim: 'rgba(20,17,15,0.78)',
  scrimStrong: 'rgba(20,17,15,0.85)',

  // Inverse surface: toasts and banners that sit above the page in the opposite tone.
  inverseSurface: '#14110F',
  inverseText: '#FFFFFF',
  inverseTextMuted: 'rgba(255,255,255,0.78)',

  white: '#FFFFFF',
  black: '#000000',
};

// The dark theme. Not an inversion — every semantic colour desaturates and
// lightens rather than flipping, exactly as web/src/app/globals.css documents
// for its own `.dark` block, because that is the same rule stated twice: a
// literally-inverted brand red fails contrast on a dark ground (#CC050F on
// near-black measures under 3:1), so the accent itself has to be a different,
// lighter red — not the same value the light theme uses. Every value below is
// that CSS file's `.dark` block, carried over key-for-key.
export const darkColors = {
  navyDeep: '#08070C',
  navyMid: '#120F0E',
  navyLight: '#1E1A18',

  // One red has to serve as a FILL under white labels (buttons, chips) and as
  // TEXT on the page (prices). The web's #FF5A61 gave white labels 3.05:1,
  // which fails AA. This one: white on it 4.79:1, it on the page 3.83:1
  // (prices are large bold text, so 3:1 is the bar).
  primary: '#DA2C32',
  primaryBright: '#FF7A80',
  primaryTint: '#2F1618',
  blueLight: '#FFA8AC',
  blueTint: '#162038',      // web's --info-tint dark
  infoText: '#93C5FD',      // 8.9:1 on blueTint
  infoBorder: '#1E3A8A',

  jeondan: '#FF5A61',
  jeondanPlus: '#7DA5FF',   // web's --info dark
  jeondanPlusPlus: '#FBBF24', // web's --warning dark
  // A deeper, more desaturated red than the bright primary accent — "In
  // Contract" is a status, not a call to action, and should not compete with
  // the one thing on a dark screen that IS a call to action.
  contract: '#D63A42',
  alert: '#FBBF24',

  green: '#4ADE80',
  greenText: '#86EFAC',
  greenLight: '#86EFAC',
  greenTint: '#142D1F',
  amber: '#FBBF24',
  amberTint: '#38290C',
  amberText: '#FDE047',

  statusPending: '#FDE047',
  statusPendingBg: '#38290C',
  statusScheduled: '#93B5FF',
  statusScheduledBg: '#162038',
  statusLive: '#86EFAC',
  statusLiveBg: '#142D1F',
  statusReserved: '#C4A8FF',
  statusReservedBg: '#261C3A',
  statusSold: '#A6AFBC',
  statusSoldBg: '#202226',
  statusRejected: '#FCA5A5',
  statusRejectedBg: '#381414',

  alertRed: '#FCA5A5',      // web's --danger-strong dark

  danger: '#F87185',        // web's --danger dark
  dangerTint: '#38161C',

  // The surface ladder — the one thing dark UI gets wrong most often. Ratios
  // compress at the dark end (see web's own comment on this exact problem),
  // which is why `border` below is a real step up from `surface`, not a
  // near-invisible +0.03 nudge.
  bg: '#0E0C0B',
  surface: '#171413',
  surfaceAlt: '#221D1B',
  border: '#2E2825',
  borderSoft: '#241F1D',

  textPrimary: '#F5F1EC',   // 17.36:1 on the page
  textSecondary: '#C9C0B8',
  textMuted: '#948A82',     // 5.43:1 on a card
  textDisabled: '#7A716A',
  // On-dark text sits on a surface that is ALREADY unconditionally dark in
  // either theme (the Welcome hero gradient, a photo scrim) — that surface's
  // own darkness does not depend on the app theme, so this stays white in
  // both.
  textOnDark: '#FFFFFF',
  slate700: '#F5F1EC',
  slate600: '#C9C0B8',

  scrim: 'rgba(20,17,15,0.78)',
  scrimStrong: 'rgba(20,17,15,0.85)',

  inverseSurface: '#F5F1EC',
  inverseText: '#14110F',
  inverseTextMuted: 'rgba(20,17,15,0.72)',

  white: '#FFFFFF',
  black: '#000000',
};

// The palette every screen reads. Mutable on purpose: src/theme/boot.js fills it
// with the light or dark values BEFORE any screen module loads, so each
// module-level StyleSheet is built from the right theme with no per-file
// wiring. Swapping it later would not repaint anything already built, which is
// why a theme change restarts the app (ThemeContext.js).
export const colors = { ...lightColors };

export const themeState = { mode: 'system', scheme: 'light' };

export function applyScheme(scheme) {
  themeState.scheme = scheme === 'dark' ? 'dark' : 'light';
  Object.assign(colors, themeState.scheme === 'dark' ? darkColors : lightColors);
}

export default colors;
