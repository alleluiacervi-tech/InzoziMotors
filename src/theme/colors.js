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
export const colors = {
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

  white: '#FFFFFF',
  black: '#000000',
};

export default colors;
