// 7 · Deal (49–56 s). The drop: the seller's reply lifts out of the phone
// and fills the frame, a check draws, "Viewing agreed." Then the car itself,
// full width, and what happens next, honestly: you meet the seller and deal
// directly. Sawa Cars takes no part in the money.

import { SCENES, T } from '../timeline.js'
import { prog, ease, keys, lerp, spring } from '../motion.js'
import { el, esc, set } from '../ui/dom.js'
import { Headline, Chapter } from '../ui/kinetic.js'
import { Photo } from '../ui/photo.js'
import { chatState, chatLayout, chatEndCam } from './s6-chat.js'

export default function deal(ctx) {
  const group = ctx.group()
  const { phone, views, hero, messages } = ctx

  // Where the last chat bubble sits on the phone screen.
  const L = chatLayout(ctx)
  const lastRow = views.chat.rows[3]
  const bubbleBox = ctx.measure(lastRow.querySelector('.bubble'))
  const rowOffset = L.rows[3].y - ctx.measure(lastRow).y + L.msgs.y
  const small = { x: bubbleBox.x, y: bubbleBox.y + rowOffset, w: bubbleBox.w, h: bubbleBox.h }

  const reply = messages[3]
  const big = el(`<div class="big-bubble" style="display:flex;align-items:flex-end;gap:28px">
      <div style="width:96px;height:96px;border-radius:48px;background:#241F1D;border:3px solid rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:40px;flex-shrink:0">V</div>
      <div style="background:#fff;color:#14110F;border-radius:60px 60px 60px 16px;padding:40px 56px 34px;box-shadow:0 40px 90px rgba(0,0,0,.45)">
        <div style="font-weight:700;font-size:68px;letter-spacing:-0.02em;white-space:nowrap">${esc(reply.text)}</div>
        <div style="margin-top:10px;font-weight:500;font-size:30px;color:#6E6660">${esc(reply.time)}</div>
      </div></div>`)
  group.front.appendChild(big)
  const bigW = big.offsetWidth || 900
  const bigH = big.offsetHeight || 220
  const BUBBLE_ONLY = 96 + 28 // the avatar sits left of the bubble

  const check = el(`<svg class="check" width="180" height="180" viewBox="0 0 180 180" style="left:450px;top:470px">
      <circle cx="90" cy="90" r="80" fill="rgba(22,163,74,.16)"/>
      <circle class="c" cx="90" cy="90" r="80" fill="none" stroke="#16A34A" stroke-width="10" stroke-linecap="round" transform="rotate(-90 90 90)" stroke-dasharray="502.65" stroke-dashoffset="502.65"/>
      <path class="k" d="M55 93 L80 117 L127 66" fill="none" stroke="#4ADE80" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="110" stroke-dashoffset="110"/></svg>`)
  group.front.appendChild(check)
  const checkCircle = check.querySelector('.c')
  const checkMark = check.querySelector('.k')
  const agreed = new Headline(group.front, ['Viewing', '*agreed.*'], { y: 1150, size: 150, align: 'center' })

  const frame = { x: 0, y: 330, w: 1080, h: 900 }
  const photo = new Photo(group.back, hero.photos[0], frame)
  const chapter = new Chapter(group.front, '06', 'Deal')
  const meet = new Headline(group.front, ['Meet', '*the seller.*'], { y: 1310, size: 150 })
  const direct = new Headline(group.front, ['Deal', '*direct.*'], { y: 1310, size: 150 })
  const sub = el('<div class="kt-sub" style="top:1660px">Sawa Cars never holds the money.</div>')
  group.front.appendChild(sub)

  const start = chatEndCam()
  const fallen = { ...start, Y: start.Y + 1900, s: 1.7, r: 7 }

  return {
    name: 'deal',
    range: SCENES.deal,
    group,
    update(t) {
      // The phone drops away beneath the lifted bubble.
      if (t < 50) {
        chatState(ctx, t)
        // The reply has left the phone: only its lifted copy is shown.
        set(lastRow, { o: 0 })
        phone.place('chat')
        phone.status('dark')
        const cam = keys(t, [[49.0, start], [49.85, fallen, ease.in]])
        phone.camera(cam, 1 - prog(t, 49.45, 49.85, ease.in))
      }

      // Bubble: from its spot on the phone to the centre of the frame.
      const lift = spring(t, T.lift[0], { freq: 1.5, damp: 0.7 })
      const camAt49 = start
      const fromX = camAt49.X + (small.x - camAt49.fx) * camAt49.s
      const fromY = camAt49.Y + (small.y - camAt49.fy) * camAt49.s
      const fromScale = (small.w * camAt49.s) / (bigW - BUBBLE_ONLY)
      const toScale = Math.min(1, 940 / bigW)
      const scale = lerp(fromScale, toScale, lift)
      const toX = 540 - (bigW * toScale) / 2
      const toY = 800 - (bigH * toScale) / 2
      // Anchor the bubble (not the avatar) to the phone's bubble at the start.
      const x = lerp(fromX - BUBBLE_ONLY * fromScale, toX, lift)
      const y = lerp(fromY - (bigH * fromScale - small.h * camAt49.s), toY, lift)
      const out = prog(t, 52.2, 52.5, ease.in)
      set(big, { x, y: y - 120 * out, s: scale, o: (t >= T.lift[0] ? 1 : 0) * (1 - out), origin: '0 0' })
      big.firstElementChild.style.opacity = String(prog(t, 49.3, 49.7, ease.out))

      const ring = prog(t, T.check[0], T.check[0] + 0.45, ease.out)
      const tick = prog(t, T.check[0] + 0.3, T.check[1], ease.out)
      checkCircle.setAttribute('stroke-dashoffset', String(502.65 * (1 - ring)))
      checkMark.setAttribute('stroke-dashoffset', String(110 * (1 - tick)))
      set(check, { s: 0.7 + 0.3 * spring(t, T.check[0], { freq: 2, damp: 0.5 }), o: prog(t, T.check[0], T.check[0] + 0.15, ease.out) * (1 - out), origin: '50% 50%' })
      agreed.update(t, T.agreedText, 52.15)

      // The car, full width, revealed bottom-up on the cut.
      const reveal = prog(t, T.dealCut, T.dealCut + 0.5, ease.snap)
      if (t >= T.dealCut) {
        photo.el.style.clipPath = `inset(${100 * (1 - reveal)}% 0 0 0)`
        photo.update({ zoom: 1 + 0.08 * prog(t, T.dealCut, 56, ease.drift), panY: 40 * (1 - reveal) })
      } else {
        photo.hide()
      }
      chapter.update(t, 52.6, 55.75)
      meet.update(t, T.dealLine1, 54.0)
      direct.update(t, T.dealLine2, 55.75)
      set(sub, { o: prog(t, 54.6, 55.0, ease.out) * (1 - prog(t, 55.75, 55.95, ease.in)), y: 20 * (1 - prog(t, 54.6, 55.0, ease.out)) })
    },
  }
}
