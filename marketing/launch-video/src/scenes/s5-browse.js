// 5 · Browse (23–38 s). The home feed with real listings; a tap on the
// filter chip reflows the grid; the hero car's card expands into its detail
// page; the camera leaves the phone for the full-size photographs, comes
// back for the specs and the 150-point score, and settles on the CTA bar.
//
// homeState() and detailState() are pure functions of the film's clock, used
// by every scene that shows these screens, so any frame renders identically
// whatever was rendered before it.

import { SCENES, T } from '../timeline.js'
import { prog, ease, keys, lerp } from '../motion.js'
import { el, set, show, text } from '../ui/dom.js'
import { Headline, Chapter } from '../ui/kinetic.js'
import { Photo } from '../ui/photo.js'
import { MEDIUM, HEAD, tap, pressScale } from './common.js'

const SCROLL = 90
const FEED_TOP = 116

// ── Home feed ─────────────────────────────────────────────────────────
function homeLayout(ctx) {
  if (ctx.__home) return ctx.__home
  const v = ctx.views.home
  const cell = ctx.measure(v.cells[0])
  const grid = ctx.measure(v.grid)
  const chips = ctx.measure(v.chipFilter)
  const slot = (i) => ({ x: 8 + (i % 2) * cell.w, y: Math.floor(i / 2) * cell.h })
  const keptIdx = ctx.feed.map((car, i) => (ctx.filter.test(car) ? i : -1)).filter((i) => i >= 0)
  ctx.__home = { cell, grid, chips, slot, keptIdx }
  return ctx.__home
}

export function homeState(ctx, t) {
  const v = ctx.views.home
  const L = homeLayout(ctx)
  set(v.feed, { y: -SCROLL * prog(t, T.feedScroll[0], T.feedScroll[1], ease.inOut) })

  const filtered = t >= T.tapChip + 0.04
  v.chipAll.classList.toggle('on', !filtered)
  v.chipFilter.classList.toggle('on', filtered)
  set(v.chipFilter, { s: pressScale(t, T.tapChip), origin: '50% 50%' })
  const swap = prog(t, T.tapChip + 0.05, T.tapChip + 0.4, ease.out)
  set(v.sectAll, { o: 1 - swap, y: -10 * swap })
  set(v.sectFilter, { o: swap, y: 10 * (1 - swap) })
  set(v.sectMore, { o: 1 - swap })

  v.cells.forEach((cell, i) => {
    // Cards stagger in as the feed first appears (StaggerEntrance), then
    // reflow to their filtered slots; a card the filter removes shrinks away.
    const enter = prog(t, T.toFeed[0] + 0.12 + i * 0.07, T.toFeed[0] + 0.62 + i * 0.07, ease.out)
    const kept = L.keptIdx.indexOf(i)
    const from = L.slot(i)
    if (kept < 0) {
      const gone = prog(t, T.reflow[0], T.reflow[0] + 0.3, ease.in)
      set(cell, { x: from.x, y: from.y + 24 * (1 - enter), s: 1 - 0.1 * gone, o: enter * (1 - gone), origin: '50% 40%' })
      return
    }
    const to = L.slot(kept)
    const move = prog(t, T.reflow[0] + 0.08 + kept * 0.06, T.reflow[0] + 0.62 + kept * 0.06, ease.out)
    set(cell, { x: lerp(from.x, to.x, move), y: lerp(from.y, to.y, move) + 24 * (1 - enter), o: enter })
  })
}

/** The hero's card image, in screen coordinates, after the filter. */
export function heroCardImage(ctx) {
  const L = homeLayout(ctx)
  const heroIdx = ctx.feed.indexOf(ctx.hero)
  const kept = L.keptIdx.indexOf(heroIdx)
  const slot = L.slot(kept < 0 ? heroIdx : kept)
  const x = slot.x + 6
  const y = L.grid.y - SCROLL + slot.y + 6
  const w = L.cell.w - 12
  return { x, y, w, h: w * 0.75, cx: x + w / 2, cy: y + (w * 0.75) / 2 }
}

