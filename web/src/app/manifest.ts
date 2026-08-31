import type { MetadataRoute } from 'next'
import { APP, SITE } from '@/lib/site'

// The website is installable, but it is not a replacement for the app: the
// camera work (ID verification, submission photos) and push notifications are
// native-only. `related_applications` with prefer_related_applications = false
// says exactly that — offer the store listing, don't force it.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — ${SITE.tagline}`,
    short_name: 'Sawa Cars',
    description: SITE.description,
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'en',
    dir: 'ltr',
    theme_color: SITE.themeColor,
    // The warm page background, so the splash does not flash pure white before
    // the first paint lands.
    background_color: '#FAF8F8',
    categories: ['shopping', 'business', 'travel'],

    // SVG rather than a set of checked-in PNGs: the mark is flat vector, so one
    // file covers every density and can never drift from Logo.tsx. The two
    // generated PNG routes cover the browsers that still insist on raster.
    icons: [
      { src: '/brand/mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/brand/mark-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],

    shortcuts: [
      { name: 'Browse certified cars', short_name: 'Buy', url: '/cars' },
      { name: 'Rent a car', short_name: 'Rent', url: '/rentals' },
      { name: 'Sell your car', short_name: 'Sell', url: '/sell' },
    ],

    prefer_related_applications: false,
    // Only list a native app on a store it is actually published on — a browser
    // that surfaces an install prompt for a 404 listing is the same broken
    // promise the store badges guard against.
    related_applications: [
      ...(APP.androidLive
        ? [{ platform: 'play', url: APP.playStoreUrl, id: APP.androidPackage }]
        : []),
      ...(APP.iosLive ? [{ platform: 'itunes', url: APP.appStoreUrl }] : []),
    ],
  }
}
