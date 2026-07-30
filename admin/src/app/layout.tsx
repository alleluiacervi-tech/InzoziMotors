import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// Inter everywhere — the same face as the website and the app, so the whole
// product family reads as one hand.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Inzozi Motors — Admin',
  description: 'Internal operations dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
