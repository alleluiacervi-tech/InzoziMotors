// Builds data/cars.json from the live public listings, read-only.
//
//   node scripts/select-cars.mjs            (uses https://api.sawacars.com)
//   SAWA_API=https://… node scripts/select-cars.mjs
//
// Only ever sends GET requests to public endpoints: the same payload anyone
// browsing sawacars.com receives, which carries no phone numbers, plates or
// addresses. Photos are downloaded to data/images/ (git-ignored) and measured;
// a photo narrower than curation.min_photo_width is never used, because the
// film may not upscale a photograph.
//
// Behind a corporate/agent proxy on Node 22.21+, run with NODE_USE_ENV_PROXY=1.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { imageSize } from './image-size.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const API = (process.env.SAWA_API || 'https://api.sawacars.com').replace(/\/$/, '')
const IMAGES = path.join(ROOT, 'data/images')

/** Port of formatPrice in src/data/cars.js, so the film prints what the app prints. */
export function formatPrice(n) {
  const amount = Number(n)
  if (!Number.isFinite(amount)) return '—'
  if (Math.abs(amount) >= 1_000_000) {
    const millions = amount / 1_000_000
    const compact = millions >= 100 || Number.isInteger(millions)
      ? millions.toFixed(0)
      : millions.toFixed(1).replace(/\.0$/, '')
    return `${compact}M RWF`
  }
  return `RWF ${Math.round(amount).toLocaleString('en-US')}`
}

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  return res.json()
}

async function download(url, dest) {
  try {
    await fs.access(dest)
    return dest
  } catch {}
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  await fs.mkdir(path.dirname(dest), { recursive: true })
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()))
  return dest
}

const shortId = (id) => id.slice(0, 8)
const extOf = (url) => (url.split('?')[0].match(/\.(jpe?g|png|webp)$/i)?.[1] || 'jpg').toLowerCase()
const cleanTitle = (title) => String(title || '').replace(/\s+/g, ' ').trim()

async function measure(car, index) {
  const url = car.images[index]
  const file = path.join(IMAGES, shortId(car.id), `${index}.${extOf(url)}`)
  await download(url, file)
  const { width, height } = imageSize(await fs.readFile(file))
  return { index, url, file: path.relative(ROOT, file), width, height }
}

async function main() {
  const curation = JSON.parse(await fs.readFile(path.join(ROOT, 'data/curation.json'), 'utf8'))
  const floor = curation.min_photo_width || 1400
  const listings = await getJson(`${API}/cars?limit=100`)
  if (!Array.isArray(listings)) throw new Error('Unexpected /cars payload')
  const live = listings.filter((car) => car.status === 'live')
  const byId = new Map(live.map((car) => [car.id, car]))

  const cars = []
  const excluded = []

  for (const pick of curation.cars) {
    const car = byId.get(pick.id)
    if (!car) {
      excluded.push({ id: pick.id, reason: 'No longer live' })
      continue
    }
    const photos = []
    for (const index of pick.photos) {
      if (index >= car.images.length) continue
      const photo = await measure(car, index)
      if (photo.width >= floor) photos.push(photo)
    }
    const needed = pick.role === 'hero' ? 3 : 1
    if (photos.length < needed) {
      excluded.push({ id: car.id, title: cleanTitle(car.title), reason: `Fewer than ${needed} photos at least ${floor}px wide` })
      continue
    }
    cars.push({
      id: car.id,
      role: pick.role,
      title: cleanTitle(car.title),
      year: car.year,
      make: car.make,
      model: car.model,
      price_rwf: car.price,
      price_label: formatPrice(car.price),
      mileage_km: car.mileage,
      mileage_label: `${Number(car.mileage ?? 0).toLocaleString('en-US')} km`,
      fuel: car.fuel_type,
      transmission: car.transmission,
      body: car.body_type,
      drive_side: car.drive_side,
      location: car.location,
      inspection_score: car.inspection_score,
      standout: { label: 'Mileage', value: `${Number(car.mileage ?? 0).toLocaleString('en-US')} km` },
      photos,
      ...(pick.note ? { note: pick.note } : {}),
    })
  }

  // Why every other live listing is not in the film, so the choice is auditable.
  for (const car of live) {
    if (curation.cars.some((pick) => pick.id === car.id)) continue
    let widest = 0
    let size = ''
    for (let i = 0; i < car.images.length; i += 1) {
      const photo = await measure(car, i)
      if (photo.width > widest) {
        widest = photo.width
        size = `${photo.width}×${photo.height}`
      }
    }
    excluded.push({
      id: car.id,
      title: cleanTitle(car.title),
      reason: widest < floor ? `Largest photo ${size}; would need upscaling` : 'Not picked in curation.json',
    })
  }

  if (!cars.some((car) => car.role === 'hero')) throw new Error('No hero car survived selection; edit data/curation.json')

  const out = {
    generated_at: new Date().toISOString(),
    source: `${API}/cars (public, GET only)`,
    rules: {
      min_photo_width: floor,
      never_shown: ['seller names', 'phone numbers', 'plates (already masked by Sawa)', 'exact addresses'],
    },
    cars,
    excluded,
  }
  await fs.writeFile(path.join(ROOT, 'data/cars.json'), `${JSON.stringify(out, null, 2)}\n`)
  console.log(`cars.json: ${cars.length} cars (${cars.map((c) => c.title).join(', ')})`)
  for (const item of excluded) console.log(`  skipped ${item.title || item.id}: ${item.reason}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}

export { download, IMAGES }
