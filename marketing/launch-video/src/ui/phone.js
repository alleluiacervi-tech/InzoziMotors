// The one phone the whole film is shot on. Scenes swap the views on its
// screen and move a virtual camera around it; nothing else positions it.
//
// Camera model: a point (fx, fy) in SCREEN coordinates (390 × 844, the
// iPhone's logical points) is placed at stage point (X, Y), at scale s and
// rotation r. Text inside the phone is real text, so it stays sharp at any
// zoom; photographs are checked by scripts/stills.mjs never to be enlarged
// past their native resolution.

import { el, set, statusIcons } from './dom.js'

// display, not visibility: a child marked visible would show through a hidden parent.
function display(node, on) {
  const value = on ? '' : 'none'
  if (node.__d !== value) {
    node.style.display = value
    node.__d = value
  }
}

export const SCREEN_W = 390
export const SCREEN_H = 844
const BEZEL = 12

export class Phone {
  constructor(parent) {
    this.el = el(`
      <div class="phone">
        <div class="phone-shadow"></div>
        <div class="phone-btn" style="left:-3px;top:170px;height:34px"></div>
        <div class="phone-btn" style="left:-3px;top:228px;height:64px"></div>
        <div class="phone-btn" style="left:-3px;top:306px;height:64px"></div>
        <div class="phone-btn" style="right:-3px;top:250px;height:100px"></div>
        <div class="phone-shell"></div>
        <div class="screen">
          <div class="views"></div>
          <div class="statusbar"><span>9:41</span><span class="sb-icons"></span></div>
          <div class="island"></div>
          <div class="homebar"></div>
        </div>
        <div class="glare"></div>
      </div>`)
    parent.appendChild(this.el)
    this.screen = this.el.querySelector('.screen')
    this.viewsEl = this.el.querySelector('.views')
    this.statusEl = this.el.querySelector('.statusbar')
    this.homebarEl = this.el.querySelector('.homebar')
    this.views = new Map()
    this.cam = { fx: 195, fy: 422, X: 540, Y: 960, s: 1, r: 0 }
    this.statusTheme = null
    this.status('dark')
  }

  addView(name, node) {
    node.classList.add('view')
    this.viewsEl.appendChild(node)
    this.views.set(name, node)
    return node
  }

  view(name) {
    return this.views.get(name)
  }

  /** Hide every view; the owning scene re-places what it needs each frame. */
  reset() {
    for (const node of this.views.values()) display(node, false)
    display(this.el, false)
    this.status('dark')
  }

  /** Show a view with an offset (screen points), scale and opacity. */
  place(name, { x = 0, y = 0, s = 1, o = 1, z = 1, origin } = {}) {
    const node = this.views.get(name)
    display(node, o > 0.001)
    set(node, { x, y, s, o, origin })
    if (node.__z !== z) {
      node.style.zIndex = String(z)
      node.__z = z
    }
    return node
  }

  status(theme) {
    if (this.statusTheme === theme) return
    this.statusTheme = theme
    const light = theme === 'light'
    this.statusEl.classList.toggle('light', light)
    this.homebarEl.classList.toggle('light', light)
    this.statusEl.querySelector('.sb-icons').innerHTML = statusIcons(light ? '#fff' : '#000')
  }

  camera(cam, opacity = 1) {
    this.cam = { fx: 195, fy: 422, X: 540, Y: 960, s: 1, r: 0, ...cam }
    const { fx, fy, X, Y, s, r } = this.cam
    const transform = `translate(${X}px, ${Y}px) rotate(${r}deg) scale(${s}) translate(${-(fx + BEZEL)}px, ${-(fy + BEZEL)}px)`
    if (this.el.__t !== transform) {
      this.el.style.transform = transform
      this.el.__t = transform
    }
    const o = String(opacity)
    if (this.el.__op !== o) {
      this.el.style.opacity = o
      this.el.__op = o
    }
    display(this.el, opacity > 0.001)
  }

  /** Stage coordinates of a screen point under the current camera. */
  toStage(x, y) {
    const { fx, fy, X, Y, s, r } = this.cam
    const a = (r * Math.PI) / 180
    const dx = (x - fx) * s
    const dy = (y - fy) * s
    return { x: X + dx * Math.cos(a) - dy * Math.sin(a), y: Y + dx * Math.sin(a) + dy * Math.cos(a) }
  }

  /**
   * Layout box of a node in screen coordinates, read with the camera at
   * identity. Call once after build (main.js does) and cache the result.
   */
  measure(node) {
    const screen = this.screen.getBoundingClientRect()
    const box = node.getBoundingClientRect()
    return { x: box.left - screen.left, y: box.top - screen.top, w: box.width, h: box.height, cx: box.left - screen.left + box.width / 2, cy: box.top - screen.top + box.height / 2 }
  }
}
