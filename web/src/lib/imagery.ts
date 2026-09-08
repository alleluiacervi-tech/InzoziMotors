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
    image: heroSuvCourtyard,
    alt: 'Modern luxury SUVs in an ultra-modern architectural courtyard',
    headline: 'Every car inspected. Every seller verified.',
    caption: '150 physical diagnostic points, published in full on every single listing.',
    href: '/cars',
    cta: 'Browse certified cars',
  },
  {
    image: '/img/inspection-alignment.jpg',
    alt: 'Vehicle undergoing computerized 150-point laser wheel alignment diagnostics',
    headline: 'Physical 150-Point Inspection Diagnostics',
    caption: 'Laser wheel alignment, powertrain diagnostics, and zero odometer rollbacks.',
    href: '/how-it-works',
    cta: 'See inspection standards',
  },
  {
    image: '/img/lot.jpg',
    alt: 'Inspected and certified vehicle inventory ready for immediate delivery in Kigali',
    headline: 'Verified Title. 48-Hour RRA Registration.',
    caption: 'Direct title transfer, clear customs status, and local test drives in Kigali.',
    href: '/cars',
    cta: 'Explore verified stock',
  },
  {
    image: heroGtCoast,
    alt: 'Sports sedan driving an open road',
    headline: 'Rent the same certified standard.',
    caption: 'Deposits back in full after the digital return check.',
    href: '/rentals',
    cta: 'See rental fleet',
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
    // Verified by eye: a VW Golf, an actual hatchback. The previous id
    // (photo-1590362891991) renders a Mercedes GLE — an SUV in a neon garage —
    // so the tile contradicted its own label, which is worse than no image.
    image: unsplash('photo-1471444928139-48c5bf5173f8', 1000),
    alt: 'Black Volkswagen Golf hatchback parked by the sea',
  },
  Pickup: {
    image: unsplash('photo-1559416523-140ddc3d238c', 1000),
    alt: 'Pickup truck on open ground',
  },
}
