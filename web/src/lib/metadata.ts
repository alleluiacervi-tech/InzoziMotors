import type { Metadata } from 'next'
import { SITE } from './site'

/**
 * Complete per-route metadata in one call.
 *
 * Next.js does NOT deep-merge the `openGraph` object with the root layout's —
 * a route that sets `title` but not `openGraph` ships the HOMEPAGE's OG card,
 * which is why shared links previewed wrong on WhatsApp. Every route builds its
 * metadata through here so the OG block is always complete and always its own.
 */
export function buildMetadata({
  title,
  description,
  path,
}: {
  title: string
  description: string
  /** Route path starting with '/', used for the canonical URL and og:url. */
  path: string
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE.name,
      locale: SITE.locale,
      type: 'website',
      images: ['/opengraph-image'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}
