// Kinetic headlines: each word rises out of its own mask, staggered, and
// leaves the same way. Write *word* to set a word in Signal Red.

import { el, esc, set, show } from './dom.js'
import { prog, ease } from '../motion.js'

export class Headline {
  /**
   * @param parent  container
   * @param lines   array of strings, one per line
   * @param opts    { x, y, size, align, color, lineHeight }
   */
  constructor(parent, lines, { x = 84, y = 200, size = 132, align = 'left', color = '#fff', lineHeight = 0.98, width } = {}) {
    const body = lines
      .map((line) => {
        const words = line.split(' ').map((word) => {
          const red = /^\*.*\*[.,!?]?$/.test(word)
          const clean = word.replace(/\*/g, '')
          return `<span class="kt-w"><span class="kt-i${red ? ' red' : ''}">${esc(clean)}</span></span>`
        })
        return `<span class="kt-line">${words.join(' ')}</span>`
      })
      .join('')
    this.el = el(`<div class="kt" style="top:${y}px;font-size:${size}px;text-align:${align};color:${color};line-height:${lineHeight}">${body}</div>`)
    if (align === 'center') {
      this.el.style.left = '0px'
      this.el.style.right = '0px'
    } else {
      this.el.style.left = `${x}px`
      if (width) this.el.style.right = 'auto'
      if (width) this.el.style.width = `${width}px`
    }
    parent.appendChild(this.el)
    this.words = [...this.el.querySelectorAll('.kt-i')]
  }

  /**
   * Words enter from tIn (stagger seconds apart) and exit from tOut.
   * `exit`: 'up' (rise out), 'down', or 'fade'.
   */
  update(t, tIn, tOut = Infinity, { stagger = 0.055, dur = 0.55, exitDur = 0.32, exit = 'up', dx = 0 } = {}) {
    const visible = t >= tIn - 0.01 && t < tOut + exitDur + stagger * this.words.length
    show(this.el, visible)
    if (!visible) return
    this.words.forEach((word, i) => {
      const pIn = prog(t, tIn + i * stagger, tIn + i * stagger + dur, ease.out)
      const pOut = prog(t, tOut + i * stagger * 0.6, tOut + i * stagger * 0.6 + exitDur, ease.in)
      let y = (1 - pIn) * 112
      let o = 1
      if (exit === 'up') y -= pOut * 112
      else if (exit === 'down') y += pOut * 112
      else o = 1 - pOut
      const transform = `translate(${dx * (1 - pIn)}px, ${y}%)`
      if (word.__t !== transform) {
        word.style.transform = transform
        word.__t = transform
      }
      const opacity = String(o)
      if (word.__op !== opacity) {
        word.style.opacity = opacity
        word.__op = opacity
      }
    })
  }
}

/** A small chapter tag: index in red, rule, one word. */
export class Chapter {
  constructor(parent, index, label, { top = 132 } = {}) {
    this.el = el(`<div class="chapter" style="top:${top}px"><b>${esc(index)}</b><i></i><span>${esc(label)}</span></div>`)
    parent.appendChild(this.el)
    this.rule = this.el.querySelector('i')
    this.parts = [...this.el.children]
  }

  update(t, tIn, tOut = Infinity) {
    const visible = t >= tIn && t < tOut + 0.4
    show(this.el, visible)
    if (!visible) return
    const pIn = prog(t, tIn, tIn + 0.5, ease.out)
    const pOut = prog(t, tOut, tOut + 0.3, ease.in)
    set(this.el, { x: -24 * (1 - pIn), o: pIn * (1 - pOut) })
    this.rule.style.transform = `scaleX(${pIn})`
    this.rule.style.transformOrigin = '0 50%'
  }
}
