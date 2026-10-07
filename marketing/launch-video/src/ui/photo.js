// A full-bleed photograph that is never stretched or enlarged: the image is
// laid out at its native pixel size and only ever scaled DOWN (scale ≤ 1),
// cropped by its frame. If a frame would need more pixels than the photo has,
// the photo is shown at native size and the frame letterboxes instead.

import { el, set, show } from './dom.js'

export class Photo {
  /**
   * @param parent  container
   * @param photo   { file, width, height } from data/cars.json
   * @param frame   { x, y, w, h } on the stage
   */
  constructor(parent, photo, frame) {
    this.photo = photo
    this.frame = { ...frame }
    this.el = el(`<div class="photo" style="left:${frame.x}px;top:${frame.y}px;width:${frame.w}px;height:${frame.h}px"><img src="${photo.src}" width="${photo.width}" height="${photo.height}" style="width:${photo.width}px;height:${photo.height}px;margin-left:${-photo.width / 2}px;margin-top:${-photo.height / 2}px"></div>`)
    parent.appendChild(this.el)
    this.img = this.el.querySelector('img')
    // The smallest scale that still covers the frame, capped at native size.
    this.cover = Math.min(1, Math.max(frame.w / photo.width, frame.h / photo.height))
  }

  /**
   * zoom: multiplier on the cover scale (1 = just covers). Clamped so the
   * photo never exceeds 1:1. pan: offset in stage px.
   */
  update({ zoom = 1, panX = 0, panY = 0, o = 1, x = 0, y = 0, s = 1 } = {}) {
    const scale = Math.min(1, this.cover * zoom)
    show(this.el, true)
    set(this.img, { x: panX, y: panY, s: scale })
    set(this.el, { x, y, s, o })
  }

  hide() {
    show(this.el, false)
  }
}
