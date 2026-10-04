import Image, { type ImageProps } from 'next/image'
import { isOptimizableImage } from '@/lib/image-hosts'

/**
 * next/image, minus the way it fails.
 *
 * next/image throws during render when a remote src is on a host outside
 * `images.remotePatterns`, and that throw takes down the whole page: one
 * listing photo pasted from another site blanked the homepage, /cars and the
 * seller's profile. Here a photo on an unlisted host is drawn as a plain image
 * instead (no resizing, no AVIF), so the page stays up and the photo still
 * shows. Photos on allowed hosts are optimised exactly as before.
 *
 * Import this, never next/image directly.
 */
export default function SafeImage(props: ImageProps) {
  const unoptimized = props.unoptimized || !isOptimizableImage(props.src)
  return <Image {...props} unoptimized={unoptimized} />
}
