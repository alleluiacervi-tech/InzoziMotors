// The thumb: a soft disc that arrives just before a tap, presses, rings out
// and lifts away. Positioned on the stage, so it keeps one size at any zoom.

import { el, set, show } from './dom.js'
import { prog, ease } from '../motion.js'

export class Touch {
  constructor(parent) {
    this.el = el('<div class="touch"><div class="touch-ring"></div><div class="touch-dot"></div></div>')
    parent.appendChild(this.el)
    this.dot = this.el.querySelector('.touch-dot')
    this.ring = this.el.querySelector('.touch-ring')
  }

  reset() {
    show(this.el, false)
  }

  /**
   * Draw the tap at `tap` (seconds) on stage point `at`. `from` is where the
   * thumb glides in from, as a stage offset.
   */
  draw(t, tap, at, { lead = 0.32, tail = 0.38, from = { x: 70, y: 120 } } = {}) {
    if (t < tap - lead || t > tap + tail) return false
    const arrive = prog(t, tap - lead, tap - 0.04, ease.out)
    const press = t < tap ? prog(t, tap - 0.08, tap, ease.inOut) : 1 - prog(t, tap, tap + 0.14, ease.out)
    const leave = prog(t, tap + 0.12, tap + tail, ease.in)
    const x = at.x + from.x * (1 - arrive) + from.x * 0.6 * leave
    const y = at.y + from.y * (1 - arrive) + from.y * 0.6 * leave
    show(this.el, true)
    this.el.style.transform = `translate(${x}px, ${y}px)`
    set(this.dot, { s: 1 - 0.2 * press, o: arrive * (1 - leave) })
    const ring = prog(t, tap, tap + 0.36, ease.out)
    set(this.ring, { s: 0.7 + ring * 1.1, o: t >= tap ? (1 - ring) * 0.9 : 0 })
    return true
  }

  /** A flick: the thumb lands at `from`, drags to `to` across [t0, t1], lifts. */
  swipe(t, t0, t1, from, to) {
    if (t < t0 - 0.15 || t > t1 + 0.2) return false
    const land = prog(t, t0 - 0.15, t0, ease.out)
    const drag = prog(t, t0, t1, ease.inOut)
    const lift = prog(t, t1, t1 + 0.2, ease.out)
    show(this.el, true)
    this.el.style.transform = `translate(${from.x + (to.x - from.x) * drag}px, ${from.y + (to.y - from.y) * drag}px)`
    set(this.dot, { s: 0.9 + 0.1 * land - 0.15 * lift, o: land * (1 - lift) })
    set(this.ring, { o: 0 })
    return true
  }
}
