// ─────────────────────────────────────────────────────────────────────────────
// Curated marketing photography.
//
// HONESTY STANCE — read before adding anything here. These are brand/marketing
// images (licensed Unsplash photography, the same set the demo data ships), in
// the same way AVATR's site uses product photography as atmosphere. They are:
//   - used ONLY on marketing surfaces (hero fallback slides, body-type
//     showcase, process imagery),
//   - NEVER rendered as a listing, never given a price, never badged, and
//   - ALWAYS second choice: wherever a real live listing exists, its real
//     photograph replaces these.
// Every ID below already ships in this repo's demo dataset, so the URLs are
// known-good and allowed by next.config remotePatterns.
// ─────────────────────────────────────────────────────────────────────────────

const unsplash = (id: string, w: number) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`

export interface MarketingSlide {
  image: string
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
    image: unsplash('photo-1503376780353-7e6692767b70', 1800),
    alt: 'Sports car on an open road at dusk',
    headline: 'Every car inspected. Every seller verified.',
    caption: '150 points, published in full — on every single listing.',
    href: '/cars',
    cta: 'Browse certified cars',
  },
  {
    image: unsplash('photo-1511919884226-fd3cad34687c', 1800),
    alt: 'Black car photographed head-on in low light',
    headline: 'Sell it once. We do the rest.',
    caption: 'Inspection, photography, buyers and RRA transfer — handled.',
    href: '/sell',
    cta: 'Value my car',
  },
  {
    image: unsplash('photo-1533473359331-0135ef1b58bf', 1800),
    alt: 'SUV driving a scenic highland road',
    headline: 'Rent the same certified standard.',
    caption: 'Deposits back in full after the return check.',
    href: '/rentals',
    cta: 'See the fleet',
  },
]

/** Body-type families — the browse showcase. Real inventory photos replace
 *  these per-family the moment a live listing of that type exists. */
export const BODY_TYPE_IMAGES: Record<string, { image: string; alt: string }> = {
  SUV: {
    image: unsplash('photo-1568844293986-8d0400bd4745', 1000),
    alt: 'White SUV in warm light',
  },
  Sedan: {
    image: unsplash('photo-1618843479313-40f8afb4b4d8', 1000),
    alt: 'Sedan photographed against a dark studio background',
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
export const HANDOVER_IMAGE = {
  image: unsplash('photo-1560958089-b8a1929cea89', 1200),
  alt: 'Car presented in a clean studio setting',
}
