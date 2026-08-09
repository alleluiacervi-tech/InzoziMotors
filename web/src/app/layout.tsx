import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getCurrentUser } from '@/lib/session'
import { fx } from '@/lib/api'
import { setRwfRate } from '@/lib/business'
import { FxSync } from '@/components/FxSync'
import { SITE } from '@/lib/site'
import './globals.css'

// Satoshi (Indian Type Foundry), self-hosted by next/font — the same four files
// the Expo app bundles, so the website and the app set type identically.
// Satoshi has no 600 or 800, so those weights resolve down to 500 and 700 to
// match the app's map in src/theme/index.js. `display: swap` keeps text visible
// during load, which matters far more than a flash of fallback on Rwandan
// mobile networks.
const satoshi = localFont({
  src: [
    { path: '../fonts/Satoshi-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../fonts/Satoshi-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../fonts/Satoshi-Medium.ttf', weight: '600', style: 'normal' },
    { path: '../fonts/Satoshi-Bold.ttf', weight: '700', style: 'normal' },
    { path: '../fonts/Satoshi-Bold.ttf', weight: '800', style: 'normal' },
    { path: '../fonts/Satoshi-Black.ttf', weight: '900', style: 'normal' },
  ],
  variable: '--font-satoshi',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    'cars for sale Rwanda', 'used cars Kigali', 'certified cars Rwanda',
    'buy car Kigali', 'sell car Rwanda', 'car rental Kigali',
    'inspected used cars', 'Sawa Cars',
  ],
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  publisher: SITE.name,
  formatDetection: { telephone: true, address: false, email: false },
  openGraph: {
    type: 'website',
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  // Search Console / Bing site ownership. Set the env vars once and the meta
  // tags appear; unset they are omitted entirely rather than shipping an empty
  // token that fails verification.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
  alternates: { canonical: '/' },
}

export const viewport: Viewport = {
  themeColor: SITE.themeColor,
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolved server-side from the httpOnly cookie. The JWT itself never reaches
  // the browser — only the safe profile fields the header needs.
  const user = await getCurrentUser()

  // The live USD⇄RWF rate, fetched once per hour (Next revalidate) and pushed
  // into lib/business for every server component below; <FxSync/> repeats the
  // push for the client bundle. Never throws — fx.get falls back flagged-stale.
  const rate = await fx.get()
  setRwfRate(rate.rate)

  return (
    <html lang="en" className={satoshi.variable}>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <FxSync rate={rate.rate} />
        <Header user={user} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
