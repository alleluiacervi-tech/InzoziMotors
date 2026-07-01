import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0A5C2E',
          dark:    '#052E16',
          mid:    '#0B3D1C',
          light:   '#0F5227',
          bright:  '#0D7A3C',
          tint:    '#F0FAF5',
        },
      },
    },
  },
  plugins: [],
}

export default config
