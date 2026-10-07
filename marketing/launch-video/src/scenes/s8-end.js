// 8 · End card (56–60 s). The photograph folds into the app icon; the name,
// the line, and where to get it. The App Store badge is live; Google Play is
// shown exactly as sawacars.com shows it: coming soon, not a link.

import { SCENES, T } from '../timeline.js'
import { prog, ease, lerp, spring } from '../motion.js'
import { el, set } from '../ui/dom.js'
import { Headline } from '../ui/kinetic.js'
import { Photo } from '../ui/photo.js'
import { ico } from '../ui/dom.js'

export default function end(ctx) {
  const group = ctx.group()
  const { hero } = ctx

  const startFrame = { x: 0, y: 330, w: 1080, h: 900 }
  const mark = { x: 440, y: 360, w: 200, h: 200 }
  const photo = new Photo(group.back, hero.photos[0], startFrame)

  const glow = el('<div class="glow" style="left:90px;top:10px;width:900px;height:900px;background:radial-gradient(closest-side, rgba(222,7,20,.45), rgba(222,7,20,0))"></div>')
  group.back.prepend(glow)
  const icon = el('<div class="end-mark"><img src="/assets/icon.png"></div>')
  const name = el('<div class="end-name">Sawa Cars</div>')
  group.front.append(icon, name)
  const tagline = new Headline(group.front, ['Find it. Chat.', 'Deal *direct.*'], { y: 742, size: 136, align: 'center' })
  const badges = el(`<div class="end-badges">
      <span class="badge live">${ico('logo-apple')}<span><small>Download on the</small><b>App Store</b></span></span>
      <span class="badge muted">${ico('logo-google-playstore')}<span><small>Coming soon to</small><b>Google Play</b></span></span>
    </div>`)
  group.front.appendChild(badges)
  const [live, soon] = badges.children
  const url = el('<div class="end-url">sawacars.com</div>')
  group.front.appendChild(url)

  return {
    name: 'end',
    range: SCENES.end,
    group,
    update(t) {
      // Photo folds into the icon's square.
      const fold = prog(t, T.collapse[0], T.collapse[1], ease.inOut)
      const f = {
        x: lerp(startFrame.x, mark.x, fold),
        y: lerp(startFrame.y, mark.y, fold),
        w: lerp(startFrame.w, mark.w, fold),
        h: lerp(startFrame.h, mark.h, fold),
      }
      Object.assign(photo.el.style, { left: `${f.x}px`, top: `${f.y}px`, width: `${f.w}px`, height: `${f.h}px`, borderRadius: `${lerp(0, 46, fold)}px` })
      photo.cover = Math.min(1, Math.max(f.w / photo.photo.width, f.h / photo.photo.height))
      photo.el.style.clipPath = 'none'
      photo.update({ zoom: 1.08, o: 1 - prog(t, 56.3, 56.6, ease.out) })

      const pop = spring(t, T.mark, { freq: 1.8, damp: 0.55 })
      set(icon, { s: 0.75 + 0.25 * pop, o: prog(t, T.mark, T.mark + 0.25, ease.out), origin: '50% 50%' })
      set(glow, { s: 0.85 + 0.15 * prog(t, T.mark, 60, ease.drift), o: prog(t, T.mark, T.mark + 0.8, ease.out) })

      const nameIn = prog(t, T.wordmark, T.wordmark + 0.55, ease.out)
      set(name, { y: 40 * (1 - nameIn), o: nameIn })
      tagline.update(t, T.tagline, Infinity, { stagger: 0.09, dur: 0.6 })

      const b1 = prog(t, T.badges, T.badges + 0.55, ease.out)
      const b2 = prog(t, T.badges + 0.14, T.badges + 0.69, ease.out)
      set(live, { y: 50 * (1 - b1), o: b1 })
      set(soon, { y: 50 * (1 - b2), o: b2 })
      const u = prog(t, T.badges + 0.45, T.badges + 0.95, ease.out)
      set(url, { o: u })
    },
  }
}
