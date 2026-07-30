import { Image } from 'react-native';

// ─── Bundled studio photography ──────────────────────────────────────────────
// The same 21 professional images the website's database is seeded with
// (backend/uploads/seed → assets/cars). Bundling them means demo mode looks
// identical to the live marketplace, with no network at all.
//
// Everything is resolved to a plain URI string so the app's existing
// `source={{ uri: car.image }}` call sites keep working untouched.

const u = (mod) => Image.resolveAssetSource(mod).uri;

export const STUDIO = {
  heroSedan: u(require('../../assets/cars/hero-sedan-studio.jpeg')),
  heroSuv: u(require('../../assets/cars/hero-suv-courtyard.jpeg')),
  heroGt: u(require('../../assets/cars/hero-gt-coast.jpeg')),
  suvSideStudio: u(require('../../assets/cars/suv-side-studio.jpeg')),
  suvSide03: u(require('../../assets/cars/suv-side-03.jpeg')),
  suvSide04: u(require('../../assets/cars/suv-side-04.jpeg')),
  suvSide07: u(require('../../assets/cars/suv-side-07.jpeg')),
  paint01: u(require('../../assets/cars/paint-01.jpeg')),
  paint03: u(require('../../assets/cars/paint-03.jpeg')),
  paint05: u(require('../../assets/cars/paint-05.jpeg')),
  paint06: u(require('../../assets/cars/paint-06.jpeg')),
  paintBlue: u(require('../../assets/cars/paint-blue.jpeg')),
  paintBlack: u(require('../../assets/cars/paint-glossy-black.jpeg')),
  paintGlossyGrey: u(require('../../assets/cars/paint-glossy-grey.jpeg')),
  paintGrey: u(require('../../assets/cars/paint-grey.jpeg')),
  paintPurple: u(require('../../assets/cars/paint-purple.jpeg')),
  paintPurple2: u(require('../../assets/cars/paint-purple-2.jpeg')),
  paintSilver: u(require('../../assets/cars/paint-silver.jpeg')),
  paintSkylight: u(require('../../assets/cars/paint-skylight-silk.jpeg')),
  paintBronze: u(require('../../assets/cars/paint-solar-bronze.jpeg')),
  paintWhite: u(require('../../assets/cars/paint-white.jpeg')),
};

const S = STUDIO;

// Family pools — SUV shots go to SUVs, sedan studio shots to sedans, the GT
// coast shot to coupes/supercars. Mirrors how the website's seed assigns them.
const POOLS = {
  suv: [S.suvSideStudio, S.suvSide03, S.suvSide04, S.suvSide07, S.heroSuv],
  sedan: [
    S.heroSedan, S.paintWhite, S.paintSilver, S.paintGrey, S.paintGlossyGrey,
    S.paintBlack, S.paintBlue, S.paintSkylight, S.paint01, S.paint03, S.paint05, S.paint06,
  ],
  sport: [S.heroGt, S.paintBronze, S.paintPurple, S.paintPurple2, S.paintBlack],
};

const FAMILY_BY_CATEGORY = {
  SUV: 'suv', Truck: 'suv',
  Sedan: 'sedan', EV: 'sedan', Hatchback: 'sedan', Wagon: 'sedan',
  Coupe: 'sport', Supercar: 'sport', Convertible: 'sport',
};

/**
 * Deterministic 3-image set for a demo car: same category + sequence number
 * always yields the same photos, rotated through the family pool so adjacent
 * cards don't repeat.
 */
export function demoSet(category, seq = 0) {
  const pool = POOLS[FAMILY_BY_CATEGORY[category] || 'sedan'];
  const start = (seq * 3) % pool.length;
  return [0, 1, 2].map((i) => pool[(start + i) % pool.length]);
}

/** Fallback for API cars that arrive without photos. */
export const DEFAULT_CAR_IMAGE = S.heroSedan;
export const DEFAULT_CAR_IMAGES = [S.heroSedan, S.paintSilver, S.paintBlack];
