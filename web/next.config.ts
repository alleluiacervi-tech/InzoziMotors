import type { NextConfig } from 'next'

// The API host is read at request time (not baked in) so one image can be
// promoted between environments — same discipline as the mobile app's
// extra.apiUrl. NEXT_PUBLIC_* is inlined for the browser bundle; API_URL is the
// server-side equivalent used by Server Components talking to the VPS directly.
const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    // Listing photos are served by the API host (and Unsplash in demo data).
    // remotePatterns rather than unoptimized: this is a photo-led marketplace,
    // so resizing and AVIF/WebP negotiation are worth real money in LCP.
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**.sawacars.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '10.0.2.2' },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      {
        // Apple requires this file be served as JSON with no extension
        source: '/.well-known/apple-app-site-association',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
    ]
  },
}

export default nextConfig
