'use client'

import Image, { type ImageProps } from 'next/image'
import { isOptimizableImage } from '@/lib/image-hosts'
import { apiPhotoLoader, isApiPhoto } from '@/lib/api-photo'

/**
 * next/image, minus the way it fails, and with our own uploads sized by the API.
 *
 * next/image throws during render when a remote src is on a host outside
 * `images.remotePatterns`, and that throw takes down the whole page: one
 * listing photo pasted from another site blanked the homepage, /cars and the
 * seller's profile. Here a photo on an unlisted host is drawn as a plain image
 * instead (no resizing, no AVIF), so the page stays up and the photo still
 * shows.
 *
 * A photo uploaded to Sawa is fetched at the API's own resized width
 * (`?w=`, lib/api-photo.ts), which Cloudflare caches near the visitor; anything
 * else allowed (the homepage's own images, Cloudinary) is optimised by
 * /_next/image as before. A client component because a loader is a function,
 * which cannot cross from a server component.
 *
 * Import this, never next/image directly.
 */
export default function SafeImage(props: ImageProps) {
  if (!props.unoptimized && !props.loader && isApiPhoto(props.src)) {
    return <Image {...props} loader={apiPhotoLoader} />
  }
  const unoptimized = props.unoptimized || !isOptimizableImage(props.src)
  return <Image {...props} unoptimized={unoptimized} />
}