// ── Vehicle detail ────────────────────────────────────────────────────
export function detailState(ctx, t) {
  const v = ctx.views.detail
  // Gallery swipes in step with the full-screen photos.
  const s1 = prog(t, T.photoSwaps[0], T.photoSwaps[0] + 0.4, ease.snap)
  const s2 = prog(t, T.photoSwaps[1], T.photoSwaps[1] + 0.4, ease.snap)
  const index = s1 + s2 * 2
  set(v.strip, { x: -390 * index })
  text(v.count, `${Math.round(index) + 1} / ${ctx.hero.photos.length}`)

  // Specs pulse on the beat, then the inspection row.
  v.specs.forEach((spec, i) => {
    const at = T.specTiles[i]
    const pulse = Math.sin(Math.PI * prog(t, at, at + 0.42, ease.out))
    set(spec, { s: 1 + 0.08 * pulse, origin: '50% 50%' })
    spec.style.borderColor = pulse > 0.05 ? `rgba(204,5,15,${0.25 + 0.6 * pulse})` : ''
  })
  const row = Math.sin(Math.PI * prog(t, T.inspectRow, T.inspectRow + 0.6, ease.out))
  set(v.irow, { s: 1 + 0.05 * row, origin: '50% 50%' })
  v.irow.style.boxShadow = row > 0.02 ? `0 0 0 ${2 + 4 * row}px rgba(22,163,74,${0.35 * row})` : ''
  set(v.contactBtn, { s: pressScale(t, T.tapContact), origin: '50% 50%' })
}

/** Camera on the sticky CTA bar: where browse ends and chat begins. */
export function ctaCam(ctx) {
  const cta = ctx.measure(ctx.views.detail.cta)
  return { fx: 195, fy: cta.y + 30, X: 540, Y: 1240, s: 2.45, r: 0 }
}

