import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

// Satoshi everywhere — the same four files the website and the Expo app bundle,
// so the whole product sets type identically. 600 and 800 resolve down to the
// nearest real weight, matching the app's map in src/theme/index.js.
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
  title: 'Sawa Cars — Admin',
  description: 'Internal operations dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={satoshi.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        {/* Runs before the first pixel: a stored choice wins, otherwise the
            operating system decides. Doing this in <body> rather than in a
            component is the only way to avoid a white flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('sawa-admin-theme');" +
              "var d=t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches);" +
              "document.documentElement.classList.toggle('dark',d);}catch(e){}",
          }}
        />
        {children}
      </body>
    </html>
  )
}
