import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: { unoptimized: true },
  poweredByHeader: false,

  // The console publishes, verifies identities and moves money records, so no
  // other site may frame it: a framed admin page is a clickjacking target. Its
  // one iframe (the sandboxed srcDoc mail body) is unaffected — these headers
  // govern who may embed the console, not what the console embeds.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/api/backend/id-verification/doc/:filename',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'no-store, private' },
        ],
      },
    ]
  },
}

export default nextConfig
