// 6 · Chat (38–49 s). "Contact verified seller" opens the real contact step:
// in-app message, the direct-deal notice confirmed, Contact Seller. Then
// the chat: a scripted, fictional exchange (never a real conversation),
// typing indicators, and the seller agreeing a viewing.

import { SCENES, T } from '../timeline.js'
import { prog, ease, keys } from '../motion.js'
import { set, show, text, html, ico } from '../ui/dom.js'
import { Headline, Chapter } from '../ui/kinetic.js'
import { HEAD, tap, pressScale, push, typed, caretOn } from './common.js'
import { detailState, ctaCam } from './s5-browse.js'

/** Where the chat scene leaves the camera; the deal scene starts there. */
export const chatEndCam = () => ({ fx: 195, fy: 545, X: 540, Y: 1000, s: 2.55, r: 0 })

// When each scripted message lands.
const ARRIVALS = [T.myMessage1, T.seller1, T.myMessage2, T.seller2]

function chatLayout(ctx) {
  if (ctx.__chat) return ctx.__chat
  const v = ctx.views.chat
  let y = 0
  const rows = v.rows.map((row) => {
    const box = ctx.measure(row)
    const at = y
    y += box.h + 10
    return { y: at, h: box.h }
  })
  const msgs = ctx.measure(v.msgs)
  ctx.__chat = { rows, msgs }
  return ctx.__chat
}

/** Chat screen state for any moment: which messages are in, typing, input. */
export { chatLayout }

export function chatState(ctx, t) {
  const v = ctx.views.chat
  const L = chatLayout(ctx)
  v.rows.forEach((row, i) => {
    const at = ARRIVALS[i]
    const pop = prog(t, at, at + 0.36, ease.back)
    row.style.top = `${L.rows[i].y}px`
    set(row, { o: prog(t, at, at + 0.12, ease.out) })
    set(row.querySelector('.bubble'), { s: 0.6 + 0.4 * pop, y: 14 * (1 - prog(t, at, at + 0.3, ease.out)) })
  })
  // Typing indicator sits where the seller's next message will land.
  const typing = t >= T.typing1[0] && t < T.seller1 ? 1 : t >= T.typing2[0] && t < T.seller2 ? 3 : -1
  show(v.typing, typing > 0)
  if (typing > 0) {
    const start = typing === 1 ? T.typing1[0] : T.typing2[0]
    v.typing.style.top = `${L.rows[typing].y}px`
    set(v.typing, { o: prog(t, start, start + 0.2, ease.out) })
    v.dots.forEach((dot, i) => {
      const phase = (t - start) * 2 * Math.PI * 1.6 - i * 0.9
      set(dot, { y: -4 * Math.max(0, Math.sin(phase)), o: 0.45 + 0.55 * Math.max(0, Math.sin(phase)) })
    })
  }
  // The reply types into the input bar, then clears when it sends.
  const reply = ctx.messages[2].text
  const typedReply = t < T.myMessage2 ? typed(reply, t, T.typeReply[0], T.typeReply[1]) : ''
  text(v.inputVal, typedReply)
  set(v.inputPh, { o: typedReply ? 0 : 1 })
  // Dimmed while the field is empty, as in the app.
  set(v.send, { s: pressScale(t, T.myMessage2 - 0.05), o: typedReply || (t >= T.myMessage2 - 0.05 && t < T.myMessage2 + 0.1) ? 1 : 0.4, origin: '50% 50%' })
}

export default function chat(ctx) {
  const group = ctx.group()
  const { phone, views } = ctx
  const c = views.contact
  const d = views.detail

  chatLayout(ctx) // measure now, with the camera at identity
  const contactBtn = ctx.measure(d.contactBtn)
  const confirm = ctx.measure(c.confirm)
  const send = ctx.measure(c.send)
  const chatSend = ctx.measure(views.chat.send)

  const caret = document.createElement('span')
  caret.className = 'caret'

  const chapter = new Chapter(group.front, '05', 'Chat')
  const head1 = new Headline(group.front, ['Message', '*the seller.*'], { y: HEAD.y + 54, size: HEAD.size - 8 })
  const head2 = new Headline(group.front, ['Ask', '*anything.*'], { y: HEAD.y + 54, size: HEAD.size - 8 })

  const startCam = ctaCam(ctx)
  const midCam = { fx: 195, fy: 330, X: 540, Y: 1190, s: 1.9, r: 0 }
  const replyCam = { fx: 195, fy: 545, X: 540, Y: 1000, s: 2.45, r: 0 }
  const replyEnd = chatEndCam()

  return {
    name: 'chat',
    range: SCENES.chat,
    group,
    update(t) {
      const cam = keys(t, [
        [38.0, startCam],
        [38.55, { ...startCam, s: startCam.s * 1.03 }, ease.drift],
        [39.15, midCam, ease.inOut],
        [41.35, { ...midCam, s: 1.94 }, ease.drift],
        [41.9, midCam, ease.inOut],
        [44.85, { ...midCam, s: 1.96 }, ease.drift],
        [45.3, replyCam, ease.snap],
        [49.0, replyEnd, ease.drift],
      ])
      phone.camera(cam)
      phone.status('dark')

      // Detail → contact (push) → chat (push).
      const toContact = push(t, T.contactIn[0], T.contactIn[1])
      const toChat = push(t, T.chatIn[0], T.chatIn[1])
      if (t < T.contactIn[1]) {
        detailState(ctx, t)
        d.node.style.clipPath = 'none'
        phone.place('detail', { x: toContact.outX, z: 1, o: 1 })
        phone.status(t < T.contactIn[0] + 0.2 ? 'light' : 'dark')
      }
      if (t >= T.contactIn[0] && t < T.chatIn[1]) {
        phone.place('contact', { x: t < T.chatIn[0] ? toContact.inX : toChat.outX, z: 2 })
      }
      if (t >= T.chatIn[0]) {
        chatState(ctx, t)
        phone.place('chat', { x: toChat.inX, z: 3 })
      }

      // Contact form: message typed, notice confirmed, sent.
      const message = ctx.messages[0].text
      const typedMessage = typed(message, t, T.typeMessage[0], T.typeMessage[1])
      text(c.val, typedMessage)
      set(c.ph, { o: typedMessage ? 0 : 1 })
      const typing = t >= T.typeMessage[0] - 0.2 && t < T.typeMessage[1] + 0.3
      if (caret.parentElement !== c.textarea) c.textarea.appendChild(caret)
      caret.style.opacity = typing && (caretOn(t) || t < T.typeMessage[1]) ? '1' : '0'
      c.textarea.style.borderColor = typing ? 'var(--red)' : ''

      const confirmed = t >= T.tapConfirm + 0.04
      c.confirm.classList.toggle('outline', !confirmed)
      c.confirm.classList.toggle('secondary', confirmed)
      html(c.confirmIcon, ico(confirmed ? 'checkmark-circle' : 'ellipse-outline'))
      text(c.confirmLabel, confirmed ? 'Done' : 'Confirm')
      set(c.confirm, { s: pressScale(t, T.tapConfirm), origin: '50% 50%' })
      set(c.send, { s: pressScale(t, T.tapSend), origin: '50% 50%' })

      tap(ctx, t, T.tapContact, contactBtn)
      tap(ctx, t, T.tapConfirm, confirm)
      tap(ctx, t, T.tapSend, send)
      tap(ctx, t, T.myMessage2 - 0.05, chatSend)

      chapter.update(t, 38.85, 44.8)
      head1.update(t, 38.9, 41.3)
      head2.update(t, 41.75, 44.8)
    },
  }
}
