// 3 · Store (10–17 s). Out of the white flash onto the App Store page, tight
// on the header. Get → progress ring → Open. The page swipes away to the
// home screen, the Sawa Cars icon drops into its slot, a tap opens the app.

import { SCENES, T } from '../timeline.js'
import { prog, ease, keys, lerp, spring } from '../motion.js'
import { el, set } from '../ui/dom.js'
import { Headline, Chapter } from '../ui/kinetic.js'
import { MEDIUM, HEAD, tap, pressScale } from './common.js'
import { SB } from '../ui/screens.js'

export default function store(ctx) {
  const group = ctx.group()
  const { phone, views } = ctx
  const as = views.store
  const sb = views.springboard
  const splash = views.splash

  const get = ctx.measure(as.get)
  const icon = ctx.measure(as.node.querySelector('.as-icon'))
  const slot = { x: sb.slot.x, y: sb.slot.y, size: SB.size, cx: sb.slot.x + SB.size / 2, cy: sb.slot.y + SB.size / 2 }

  const splashIcon = splash.icon

  const flash = el('<div class="abs" style="inset:0;background:#fff"></div>')
  group.top.appendChild(flash)
  const chapter = new Chapter(group.front, '02', 'Install')
  const head = new Headline(group.front, ['Free on the', '*App Store.*'], { y: HEAD.y + 54, size: HEAD.size - 8 })
  const head2 = new Headline(group.front, ['On your', '*home screen.*'], { y: HEAD.y + 54, size: HEAD.size - 8 })

  const storeCam = { fx: 195, fy: 200, X: 540, Y: 1180, s: 2.9, r: 0 }
  const getWidth = get.w

  return {
    name: 'store',
    range: SCENES.store,
    group,
    update(t) {
      set(flash, { o: 1 - prog(t, 10, 10.32, ease.out) })

      const cam = keys(t, [
        [10.0, { ...storeCam, s: 3.8, Y: 1080 }],
        [10.7, storeCam, ease.out],
        [13.35, { ...storeCam, s: 3.0 }, ease.drift],
        [13.95, MEDIUM, ease.inOut],
        [16.15, { ...MEDIUM, s: 1.52 }, ease.drift],
        [17.0, { ...MEDIUM, s: 1.56, Y: MEDIUM.Y + 6 }, ease.inOut],
      ])
      phone.camera(cam)

      // ── App Store page ──
      if (t < 14.2) {
        // From 13.4 the page shrinks away like an app card swiped home.
        const away = prog(t, 13.4, 14.0, ease.inOut)
        phone.place('store', { s: 1 - 0.55 * away, y: -260 * away, o: 1 - prog(t, 13.75, 14.05, ease.out), z: 3, origin: '50% 50%' })
        phone.status(away > 0.5 ? 'light' : 'dark')

        const morph = prog(t, T.storeTapGet + 0.06, T.storeTapGet + 0.24, ease.inOut)
        const reopen = prog(t, T.storeOpen - 0.12, T.storeOpen + 0.08, ease.out)
        const ringOn = morph * (1 - reopen)
        const width = lerp(getWidth, 30, ringOn)
        as.get.style.width = `${width}px`
        as.get.style.minWidth = '0px'
        as.get.style.padding = '0'
        as.get.style.background = `rgba(10,132,255,${1 - ringOn})`
        as.label.textContent = t >= T.storeOpen - 0.02 ? 'Open' : 'Get'
        set(as.label, { o: 1 - ringOn })
        set(as.ring, { o: ringOn })
        const fill = prog(t, T.storeRing[0], T.storeRing[1], ease.inOut)
        as.arc.setAttribute('stroke-dashoffset', String(78.54 * (1 - fill)))
        set(as.get, { s: pressScale(t, T.storeTapGet) * (1 + 0.08 * Math.sin(Math.PI * prog(t, T.storeOpen - 0.05, T.storeOpen + 0.3, ease.out))), origin: '50% 50%' })
        tap(ctx, t, T.storeTapGet, get)
      }

      // ── Home screen ──
      if (t >= 13.4) {
        const open = prog(t, T.appOpen[0], T.appOpen[1], ease.out)
        phone.place('springboard', { s: 1 + 0.12 * open, o: 1, z: 1, origin: `${slot.cx}px ${slot.cy}px` })
        if (t < 17) phone.status('light')

        // The icon flies from the store's icon to its slot and settles on a spring.
        const fly = spring(t, 13.55, { freq: 1.6, damp: 0.62 })
        const size = lerp(icon.w, slot.size, fly)
        const x = lerp(icon.x, slot.x, fly)
        const y = lerp(icon.y - 260, slot.y, fly)
        sb.app.style.left = `${x}px`
        sb.app.style.top = `${y}px`
        sb.app.style.width = sb.app.style.height = `${size}px`
        sb.app.style.borderRadius = `${size * 0.24}px`
        set(sb.app, { o: prog(t, 13.5, 13.7, ease.out), s: pressScale(t, T.tapIcon) })
        set(sb.name, { o: prog(t, T.iconLand + 0.15, T.iconLand + 0.5, ease.out) })
        tap(ctx, t, T.tapIcon, slot)

        if (t >= T.appOpen[0]) {
          // Splash expands from the icon (square, rounded) to the full screen.
          const scale = lerp(slot.size / 390, 1, open)
          const inset = 227 * (1 - open)
          const radius = lerp(94, 0, open)
          splash.node.style.clipPath = `inset(${inset}px 0 ${inset}px 0 round ${radius}px)`
          phone.place('splash', {
            x: (slot.cx - 195) * (1 - open),
            y: (slot.cy - 422) * (1 - open),
            s: scale,
            z: 4,
            origin: '50% 50%',
          })
          set(splashIcon, { o: 1 - prog(t, T.appOpen[0] + 0.1, T.appOpen[0] + 0.5, ease.out) })
          if (open > 0.6) phone.status('dark')
        }
      }

      chapter.update(t, 10.25, 16.8)
      head.update(t, 10.3, 13.3)
      head2.update(t, 14.1, 16.7)
    },
  }
}
