import type { NextConfig } from 'next'

// The API host is read at request time (not baked in) so one image can be
// promoted between environments — same discipline as the mobile app's
// extra.apiUrl. NEXT_PUBLIC_* is inlined for the browser bundle; API_URL is the
// server-side equivalent used by Server Components talking to the VPS directly.
const nextConfig: NextConfig = {
  output: 'standalone',
  // Keep standalone tracing scoped to this app. Without an explicit root,
  // Next walks up to the first lockfile it finds (on a developer machine that
  // can be the user's home directory), producing oversized deploy artefacts.
  outputFileTracingRoot: process.cwd(),
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
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '10.0.2.2' },
    ],
  },

  // About and Marketplace safety merged into How Sawa works
  // (docs/WEBSITE-REDESIGN-TODO.md, 2.11). Redirected here rather than in a
  // page, because the root loading.tsx streams every route and a redirect
  // thrown mid-stream degrades to a meta refresh with status 200.
  async redirects() {
    return [
      { source: '/about', destination: '/how-it-works#why', permanent: true },
      { source: '/promise', destination: '/how-it-works#controls', permanent: true },
    ]
  },

  async headers() {
    // Camera access is blocked site-wide by default (W1 in
    // docs/WEB-PARITY-PLAN.md) and opened only on the routes that actually
    // capture a photo live — ID verification and the reference-photo step of
    // vehicle submission (D4). Both entries below are matched after the
    // catch-all, and Next applies the later match's value for a header key
    // that both blocks set, so these routes get `camera=(self)` while
    // everything else keeps `camera=()`.
    const CAMERA_ROUTES = ['/dashboard/verify', '/sell/submit']
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
      ...CAMERA_ROUTES.flatMap((route) => [
        { source: route, headers: [{ key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self)' }] },
        { source: `${route}/:path*`, headers: [{ key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self)' }] },
      ]),
      {
        // Apple requires this file be served as JSON with no extension
        source: '/.well-known/apple-app-site-association',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
    ]
  },
}

export default nextConfig
