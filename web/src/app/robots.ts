import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'

// The whole public marketplace is meant to be indexed — that is the point of
// server-rendering the catalogue. Only the signed-in surfaces and the internal
// route handlers are held back: /dashboard is per-user, and /api exists purely
// so client components can reach the backend without ever holding the JWT.

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/api/'],
      },
    ],
    // Absolute, per the sitemap protocol — a relative reference is ignored.
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  }
}
