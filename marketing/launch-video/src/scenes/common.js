// Framings and small behaviours every scene uses, so the film keeps one
// visual grammar: a MEDIUM shot shows the whole phone under a headline; a
// TIGHT shot fills the frame with the part of the screen that matters.

import { prog, ease } from '../motion.js'

/** Whole phone, centred low, leaving the top 450 px for a headline. */
export const MEDIUM = { fx: 195, fy: 422, X: 540, Y: 1150, s: 1.5, r: 0 }

/** Fill the frame with screen point (fx, fy) at stage (X, Y). */
export const tight = (fx, fy, s = 2.6, Y = 960, X = 540) => ({ fx, fy, X, Y, s, r: 0 })

/** Headline geometry shared by every medium shot. */
export const HEAD = { y: 168, size: 116 }

/** Tap a measured rect (screen coordinates) under the current camera. */
export function tap(ctx, t, when, rect, opts) {
  const at = ctx.phone.toStage(rect.cx + (opts?.dx || 0), rect.cy + (opts?.dy || 0))
  return ctx.touch.draw(t, when, at, opts)
}

/** Press feedback for a tapped control: dips to 0.96 and springs back. */
export function pressScale(t, when) {
  const down = prog(t, when - 0.06, when + 0.02, ease.inOut)
  const up = prog(t, when + 0.04, when + 0.26, ease.out)
  return 1 - 0.045 * down * (1 - up)
}

/**
 * iOS push: the new screen slides in from the right while the old one drifts
 * a third of the way left. Returns x offsets in screen points.
 */
export function push(t, t0, t1) {
  const p = prog(t, t0, t1, ease.out)
  return { p, inX: 390 * (1 - p), outX: -117 * p }
}

/** Typed text: how many characters are visible at time t. */
export function typed(text, t, t0, t1) {
  if (t < t0) return ''
  const n = Math.min(text.length, Math.ceil(((t - t0) / (t1 - t0)) * text.length))
  return text.slice(0, Math.max(0, n))
}

/** Caret blink, on the beat. */
export const caretOn = (t) => Math.floor(t * 2) % 2 === 0
