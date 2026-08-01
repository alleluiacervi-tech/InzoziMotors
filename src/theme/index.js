import colors from './colors';

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
};

// Shadow presets — subtle, brand-warm, realistic depth
export const shadows = {
  // Standard card: very low lift, neutral warm shadow
  card: {
    shadowColor: '#1A1413',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  // Primary button glow
  blueGlow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  // Bottom nav / sticky footer
  floating: {
    shadowColor: '#1A1413',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  // Screen headers
  header: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
};

export { colors };
export default { colors, spacing, radius, typography, shadows, fonts };
