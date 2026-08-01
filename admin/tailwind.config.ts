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
        success: { DEFAULT: '#16A34A', tint: '#EAF6EE' },
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
      boxShadow: {
        card: '0 2px 8px rgba(26, 20, 19, 0.06)',
        'card-lg': '0 8px 28px rgba(26, 20, 19, 0.10)',
      },
    },
  },
  plugins: [],
}

export default config
