import { Platform } from 'react-native';
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

const systemFont = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

// Typography presets mirroring the mockup (weight 800 headings, tight tracking)
export const typography = {
  fontFamily: systemFont,
  display: { fontSize: 42, fontWeight: '800', letterSpacing: -1.2, lineHeight: 44 },
  h1: { fontSize: 30, fontWeight: '800', letterSpacing: -0.9 },
  h2: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  h3: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  h4: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  title: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  price: { fontSize: 21, fontWeight: '800', letterSpacing: -0.4 },
  body: { fontSize: 15, fontWeight: '400' },
  bodyStrong: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600' },
  caption: { fontSize: 12, fontWeight: '600' },
  micro: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
};

// Reusable shadow presets
export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  blueGlow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  floating: {
    shadowColor: '#020828',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 12,
  },
};

export { colors };
export default { colors, spacing, radius, typography, shadows };
