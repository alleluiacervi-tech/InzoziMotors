import type { Config } from 'tailwindcss'

// ─────────────────────────────────────────────────────────────────────────────
// SOURCE OF TRUTH: src/theme/colors.js and src/theme/index.js (the Expo app).
// Every value below is a literal port. If the mobile brand changes, change it
// there first, then mirror it here — the two must never drift, because a buyer
// who sees the site and then installs the app has to recognise the same product.
// ─────────────────────────────────────────────────────────────────────────────
const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Brand red — Encar crimson, sampled from encar.com's own mark.
        // DISCIPLINE (carried over from mobile): red appears ONLY as a price, a
        // primary action, a selected/active state, the Certified+ badge, or an
        // inline action link. Never as decoration.
        brand: {
          DEFAULT: '#CC050F',
          bright: '#DE0714',
          deep: '#A50410',
          light: '#EE8B90',
          tint: '#F3F2F2',
        },
        // Dark surfaces — premium warm charcoal, red stays the accent
        ink: {
          900: '#17120F',
          800: '#281F1C',
          700: '#3A2D29',
        },
        // Semantic — true success green. Never used for brand moments.
        success: { DEFAULT: '#16A34A', light: '#4ADE80', tint: '#EAF6EE' },
        warning: { DEFAULT: '#D97706', tint: '#FEF3C7', text: '#B45309' },
        danger: { DEFAULT: '#B4233A', tint: '#FBECEF', strong: '#B91C1C' },
        info: { DEFAULT: '#1D4ED8', tint: '#EFF6FF' },

        // Pipeline status tokens — identical keys to colors.js so a status
        // string coming off the API renders the same on web and mobile.
        status: {
          pending: '#D97706',
          pendingBg: '#FEF3C7',
          scheduled: '#1D4ED8',
          scheduledBg: '#EFF6FF',
          live: '#16A34A',
          liveBg: '#EAF6EE',
          reserved: '#7C3AED',
          reservedBg: '#F5F3FF',
          sold: '#6B7280',
          soldBg: '#F5F5F5',
          rejected: '#B91C1C',
          rejectedBg: '#FEF2F2',
        },

        // Neutrals — very slightly red-warm, matching the app
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#F6F4F4',
          page: '#FAF8F8',
        },
        line: { DEFAULT: '#E8E3E3', soft: '#F0EDED' },
        content: {
          DEFAULT: '#1B1313',
          secondary: '#423737',
          muted: '#7A6E6E',
        },
      },

      fontFamily: {
        // Satoshi across every platform — the app bundles the files via
        // expo-font, the web via next/font/local (see layout.tsx).
        sans: ['var(--font-satoshi)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },

      // Mobile's radius scale, plus web-scale values for full-bleed sections
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '14px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '28px',
        pill: '999px',
      },

      // Ported from shadows in src/theme/index.js — warm, low, realistic.
      // Web gets slightly wider spreads because pointer devices sit further back.
      boxShadow: {
        card: '0 2px 8px rgba(26, 20, 19, 0.08)',
        'card-lg': '0 8px 28px rgba(26, 20, 19, 0.10)',
        float: '0 12px 40px rgba(26, 20, 19, 0.14)',
        brand: '0 4px 14px rgba(204, 5, 15, 0.28)',
        'brand-lg': '0 10px 34px rgba(204, 5, 15, 0.30)',
        inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
      },

      // Display sizes for the marketing surfaces. Tight negative tracking is a
      // brand signature — it comes straight from typography.display in mobile.
      fontSize: {
        'display-xl': ['clamp(2.75rem, 6vw, 5rem)', { lineHeight: '1.03', letterSpacing: '-0.035em' }],
        'display': ['clamp(2.25rem, 4.5vw, 3.5rem)', { lineHeight: '1.06', letterSpacing: '-0.03em' }],
        'headline': ['clamp(1.75rem, 3vw, 2.5rem)', { lineHeight: '1.12', letterSpacing: '-0.025em' }],
        'title': ['clamp(1.25rem, 2vw, 1.5rem)', { lineHeight: '1.2', letterSpacing: '-0.015em' }],
        // The lower half of the ladder. Arbitrary text-[Npx] values are banned
        // site-wide — every size below `title` is one of these four, and
        // nothing on the site renders under 12px.
        'title-sm': ['1.0625rem', { lineHeight: '1.35', letterSpacing: '-0.01em' }], // 17px — card/panel titles
        'body': ['0.9375rem', { lineHeight: '1.6' }], //                                15px — default copy
        'caption': ['0.8125rem', { lineHeight: '1.5' }], //                             13px — spec strips, meta
        'micro': ['0.75rem', { lineHeight: '1.4' }], //                                 12px — footnotes, logistics
        'eyebrow': ['0.75rem', { lineHeight: '1', letterSpacing: '0.14em' }],
      },

      maxWidth: {
        // The site frame. 1200px read as a floating strip on 1920px monitors —
        // a photo-led marketplace should fill the room it's given. Text columns
        // are capped per-element (max-w-2xl / max-w-prose), so widening the
        // frame widens imagery and grids, never line lengths.
        content: '1400px',
        prose: '68ch',
      },

      transitionTimingFunction: {
        // One easing curve for the whole site. Matches the spring feel of the
        // app's Animated.spring(friction: 8, tension: 60) closely enough that
        // motion reads as the same product.
        brand: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },

      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.5s ease both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
}

export default config
