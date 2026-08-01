import type { StaticImageData } from 'next/image'
import heroSedanStudio from '@/assets/marketing/hero-sedan-studio.jpeg'
import heroSuvCourtyard from '@/assets/marketing/hero-suv-courtyard.jpeg'
import heroGtCoast from '@/assets/marketing/hero-gt-coast.jpeg'
import suvSideStudio from '@/assets/marketing/suv-side-studio.jpeg'

// ─────────────────────────────────────────────────────────────────────────────
// Curated marketing photography.
//
// HONESTY STANCE — read before adding anything here. These are brand/marketing
// images, used the way AVATR uses product photography as atmosphere. They are:
//   - used ONLY on marketing surfaces (hero fallback slides, body-type
//     showcase, process imagery),
//   - NEVER rendered as a listing, never given a price, never badged, and
//   - ALWAYS second choice: wherever a real live listing exists, its real
//     photograph replaces these.
//
// PROVENANCE / LICENSING — the local images in src/assets/marketing were
// supplied by the team and are manufacturer press assets. Acceptable while the
// site is pre-launch; before public launch they must be either licensed or
// replaced with Sawa's own photography (the 36-angle sets shot at our
// centers). When that day comes, this file is the only place to swap.
//
// Static imports on purpose: next/image gets intrinsic dimensions and can
// generate blur-up placeholders, and a typo'd path fails the build instead of
// 404ing in production.
// ─────────────────────────────────────────────────────────────────────────────

const unsplash = (id: string, w: number) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`

export type MarketingImage = StaticImageData | string

export interface MarketingSlide {
  image: MarketingImage
  /** Honest alt text — describes the photograph, never claims a listing. */
  alt: string
  headline: string
  caption: string
  href: string
  cta: string
}

/** Hero fallback slides — shown only when no live listing exists to lead with. */
export const HERO_SLIDES: MarketingSlide[] = [
  {
    image: heroSedanStudio,
    alt: 'Grand-touring sedan in a violet studio',
    headline: 'Every car inspected. Every seller verified.',
    caption: '150 points, published in full — on every single listing.',
    href: '/cars',
    cta: 'Browse certified cars',
  },
  {
    image: heroSuvCourtyard,
    alt: 'Two SUVs in a modern architectural courtyard',
    headline: 'Sell it once. We do the rest.',
    caption: 'Inspection, photography, buyers and RRA transfer — handled.',
    href: '/sell',
    cta: 'Value my car',
  },
  {
    image: heroGtCoast,
    alt: 'Sedan driving a coastal road past an orange wall',
    headline: 'Rent the same certified standard.',
    caption: 'Deposits back in full after the return check.',
    href: '/rentals',
    cta: 'See the fleet',
  },
]

/** Body-type families — the browse showcase. Real inventory photos replace
 *  these per-family the moment a live listing of that type exists.
 *  Hatchback and Pickup keep stock photography: the supplied set contains
 *  neither, and a sedan wearing a "Pickup" label would be a lie. */
export const BODY_TYPE_IMAGES: Record<string, { image: MarketingImage; alt: string }> = {
  SUV: {
    image: suvSideStudio,
    alt: 'SUV side profile in a studio',
  },
  Sedan: {
    image: heroSedanStudio,
    alt: 'Sedan in a violet studio',
  },
  Hatchback: {
    image: unsplash('photo-1590362891991-f776e747a588', 1000),
    alt: 'Compact hatchback parked on a city street',
  },
  Pickup: {
    image: unsplash('photo-1559416523-140ddc3d238c', 1000),
    alt: 'Pickup truck on open ground',
  },
}

/** The handover moment — the one process step that earns an image. */
export const HANDOVER_IMAGE: { image: MarketingImage; alt: string } = {
  image: heroSuvCourtyard,
  alt: 'Cars presented in a modern courtyard',
}
