// Hosts whose photos Next may fetch and resize. next.config.ts reads this list,
// and SafeImage checks against it, so the two can never disagree.
//
// Matching follows next/image's remotePatterns: `**.` is any subdomain depth
// (not the bare domain), an omitted port matches any port.
export type RemoteImagePattern = { protocol: 'http' | 'https'; hostname: string }

export const REMOTE_IMAGE_PATTERNS: RemoteImagePattern[] = [
  { protocol: 'https', hostname: '**.sawacars.com' },
  { protocol: 'https', hostname: 'images.unsplash.com' },
  { protocol: 'https', hostname: 'res.cloudinary.com' },
  { protocol: 'http', hostname: 'localhost' },
  { protocol: 'http', hostname: '10.0.2.2' },
]

function hostMatches(pattern: string, host: string): boolean {
  if (pattern.startsWith('**.')) return host.endsWith(pattern.slice(2))
  if (pattern.startsWith('*.')) {
    const rest = pattern.slice(1)
    return host.endsWith(rest) && !host.slice(0, -rest.length).includes('.')
  }
  return host === pattern
}

/** True when next/image may optimise this src: a local path, a static import,
 *  or an absolute URL on an allowed host. */
export function isOptimizableImage(src: unknown): boolean {
  if (typeof src !== 'string') return true
  if (src.startsWith('/') && !src.startsWith('//')) return true
  let url: URL
  try {
    url = new URL(src)
  } catch {
    return false
  }
  const protocol = url.protocol.replace(':', '')
  return REMOTE_IMAGE_PATTERNS.some((p) => p.protocol === protocol && hostMatches(p.hostname, url.hostname))
}
