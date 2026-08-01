import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getCurrentUser } from '@/lib/session'
import { SITE } from '@/lib/site'
import './globals.css'

// Inter, self-hosted by next/font — the same family the Expo app loads via
// @expo-google-fonts/inter. `display: swap` keeps text visible during load,
// which matters far more than a flash of fallback on Rwandan mobile networks.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
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
    'inspected used cars', 'Sawa',
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
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
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

  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <Header user={user} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
