import type { Config } from 'tailwindcss'

// ─────────────────────────────────────────────────────────────────────────────
// SOURCE OF TRUTH: src/theme/colors.js and src/theme/index.js (the Expo app).
// The palette itself now lives in src/app/globals.css as CSS variables, because
// the web has two themes and the app has one; this file only names them. The
// light-theme values there and the values in colors.js must stay identical — a
// buyer who sees the site and then installs the app has to recognise the same
// product.
// ─────────────────────────────────────────────────────────────────────────────
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Every colour resolves through a CSS variable declared in
        // src/app/globals.css, as an "R G B" triplet so /opacity modifiers
        // (bg-brand/10, bg-ink-900/70) still compose. Swapping .dark on <html>
        // reskins the entire site without touching a single component.
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          bright: 'rgb(var(--brand-bright) / <alpha-value>)',
          deep: 'rgb(var(--brand-deep) / <alpha-value>)',
          light: 'rgb(var(--brand-light) / <alpha-value>)',
          tint: 'rgb(var(--brand-tint) / <alpha-value>)',
          on: 'rgb(var(--on-brand) / <alpha-value>)',
        },
        ink: {
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          light: 'rgb(var(--success-light) / <alpha-value>)',
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
        status: {
          pending: 'rgb(var(--status-pending) / <alpha-value>)',
          pendingBg: 'rgb(var(--status-pending-bg) / <alpha-value>)',
          scheduled: 'rgb(var(--status-scheduled) / <alpha-value>)',
          scheduledBg: 'rgb(var(--status-scheduled-bg) / <alpha-value>)',
          live: 'rgb(var(--status-live) / <alpha-value>)',
          liveBg: 'rgb(var(--status-live-bg) / <alpha-value>)',
          reserved: 'rgb(var(--status-reserved) / <alpha-value>)',
          reservedBg: 'rgb(var(--status-reserved-bg) / <alpha-value>)',
          sold: 'rgb(var(--status-sold) / <alpha-value>)',
          soldBg: 'rgb(var(--status-sold-bg) / <alpha-value>)',
          rejected: 'rgb(var(--status-rejected) / <alpha-value>)',
          rejectedBg: 'rgb(var(--status-rejected-bg) / <alpha-value>)',
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
        // For panels that sit ON a photograph or on ink: a warm shadow is
        // invisible there, so this one is near-black and deep, and carries a
        // top inset highlight so the panel has an edge catching the light.
        'lift-ink':
          '0 24px 60px -18px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.10)',
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
        // Money and stat tiers — ports of typography.price from the app's
        // src/theme/index.js. These are what the seventeen text-[Npx] hacks
        // were reaching for.
        'price': ['1.3125rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }], //     21px — card prices
        'price-lg': ['2rem', { lineHeight: '1.15', letterSpacing: '-0.03em' }], //      32px — detail-page price
        'stat': ['1.75rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }], //       28px — stat tiles
        'body': ['0.9375rem', { lineHeight: '1.6' }], //                                15px — default copy
        // 16px, and it exists for exactly one reason: iOS Safari zooms the
        // whole viewport when a focused form control is set below 16px. Every
        // field on the site was at `body` (15px), so tapping the hero search
        // on an iPhone jerked the page. Fields use this below `sm` and drop to
        // `body` above it, where no phone keyboard is involved.
        'field': ['1rem', { lineHeight: '1.5' }],
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
        kenburns: {
          from: { transform: 'scale(1.08)' },
          to: { transform: 'scale(1)' },
        },
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
        // The hero photograph's arrival: it rises and settles rather than
        // fading in place, which reads as a panel being set down.
        rise: {
          from: { opacity: '0', transform: 'translateY(28px) scale(0.985)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        // The live-inventory dot. Two rings, one animation — a halo that
        // expands and dissolves, so "live" is legible without a label.
        // The certificate's category bars filling once, left to right: the
        // homepage's single orchestrated motion. Transform-only, so it never
        // shifts layout.
        grow: {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        halo: {
          '0%': { transform: 'scale(1)', opacity: '0.55' },
          '70%, 100%': { transform: 'scale(2.6)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        // The hero's almost-imperceptible push-in: 22s, ends and stays. Slow
        // enough that nobody can point at it; the page just feels alive.
        'kenburns': 'kenburns 22s cubic-bezier(0.25, 0.1, 0.25, 1) both',
        'fade-in': 'fade-in 0.5s ease both',
        rise: 'rise 0.9s cubic-bezier(0.16, 1, 0.3, 1) both',
        halo: 'halo 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite',
        grow: 'grow 1.1s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
}

export default config
