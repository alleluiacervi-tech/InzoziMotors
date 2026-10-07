// 2 · Web (3–10 s). The red wipe clears off a phone rising into frame on
// sawacars.com. A thumb flicks down the real homepage to the footer's
// "Download on the App Store" badge; the camera punches in, taps it, and
// zooms straight through it into the store.

import { SCENES, T } from '../timeline.js'
import { prog, ease, keys } from '../motion.js'
import { el, set } from '../ui/dom.js'
import { Headline, Chapter } from '../ui/kinetic.js'
import { MEDIUM, HEAD, tap, pressScale } from './common.js'

export default function web(ctx) {
  const group = ctx.group()
  const { phone, views } = ctx
  const v = views.web

  const badge = ctx.measure(v.storeBadge)
  // Scroll so the App Store badge sits in the upper half of the screen.
  const scrollTo = badge.cy - 470
  const badgeY = badge.cy - scrollTo

  const wipe = el('<div class="wipe" style="top:0;height:1920px"></div>')
  group.top.appendChild(wipe)
  const flash = el('<div class="abs" style="inset:0;background:#fff"></div>')
  group.top.appendChild(flash)

  const chapter = new Chapter(group.front, '01', 'Discover')
  const head = new Headline(group.front, ['Spotted on', '*sawacars.com*'], { y: HEAD.y + 54, size: HEAD.size - 8 })

  const tightCam = { fx: badge.cx, fy: badgeY, X: 540, Y: 820, s: 2.7, r: 0 }
  const throughCam = { ...tightCam, s: 22 }

  return {
    name: 'web',
    range: SCENES.web,
    group,
    update(t) {
      // Wipe clears upward, revealing the stage.
      const wp = prog(t, 3, 3.45, ease.snap)
      set(wipe, { y: -1920 * wp, o: wp < 1 ? 1 : 0 })

      const cam = keys(t, [
        [3.0, { ...MEDIUM, Y: MEDIUM.Y + 1500, r: -7, s: 1.38 }],
        [3.8, MEDIUM, ease.out],
        [6.45, { ...MEDIUM, Y: MEDIUM.Y - 14, s: 1.53 }, ease.drift],
        [6.9, tightCam, ease.snap],
        [9.35, { ...tightCam, s: 2.82 }, ease.drift],
        [10.0, throughCam, ease.in],
      ])
      phone.camera(cam)
      phone.status('dark')

      const scroll = scrollTo * prog(t, T.webScroll[0], T.webScroll[1], ease.out)
      set(v.page, { y: -scroll })
      phone.place('web')

      // Thumb flick up the page, then the tap on the badge.
      const from = phone.toStage(250, 640)
      const to = phone.toStage(230, 300)
      ctx.touch.swipe(t, T.webFlick - 0.05, T.webFlick + 0.25, from, to)
      tap(ctx, t, T.webTapStore, { cx: badge.cx, cy: badgeY })
      set(v.storeBadge, { s: pressScale(t, T.webTapStore), origin: '50% 50%' })

      chapter.update(t, 3.2, 6.3)
      head.update(t, T.webHeadline, 6.3)

      set(flash, { o: prog(t, 9.72, 10, ease.in) })
    },
  }
}
