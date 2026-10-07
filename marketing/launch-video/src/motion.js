// Easing and interpolation. Nothing in the film moves linearly: every value
// passes through one of these curves.

export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
export const lerp = (a, b, p) => a + (b - a) * p

/** CSS-style cubic-bezier easing, solved with Newton–Raphson plus bisection. */
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sampleX = (t) => ((ax * t + bx) * t + cx) * t
  const sampleY = (t) => ((ay * t + by) * t + cy) * t
  const slopeX = (t) => (3 * ax * t + 2 * bx) * t + cx
  const solve = (x) => {
    let t = x
    for (let i = 0; i < 8; i += 1) {
      const err = sampleX(t) - x
      if (Math.abs(err) < 1e-6) return t
      const d = slopeX(t)
      if (Math.abs(d) < 1e-6) break
      t -= err / d
    }
    let lo = 0
    let hi = 1
    t = x
    while (lo < hi) {
      const v = sampleX(t)
      if (Math.abs(v - x) < 1e-6) return t
      if (x > v) lo = t
      else hi = t
      t = (lo + hi) / 2
      if (hi - lo < 1e-7) break
    }
    return t
  }
  return (x) => (x <= 0 ? 0 : x >= 1 ? 1 : sampleY(solve(x)))
}

export const ease = {
  /** Fast start, long settle: entrances and camera arrivals. */
  out: bezier(0.16, 1, 0.3, 1),
  /** Gentler settle for large moves. */
  outSoft: bezier(0.25, 0.9, 0.3, 1),
  /** Symmetric, weighty: camera moves between framings. */
  inOut: bezier(0.65, 0, 0.35, 1),
  /** Hard snap for whip moves and punch-ins. */
  snap: bezier(0.85, 0, 0.15, 1),
  /** Accelerating exits. */
  in: bezier(0.55, 0, 0.9, 0.4),
  /** Slight overshoot for UI that pops. */
  back: bezier(0.34, 1.45, 0.64, 1),
  /** Very slow drift: Ken Burns pushes. */
  drift: bezier(0.3, 0.1, 0.4, 1),
}

/** 0→1 progress of t through [t0, t1], shaped by an ease. */
export const prog = (t, t0, t1, e = ease.out) => e(clamp((t - t0) / (t1 - t0)))

/** Interpolate a → b across [t0, t1]. */
export const tw = (t, t0, t1, a, b, e = ease.out) => lerp(a, b, prog(t, t0, t1, e))

/** Damped spring, 0 before t0, settling on 1. freq in Hz, damp 0–1. */
export function spring(t, t0, { freq = 2.4, damp = 0.42 } = {}) {
  if (t <= t0) return 0
  const x = t - t0
  const w = 2 * Math.PI * freq
  const wd = w * Math.sqrt(1 - damp * damp)
  return 1 - Math.exp(-damp * w * x) * (Math.cos(wd * x) + ((damp * w) / wd) * Math.sin(wd * x))
}

/** Is t inside [t0, t1)? */
export const within = (t, t0, t1) => t >= t0 && t < t1

/**
 * Keyframed objects: frames = [[time, {prop: value}, ease], ...]. The ease on a
 * frame shapes the move INTO that frame. Props named `s` (scale) interpolate
 * in log space, so zooms feel even. Holds before the first and after the last.
 */
export function keys(t, frames) {
  if (t <= frames[0][0]) return { ...frames[0][1] }
  const last = frames[frames.length - 1]
  if (t >= last[0]) return { ...last[1] }
  for (let i = 1; i < frames.length; i += 1) {
    const [t1, b, e = ease.inOut] = frames[i]
    const [t0, a] = frames[i - 1]
    if (t < t1) {
      const p = e(clamp((t - t0) / (t1 - t0)))
      const out = {}
      for (const k of Object.keys(b)) {
        const from = a[k] ?? b[k]
        out[k] = k === 's' ? Math.exp(lerp(Math.log(from), Math.log(b[k]), p)) : lerp(from, b[k], p)
      }
      return out
    }
  }
  return { ...last[1] }
}

/** Deterministic pseudo-random in [0,1) from an integer seed. */
export function rand(seed) {
  let x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}
