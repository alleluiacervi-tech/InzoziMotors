import type { Config } from 'tailwindcss'

// Brand system — the SAME tokens as web/tailwind.config.ts and the mobile app
// (Signal Red, warm charcoal inks, warm neutrals). The admin previously ran the
// pre-rebrand forest-green palette; an internal tool still represents the brand
// to the people who run the business every day.
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Every colour resolves through a CSS variable declared in
        // src/app/globals.css, as an "R G B" triplet so Tailwind's /opacity
        // modifiers still compose. 2015 class usages across this console
        // already route through these semantic names, so swapping the
        // variables re-skins the whole tool — including dark mode — without
        // editing a single page.
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          bright: 'rgb(var(--brand-bright) / <alpha-value>)',
          deep: 'rgb(var(--brand-deep) / <alpha-value>)',
          tint: 'rgb(var(--brand-tint) / <alpha-value>)',
          on: 'rgb(var(--on-brand) / <alpha-value>)',
          // Legacy aliases still referenced across older pages.
          dark: 'rgb(var(--ink-900) / <alpha-value>)',
          light: 'rgb(var(--brand-bright) / <alpha-value>)',
        },
        ink: {
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
        },
        // `text` is the readable-on-tint variant, and it is NOT optional: the
        // DEFAULT green on success-tint measures 2.97:1, which fails AA, and
        // that pair is the single most common pill in this dashboard.
        // Use `text-success-text` for TEXT and `text-success` only for icons
        // and graphics, where 3:1 is the bar.
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          tint: 'rgb(var(--success-tint) / <alpha-value>)',
          text: 'rgb(var(--success-text) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
          tint: 'rgb(var(--warning-tint) / <alpha-value>)',
          text: 'rgb(var(--warning-text) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
          tint: 'rgb(var(--danger-tint) / <alpha-value>)',
          strong: 'rgb(var(--danger-strong) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'rgb(var(--info) / <alpha-value>)',
          tint: 'rgb(var(--info-tint) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          alt: 'rgb(var(--surface-alt) / <alpha-value>)',
          page: 'rgb(var(--surface-page) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--line) / <alpha-value>)',
          soft: 'rgb(var(--line-soft) / <alpha-value>)',
        },
        content: {
          DEFAULT: 'rgb(var(--content) / <alpha-value>)',
          secondary: 'rgb(var(--content-secondary) / <alpha-value>)',
          muted: 'rgb(var(--content-muted) / <alpha-value>)',
        },

        // Tailwind's gray scale, remapped onto the same warm neutrals so the
        // ~200 pages still written in gray-* re-skin with everything else —
        // and, crucially, invert correctly in dark mode rather than staying
        // light grey on a dark ground.
        // The semantic ramps, remapped for exactly the reason gray is: ~60
        // class usages across pages that were never rewritten in semantic
        // names still say bg-red-50 / text-green-700 / border-amber-200, and
        // raw Tailwind hex does not invert. Anchored on danger / success /
        // warning / info so the meaning matches the name.
        red: {
          50: 'rgb(var(--red-50) / <alpha-value>)',
          100: 'rgb(var(--red-100) / <alpha-value>)',
          200: 'rgb(var(--red-200) / <alpha-value>)',
          300: 'rgb(var(--red-300) / <alpha-value>)',
          400: 'rgb(var(--red-400) / <alpha-value>)',
          500: 'rgb(var(--red-500) / <alpha-value>)',
          600: 'rgb(var(--red-600) / <alpha-value>)',
          700: 'rgb(var(--red-700) / <alpha-value>)',
          800: 'rgb(var(--red-800) / <alpha-value>)',
          900: 'rgb(var(--red-900) / <alpha-value>)',
        },
        green: {
          50: 'rgb(var(--green-50) / <alpha-value>)',
          100: 'rgb(var(--green-100) / <alpha-value>)',
          200: 'rgb(var(--green-200) / <alpha-value>)',
          300: 'rgb(var(--green-300) / <alpha-value>)',
          400: 'rgb(var(--green-400) / <alpha-value>)',
          500: 'rgb(var(--green-500) / <alpha-value>)',
          600: 'rgb(var(--green-600) / <alpha-value>)',
          700: 'rgb(var(--green-700) / <alpha-value>)',
          800: 'rgb(var(--green-800) / <alpha-value>)',
          900: 'rgb(var(--green-900) / <alpha-value>)',
        },
        amber: {
          50: 'rgb(var(--amber-50) / <alpha-value>)',
          100: 'rgb(var(--amber-100) / <alpha-value>)',
          200: 'rgb(var(--amber-200) / <alpha-value>)',
          300: 'rgb(var(--amber-300) / <alpha-value>)',
          400: 'rgb(var(--amber-400) / <alpha-value>)',
          500: 'rgb(var(--amber-500) / <alpha-value>)',
          600: 'rgb(var(--amber-600) / <alpha-value>)',
          700: 'rgb(var(--amber-700) / <alpha-value>)',
          800: 'rgb(var(--amber-800) / <alpha-value>)',
          900: 'rgb(var(--amber-900) / <alpha-value>)',
        },
        blue: {
          50: 'rgb(var(--blue-50) / <alpha-value>)',
          100: 'rgb(var(--blue-100) / <alpha-value>)',
          200: 'rgb(var(--blue-200) / <alpha-value>)',
          300: 'rgb(var(--blue-300) / <alpha-value>)',
          400: 'rgb(var(--blue-400) / <alpha-value>)',
          500: 'rgb(var(--blue-500) / <alpha-value>)',
          600: 'rgb(var(--blue-600) / <alpha-value>)',
          700: 'rgb(var(--blue-700) / <alpha-value>)',
          800: 'rgb(var(--blue-800) / <alpha-value>)',
          900: 'rgb(var(--blue-900) / <alpha-value>)',
        },
        // Chart series (see globals.css). Never red; assigned in order.
        data: {
          1: 'rgb(var(--data-1) / <alpha-value>)',
          2: 'rgb(var(--data-2) / <alpha-value>)',
          3: 'rgb(var(--data-3) / <alpha-value>)',
          4: 'rgb(var(--data-4) / <alpha-value>)',
          5: 'rgb(var(--data-5) / <alpha-value>)',
          prev: 'rgb(var(--data-prev) / <alpha-value>)',
        },
        ramp: {
          1: 'rgb(var(--ramp-1) / <alpha-value>)',
          2: 'rgb(var(--ramp-2) / <alpha-value>)',
          3: 'rgb(var(--ramp-3) / <alpha-value>)',
          4: 'rgb(var(--ramp-4) / <alpha-value>)',
          5: 'rgb(var(--ramp-5) / <alpha-value>)',
        },
        // Aliases for the two names the console also reaches for.
        emerald: {
          50:  'rgb(var(--green-50) / <alpha-value>)',
          600: 'rgb(var(--green-600) / <alpha-value>)',
          700: 'rgb(var(--green-700) / <alpha-value>)',
        },
        gray: {
          50:  'rgb(var(--gray-50) / <alpha-value>)',
          100: 'rgb(var(--gray-100) / <alpha-value>)',
          200: 'rgb(var(--gray-200) / <alpha-value>)',
          300: 'rgb(var(--gray-300) / <alpha-value>)',
          400: 'rgb(var(--gray-400) / <alpha-value>)',
          500: 'rgb(var(--gray-500) / <alpha-value>)',
          600: 'rgb(var(--gray-600) / <alpha-value>)',
          700: 'rgb(var(--gray-700) / <alpha-value>)',
          800: 'rgb(var(--gray-800) / <alpha-value>)',
          900: 'rgb(var(--gray-900) / <alpha-value>)',
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
