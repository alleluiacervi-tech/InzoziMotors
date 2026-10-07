// 1 · Hook (0–3 s). Six real listings cut on every beat, three two-word
// claims in heavy type, then a Signal Red wipe hands over to the web.

import { SCENES, T } from '../timeline.js'
import { prog, ease, tw } from '../motion.js'
import { el, set } from '../ui/dom.js'
import { Photo } from '../ui/photo.js'
import { Headline } from '../ui/kinetic.js'

// Photo band: full width, 900 tall. A 1600×1200 photo covers it at 0.75, so
// the whole car stays in frame and there is headroom to push in without ever
// enlarging a pixel.
const FRAME = { x: 0, y: 360, w: 1080, h: 900 }

export default function hook(ctx) {
  const group = ctx.group()
  const [hero, ...others] = [ctx.hero, ...ctx.others]
  // Alternate the hero with the other cars; first frame is the hero.
  const shots = [
    hero.photos[0],
    others[0]?.photos[0],
    others[2]?.photos[0] || others[1]?.photos[0],
    others[1]?.photos[0],
    hero.photos[1],
    others[0]?.photos[1] || others[0]?.photos[0],
  ].filter(Boolean)
  const photos = shots.map((photo) => new Photo(group.back, photo, FRAME))

  const brand = el(`<div class="abs" style="left:84px;top:196px;display:flex;align-items:center;gap:22px">
      <img src="/web/public/brand/mark.svg" style="width:72px;height:72px">
      <span style="font-weight:900;font-size:50px;letter-spacing:-0.03em">Sawa Cars</span></div>`)
  group.front.appendChild(brand)

  const lines = [
    new Headline(group.front, ['Real', '*cars.*'], { y: 1352, size: 160 }),
    new Headline(group.front, ['150-point', '*checked.*'], { y: 1352, size: 160 }),
    new Headline(group.front, ['Verified', '*sellers.*'], { y: 1352, size: 160 }),
  ]
  // Thin red index under the photo: fills a segment per beat.
  const rail = el('<div class="abs" style="left:0;top:1256px;width:1080px;height:8px;background:rgba(255,255,255,.12)"><div style="height:100%;width:1080px;background:var(--red);transform-origin:0 50%"></div></div>')
  group.front.appendChild(rail)
  const railFill = rail.firstElementChild

  const wipe = el('<div class="wipe" style="top:0;height:1920px"></div>')
  group.top.appendChild(wipe)

  const cuts = T.hookCuts
  return {
    name: 'hook',
    range: SCENES.hook,
    group,
    update(t) {
      // Which cut is on screen, and how far into it.
      let index = 0
      for (let i = 0; i < cuts.length; i += 1) if (t >= cuts[i]) index = i
      index = Math.min(index, photos.length - 1)
      photos.forEach((photo, i) => {
        // The outgoing photo stays underneath while the next one whips over it.
        const outgoing = i === index - 1 && t < cuts[index] + 0.34
        if (i !== index && !outgoing) return photo.hide()
        const start = cuts[i]
        const enter = prog(t, start, start + 0.34, ease.out)
        const dir = i % 2 === 0 ? 1 : -1
        // Each cut arrives with a whip (slides in, slightly over-zoomed) and
        // keeps pushing in until the next beat: never past native size.
        const zoom = 1.0 + 0.05 * prog(t, start, start + 0.5, ease.drift) + 0.05 * (1 - enter)
        const firstPunch = i === 0 ? 0.08 * (1 - prog(t, 0, 0.42, ease.out)) : 0
        photo.update({ zoom: Math.min(1 / photo.cover, zoom + firstPunch), panX: dir * 220 * (1 - enter), o: 1 })
      })

      const beat = Math.floor(t / 0.5)
      railFill.style.transform = `scaleX(${Math.min(1, (beat + prog(t, beat * 0.5, beat * 0.5 + 0.3, ease.out)) / 6)})`

      set(brand, { o: prog(t, 0.05, 0.45, ease.out) * (1 - prog(t, 2.55, 2.8, ease.in)), y: tw(t, 0.05, 0.6, -20, 0) })

      const [w0, w1, w2] = T.hookWords
      // Each claim is gone before the next lands on the beat.
      const out = { exitDur: 0.24 }
      lines[0].update(t, w0, w1 - 0.28, out)
      lines[1].update(t, w1, w2 - 0.28, out)
      lines[2].update(t, w2, 2.62, out)

      const p = prog(t, T.hookWipe[0], 3, ease.snap)
      set(wipe, { y: 1920 * (1 - p), o: p > 0 ? 1 : 0 })
    },
  }
}
