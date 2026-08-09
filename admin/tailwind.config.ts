import type { Config } from 'tailwindcss'

// Brand system — the SAME tokens as web/tailwind.config.ts and the mobile app
// (Signal Red, warm charcoal inks, warm neutrals). The admin previously ran the
// pre-rebrand forest-green palette; an internal tool still represents the brand
// to the people who run the business every day.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#CC050F',
          bright: '#DE0714',
          deep: '#A50410',
          tint: '#F9EDED',
          // Legacy aliases still referenced across older pages:
          // "dark" was the sidebar/login ground (now warm ink),
          // "light" was the hover fill (now the bright red).
          dark: '#17120F',
          light: '#DE0714',
        },
        ink: { 900: '#17120F', 800: '#281F1C', 700: '#3A2D29' },
        // `text` is the readable-on-tint variant, and it is NOT optional: the
        // DEFAULT green on success-tint measures 2.97:1, which fails AA, and
        // that pair is the single most common pill in this dashboard —
        // live, complete, approved, paid, active, resolved and signed all map
        // to it. #166534 on the same tint is 5.9:1. The website's config has
        // carried this variant for a while; the admin never received it.
        // Use `text-success-text` for TEXT and `text-success` only for icons
        // and graphics, where 3:1 is the bar.
        success: { DEFAULT: '#16A34A', tint: '#EAF6EE', text: '#166534' },
        warning: { DEFAULT: '#D97706', tint: '#FEF3C7', text: '#B45309' },
        danger: { DEFAULT: '#B4233A', tint: '#FBECEF', strong: '#B91C1C' },
        info: { DEFAULT: '#1D4ED8', tint: '#EFF6FF' },
        surface: { DEFAULT: '#FFFFFF', alt: '#F6F4F4', page: '#FAF8F8' },
        line: { DEFAULT: '#E8E3E3', soft: '#F0EDED' },
        content: { DEFAULT: '#1B1313', secondary: '#423737', muted: '#7A6E6E' },

        // Remap Tailwind's gray scale onto the warm neutrals so every page
        // written in gray-* re-skins to the brand without touching each file.
        gray: {
          50: '#FAF8F8',
          100: '#F6F4F4',
          200: '#F0EDED',
          300: '#E8E3E3',
          400: '#A99C9C',
          500: '#7A6E6E',
          600: '#5C5050',
          700: '#423737',
          800: '#2B2222',
          900: '#1B1313',
        },
      },
      fontFamily: {
        sans: ['var(--font-satoshi)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // ─── Type scale ──────────────────────────────────────────────────────
      // This config had no fontSize block at all, so the dashboard ran on
      // Tailwind's defaults plus five arbitrary text-[Npx] values. Measured
      // across src/: 177 × text-xs and 145 × text-sm out of ~343 total, which
      // made it a TWO-SIZE interface — hierarchy was carried entirely by
      // font-weight and colour, and a page title and a table cell differed by
      // 2px.
      //
      // Named tiers, ported from the same ladder the website uses so the two
      // surfaces agree. Nothing renders under 11px, and 11px is reserved for
      // the sidebar's secondary text.
      fontSize: {
        'page-title': ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],  // 24px
        'section': ['1.0625rem', { lineHeight: '1.35', letterSpacing: '-0.01em' }], // 17px — card/panel titles
        'stat': ['1.625rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],     // 26px — StatCard value
        'stat-lg': ['2rem', { lineHeight: '1.15', letterSpacing: '-0.03em' }],      // 32px — revenue figures
        'body': ['0.875rem', { lineHeight: '1.55' }],                               // 14px — default copy, table cells
        'label': ['0.8125rem', { lineHeight: '1.45' }],                             // 13px — field labels, row meta
        'caption': ['0.75rem', { lineHeight: '1.45' }],                             // 12px — pills, dense meta
        'micro': ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.04em' }],     // 11px — sidebar sub-text
      },
      boxShadow: {
        card: '0 2px 8px rgba(26, 20, 19, 0.06)',
        'card-lg': '0 8px 28px rgba(26, 20, 19, 0.10)',
      },
    },
  },
  plugins: [],
}

export default config