export default function browse(ctx) {
  const group = ctx.group()
  const { phone, views, hero } = ctx
  const L = homeLayout(ctx)
  const card = heroCardImage(ctx)
  const specs = ctx.measure(views.detail.specs[0].parentElement)
  const irow = ctx.measure(views.detail.irow)

  const chapter = new Chapter(group.front, '04', 'Browse')
  const head1 = new Headline(group.front, ['Every car,', '*inspected.*'], { y: HEAD.y + 54, size: HEAD.size - 8 })
  const head2 = new Headline(group.front, ['Filter', '*in a tap.*'], { y: HEAD.y + 54, size: HEAD.size - 8 })
  const head3 = new Headline(group.front, ['Every detail,', '*upfront.*'], { y: HEAD.y + 54, size: HEAD.size - 8 })

  // Full-screen photographs: the gallery at 1080 px wide matches the photo's
  // 0.675 scale exactly, so the hand-off from phone to stage is seamless.
  const GALLERY_S = 1080 / 390
  const galleryFrame = { x: 0, y: 900 - (292.5 * GALLERY_S) / 2, w: 1080, h: 292.5 * GALLERY_S }
  const bigFrame = { x: 0, y: 330, w: 1080, h: 900 }
  const shots = [hero.photos[0], hero.photos[1], hero.photos[3] || hero.photos[2]].filter(Boolean)
  const photos = shots.map((photo) => new Photo(group.back, photo, bigFrame))
  const caption = el(`<div class="abs" style="left:84px;right:84px;top:1300px">
      <div style="font-weight:700;font-size:40px;color:rgba(255,255,255,.66)">${hero.year} · ${hero.mileage_label} · ${hero.inspection_score}/150</div>
      <div style="margin-top:14px;font-weight:900;font-size:104px;line-height:1;letter-spacing:-0.045em">${hero.make} ${hero.model}</div>
      <div style="margin-top:16px;font-weight:900;font-size:104px;line-height:1;letter-spacing:-0.045em;color:var(--red-bright)">${hero.price_label}</div></div>`)
  group.front.appendChild(caption)
  const counter = el('<div class="abs" style="right:44px;top:358px;padding:10px 20px;border-radius:30px;background:rgba(20,17,15,.72);font-weight:700;font-size:28px"></div>')
  group.front.appendChild(counter)

  const chipCam = { fx: 195, fy: L.chips.cy - SCROLL + 60, X: 540, Y: 1190, s: 2.6, r: 0 }
  const gridCam = { fx: 195, fy: 470, X: 540, Y: 1180, s: 1.95, r: 0 }
  const cardCam = { fx: card.cx + 20, fy: card.cy + 50, X: 540, Y: 1000, s: 2.75, r: 0 }
  const detailCam = { ...MEDIUM }
  const galleryCam = { fx: 195, fy: 160, X: 540, Y: 900, s: GALLERY_S, r: 0 }
  const specsCam = { fx: 195, fy: (specs.y + irow.y + irow.h) / 2, X: 540, Y: 960, s: 2.75, r: 0 }
  const endCam = ctaCam(ctx)

  return {
    name: 'browse',
    range: SCENES.browse,
    group,
    update(t) {
      const cam = keys(t, [
        [23.0, MEDIUM],
        [26.3, { ...MEDIUM, s: 1.58, Y: MEDIUM.Y - 10 }, ease.drift],
        [26.75, chipCam, ease.snap],
        [27.5, { ...chipCam, s: 2.66 }, ease.drift],
        [28.3, gridCam, ease.inOut],
        [29.95, { ...gridCam, s: 2.02 }, ease.drift],
        [30.3, cardCam, ease.snap],
        [30.6, { ...cardCam, s: 2.82 }, ease.drift],
        [31.4, detailCam, ease.inOut],
        [33.4, { ...detailCam, s: 1.56 }, ease.drift],
        [33.9, galleryCam, ease.inOut],
        [35.95, galleryCam],
        [36.0, { ...specsCam, s: 3.3 }],
        [36.45, specsCam, ease.out],
        [37.55, { ...specsCam, s: 2.85 }, ease.drift],
        [38.0, endCam, ease.inOut],
      ])
      // The phone gives way to the stage photos between 33.9 and 36.0.
      const photoOn = prog(t, 33.85, 33.95, ease.inOut) * (1 - prog(t, 35.95, 36.25, ease.out))
      const phoneOpacity = t < 33.9 ? 1 : t < 36 ? 0 : prog(t, 36, 36.2, ease.out)
      phone.camera(cam, phoneOpacity)

      homeState(ctx, t)
      detailState(ctx, t)
      phone.place('home', { z: 1 })

      // Shared-element expand: the detail page grows out of the card image.
      const grow = prog(t, T.expand[0], T.expand[1], ease.out)
      if (t >= T.expand[0]) {
        const k = lerp(card.w / 390, 1, grow)
        const clipBottom = lerp(844 - card.h / (card.w / 390), 0, grow)
        views.detail.node.style.clipPath = `inset(0 0 ${clipBottom}px 0 round ${lerp(14 / (card.w / 390), 0, grow)}px)`
        phone.place('detail', { x: card.x * (1 - grow), y: card.y * (1 - grow), s: k, z: 2, origin: '0 0' })
        phone.status(grow > 0.5 ? 'light' : 'dark')
      } else {
        phone.status('dark')
      }

      // Taps: chip, then the hero card.
      tap(ctx, t, T.tapChip, L.chips)
      tap(ctx, t, T.tapCard, card)

      // Stage photographs.
      const pull = prog(t, 33.9, 34.45, ease.inOut)
      photos.forEach((photo, i) => {
        const at = i === 0 ? -1 : T.photoSwaps[i - 1]
        const swap = i === 0 ? 1 : prog(t, at, at + 0.4, ease.snap)
        const next = i + 1 < photos.length ? prog(t, T.photoSwaps[i], T.photoSwaps[i] + 0.4, ease.snap) : 0
        if (photoOn <= 0 || swap <= 0 || next >= 1) return photo.hide()
        show(photo.el, true)
        // Frame grows from the gallery's footprint to the big band.
        const f = {
          x: 0,
          y: lerp(galleryFrame.y, bigFrame.y, pull),
          h: lerp(galleryFrame.h, bigFrame.h, pull),
        }
        photo.el.style.top = `${f.y}px`
        photo.el.style.height = `${f.h}px`
        const cover = Math.max(1080 / photo.photo.width, f.h / photo.photo.height)
        const drift = 1 + 0.04 * prog(t, 34, 36, ease.drift)
        photo.cover = Math.min(1, cover)
        photo.update({ zoom: drift, panX: 1080 * (1 - swap) - 324 * next, o: photoOn })
      })
      const capIn = prog(t, 34.1, 34.6, ease.out)
      set(caption, { y: 60 * (1 - capIn), o: capIn * (1 - prog(t, 35.8, 36.0, ease.in)) })
      const shown = 1 + (t >= T.photoSwaps[0] + 0.2 ? 1 : 0) + (t >= T.photoSwaps[1] + 0.2 ? 1 : 0)
      text(counter, `${shown} / ${hero.photos.length}`)
      set(counter, { o: photoOn * prog(t, 34.2, 34.5, ease.out) })

      chapter.update(t, 23.15, 26.35)
      head1.update(t, 23.2, 26.35)
      head2.update(t, 26.75, 28.05)
      head3.update(t, 31.25, 33.45)
    },
  }
}
