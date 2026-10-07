// The soundtrack and UI sounds, synthesised from scratch: no samples, no
// third-party audio, nothing to license. 120 BPM in A minor (Am–F–C–G, one
// chord per bar), arranged against src/timeline.js so every section change,
// tap and message sound lands on the picture.
//
//   node audio/synth.mjs            → out/audio.wav (48 kHz stereo)
//
// To use a licensed track instead, put it at audio/music.wav (or .mp3):
// render.mjs then uses it in place of the generated music and still mixes
// these UI sounds on top.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DURATION, BEAT, CUES } from '../src/timeline.js'

// SFX_ONLY=1: only the UI sounds (render.mjs mixes them over a supplied track).
const MUSIC = !process.env.SFX_ONLY
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SR = 48000
const N = Math.ceil(DURATION * SR)
const BAR = BEAT * 4
const STEP = BEAT / 4 // sixteenth

// ── helpers ────────────────────────────────────────────────────────────
const mtof = (m) => 440 * 2 ** ((m - 69) / 12)
let seed = 1234567
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 2147483648 - 1
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const smooth = (x) => x * x * (3 - 2 * x)
/** Section envelope: 0 outside, ramps over `fade` seconds at both ends. */
const span = (t, a, b, fade = 0.05) => clamp(Math.min((t - a) / fade, (b - t) / fade), 0, 1)

/** RBJ biquad, coefficients refreshed by the caller when the cutoff moves. */
class Biquad {
  constructor(type, freq, q = 0.707) {
    this.type = type
    this.x1 = this.x2 = this.y1 = this.y2 = 0
    this.set(freq, q)
  }
  set(freq, q = this.q) {
    this.q = q
    const w = (2 * Math.PI * clamp(freq, 20, SR * 0.45)) / SR
    const cos = Math.cos(w)
    const alpha = Math.sin(w) / (2 * q)
    let b0, b1, b2
    if (this.type === 'lp') [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2]
    else if (this.type === 'hp') [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2]
    else [b0, b1, b2] = [alpha, 0, -alpha] // band-pass
    const a0 = 1 + alpha
    this.b0 = b0 / a0
    this.b1 = b1 / a0
    this.b2 = b2 / a0
    this.a1 = (-2 * cos) / a0
    this.a2 = (1 - alpha) / a0
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2
    this.x2 = this.x1
    this.x1 = x
    this.y2 = this.y1
    this.y1 = y
    return y
  }
}

// Buses (mono sources panned into stereo at the end).
const L = new Float32Array(N)
const R = new Float32Array(N)
const send = new Float32Array(N) // reverb send (mono)
const duck = new Float32Array(N).fill(1) // sidechain from the kick

function add(i, v, pan = 0, rev = 0) {
  if (i < 0 || i >= N) return
  L[i] += v * Math.cos(((pan + 1) * Math.PI) / 4)
  R[i] += v * Math.sin(((pan + 1) * Math.PI) / 4)
  send[i] += v * rev
}

// ── arrangement ────────────────────────────────────────────────────────
// Energy per instrument over the film, read from the picture's sections.
const A = {
  drums: (t) => (t < 56 ? 1 : 0) * (t >= 3 && t < 10 ? 0.7 : t >= 38 && t < 47 ? 0.62 : 1),
  clap: (t) => (t < 3 || (t >= 17 && t < 38) || (t >= 49 && t < 56) ? 1 : t >= 10 && t < 17 ? 0.6 : 0),
  hats16: (t) => (t >= 23 && t < 38) || (t >= 49 && t < 56),
  bass: (t) => (t < 56 ? 1 : 0) * (t >= 38 && t < 47 ? 0.7 : 1),
  pad: () => 1,
  padCutoff: (t) =>
    t < 3 ? 4200 : t < 10 ? 900 : t < 17 ? 900 + 2600 * smooth(clamp((t - 10) / 7, 0, 1)) : t < 23 ? 3200 : t < 38 ? 5200 : t < 49 ? 2400 : t < 56 ? 5600 : 2600,
  arp: (t) => (t >= 10 && t < 56 ? (t >= 23 && t < 38) || t >= 49 ? 0.8 : 1 : 0),
  lead: (t) => ((t >= 23.9 && t < 38) || (t >= 49 && t < 56) ? 1 : 0),
}

const CHORDS = [
  [57, 60, 64, 69], // Am
  [53, 57, 60, 65], // F
  [55, 60, 64, 67], // C
  [55, 59, 62, 67], // G
]
const ROOTS = [33, 29, 36, 31]
const LEAD = [
  [76, null, 74, 72, null, 69, 72, null],
  [72, null, 74, 76, null, 77, 76, null],
  [79, null, 76, 74, null, 72, 74, null],
  [74, null, 71, 72, null, 74, 76, null],
]
const chordAt = (t) => Math.floor(t / BAR) % 4

// ── drums ──────────────────────────────────────────────────────────────
function kick(t0, gain) {
  const start = Math.round(t0 * SR)
  let phase = 0
  for (let n = 0; n < SR * 0.45; n += 1) {
    const t = n / SR
    const f = 45 + 110 * Math.exp(-t / 0.035)
    phase += (2 * Math.PI * f) / SR
    const body = Math.sin(phase) * Math.exp(-t / 0.22)
    const click = n < 120 ? noise() * (1 - n / 120) * 0.35 : 0
    add(start + n, (body + click) * gain * 0.95)
  }
  // Sidechain: everything melodic ducks under the kick.
  for (let n = 0; n < SR * 0.3; n += 1) {
    const i = start + n
    if (i >= N) break
    duck[i] = Math.min(duck[i], 1 - 0.62 * Math.exp(-n / SR / 0.09) * gain)
  }
}

function clap(t0, gain) {
  const start = Math.round(t0 * SR)
  const bp = new Biquad('bp', 1400, 0.9)
  for (let n = 0; n < SR * 0.25; n += 1) {
    const t = n / SR
    let env = Math.exp(-t / 0.09)
    for (const off of [0, 0.011, 0.022]) if (t >= off && t < off + 0.008) env = Math.max(env, 1)
    add(start + n, bp.run(noise()) * env * gain * 0.9, 0.05, 0.35)
  }
}

function hat(t0, gain, open = false, pan = 0.25) {
  const start = Math.round(t0 * SR)
  const hp = new Biquad('hp', 8000, 0.8)
  const decay = open ? 0.16 : 0.035
  for (let n = 0; n < SR * decay * 5; n += 1) {
    add(start + n, hp.run(noise()) * Math.exp(-n / SR / decay) * gain * 0.32, pan, 0.08)
  }
}

function snare(t0, gain) {
  const start = Math.round(t0 * SR)
  const bp = new Biquad('bp', 2200, 0.7)
  let phase = 0
  for (let n = 0; n < SR * 0.18; n += 1) {
    const t = n / SR
    phase += (2 * Math.PI * 190) / SR
    add(start + n, (bp.run(noise()) * 0.8 + Math.sin(phase) * 0.35) * Math.exp(-t / 0.06) * gain * 0.6, -0.05, 0.25)
  }
}

for (let t = 0; MUSIC && t < 56; t += STEP) {
  const step = Math.round(t / STEP) % 16
  const d = A.drums(t)
  if (d <= 0) continue
  if (step % 4 === 0) kick(t, d)
  if ((step === 4 || step === 12) && A.clap(t) > 0) clap(t, A.clap(t) * d)
  if (step % 4 === 2) hat(t, d * 0.9, step === 14 && A.hats16(t))
  if (A.hats16(t) && step % 2 === 1) hat(t, d * 0.35, false, -0.3)
}

// Rolls into the big moments: 21–23 (into browse) and 47–49 (into the drop).
for (const [a, b] of MUSIC ? [[21.5, 23], [47, 49]] : []) {
  for (let t = a; t < b - 1e-6; ) {
    const p = (t - a) / (b - a)
    snare(t, 0.25 + 0.75 * p)
    t += p < 0.5 ? STEP : STEP / 2
  }
}

// ── bass ───────────────────────────────────────────────────────────────
if (MUSIC) {
  const lp = new Biquad('lp', 600, 1.1)
  let phase = 0
  let sub = 0
  for (let i = 0; i < N; i += 1) {
    const t = i / SR
    const g = A.bass(t)
    if (g <= 0) continue
    const root = ROOTS[chordAt(t)]
    // Eighth-note pump on the off-beats, root on the downbeat, octave on the last 8th.
    const eighth = Math.floor(t / (BEAT / 2)) % 8
    const note = root + (eighth === 7 ? 12 : 0)
    const tin = t % (BEAT / 2)
    const env = Math.exp(-tin / 0.16) * (eighth % 2 === 0 && eighth !== 0 ? 0.75 : 1)
    const f = mtof(note)
    phase = (phase + f / SR) % 1
    sub += (2 * Math.PI * f) / SR
    if (i % 32 === 0) lp.set(300 + 1400 * Math.exp(-tin / 0.05), 1.1)
    const saw = 2 * phase - 1
    const v = (lp.run(saw) * 0.55 + Math.sin(sub) * 0.75) * env * g * 0.42 * duck[i]
    add(i, v)
  }
}

// ── pad (supersaw chords) ──────────────────────────────────────────────
if (MUSIC) {
  const lpL = new Biquad('lp', 2000, 0.8)
  const lpR = new Biquad('lp', 2000, 0.8)
  const detune = [-0.12, 0, 0.11]
  const phases = CHORDS.map((chord) => chord.map(() => detune.map(() => (noise() + 1) / 2)))
  for (let i = 0; i < N; i += 1) {
    const t = i / SR
    if (i % 64 === 0) {
      const c = A.padCutoff(t)
      lpL.set(c, 0.8)
      lpR.set(c * 1.05, 0.8)
    }
    const ci = chordAt(t)
    const tin = t % BAR
    const env = (1 - Math.exp(-tin / 0.02)) * (0.75 + 0.25 * Math.exp(-tin / 0.4))
    let l = 0
    let r = 0
    CHORDS[ci].forEach((note, v) => {
      detune.forEach((cents, k) => {
        const f = mtof(note + cents)
        const ph = (phases[ci][v][k] = (phases[ci][v][k] + f / SR) % 1)
        const s = 2 * ph - 1
        if (k === 0) l += s
        else if (k === 2) r += s
        else {
          l += s * 0.6
          r += s * 0.6
        }
      })
    })
    const fadeOut = t >= 56 ? Math.max(0, 1 - (t - 56) / 3.8) : 1
    const g = 0.055 * env * A.pad(t) * duck[i] * fadeOut
    L[i] += lpL.run(l) * g
    R[i] += lpR.run(r) * g
    send[i] += (l + r) * g * 0.08
  }
}

// ── arp (plucks, with a dotted-eighth delay) ───────────────────────────
if (MUSIC) {
  const order = [0, 1, 2, 3, 2, 1, 2, 3]
  for (let t = 10; t < 56; t += STEP) {
    const g = A.arp(t)
    if (g <= 0) continue
    const step = Math.round(t / STEP) % 16
    const chord = CHORDS[chordAt(t)]
    const note = chord[order[step % 8]] + 12
    const f = mtof(note)
    const start = Math.round(t * SR)
    const lp = new Biquad('lp', 3200, 1.2)
    let ph = 0
    for (let n = 0; n < SR * 0.22; n += 1) {
      ph = (ph + f / SR) % 1
      const sq = ph < 0.5 ? 1 : -1
      const v = lp.run(sq) * Math.exp(-n / SR / 0.07) * g * 0.07
      const pan = step % 2 ? 0.35 : -0.35
      add(start + n, v * (duck[start + n] ?? 1), pan, 0.25)
      add(start + n + Math.round(BEAT * 0.75 * SR), v * 0.32, -pan, 0.2)
    }
  }
}

// ── lead (the hook, in the browse and deal sections) ───────────────────
if (MUSIC) {
  const lp = new Biquad('lp', 2800, 0.9)
  const EIGHTH = BEAT / 2
  let ph = 0
  for (let i = 0; i < N; i += 1) {
    const t = i / SR
    if (!A.lead(t)) continue
    // The note sounding now: this eighth's, or the one before it held over.
    let k = Math.floor(t / EIGHTH)
    while (k > 0 && LEAD[chordAt(k * EIGHTH)][k % 8] == null) k -= 1
    const note = LEAD[chordAt(k * EIGHTH)][k % 8]
    const age = t - k * EIGHTH
    const vib = 1 + 0.004 * Math.sin(2 * Math.PI * 5.5 * age) * clamp((age - 0.12) / 0.1, 0, 1)
    ph = (ph + (mtof(note) * vib) / SR) % 1
    const tri = 1 - 4 * Math.abs(ph - 0.5)
    const pulse = ph < 0.3 ? 1 : -1
    const env = (1 - Math.exp(-age / 0.008)) * (0.55 + 0.45 * Math.exp(-age / 0.18)) * Math.exp(-age / 0.9)
    const v = lp.run(tri * 0.7 + pulse * 0.3) * env * 0.085
    add(i, v, 0.08, 0.3)
    add(i + Math.round(BEAT * 0.75 * SR), v * 0.28, -0.4, 0.2)
  }
}

// ── UI sounds and transitions ──────────────────────────────────────────
function tone(t0, f0, f1, dur, gain, { pan = 0, rev = 0.1, shape = 'sine', decay = dur / 3 } = {}) {
  const start = Math.round(t0 * SR)
  let ph = 0
  for (let n = 0; n < SR * dur; n += 1) {
    const p = n / (SR * dur)
    const f = f0 * (f1 / f0) ** p
    ph += (2 * Math.PI * f) / SR
    const w = shape === 'sine' ? Math.sin(ph) : Math.sin(ph) + 0.3 * Math.sin(2.76 * ph)
    const env = Math.min(1, n / (SR * 0.002)) * Math.exp(-n / SR / decay)
    add(start + n, w * env * gain, pan, rev)
  }
}

function noiseSweep(t0, dur, f0, f1, gain, { pan0 = -0.6, pan1 = 0.6, q = 1.4, rev = 0.3 } = {}) {
  const start = Math.round(t0 * SR)
  const bp = new Biquad('bp', f0, q)
  for (let n = 0; n < SR * dur; n += 1) {
    const p = n / (SR * dur)
    if (n % 32 === 0) bp.set(f0 * (f1 / f0) ** p, q)
    const env = Math.sin(Math.PI * p) ** 1.5
    add(start + n, bp.run(noise()) * env * gain, pan0 + (pan1 - pan0) * p, rev)
  }
}

const SFX = {
  tap: (t, g) => {
    tone(t, 1900, 1300, 0.04, 0.16 * g, { decay: 0.012, rev: 0.05 })
    noiseSweep(t, 0.012, 4000, 4000, 0.1 * g, { pan0: 0, pan1: 0, rev: 0 })
  },
  key: (t, g) => noiseSweep(t, 0.01, 3200, 3000, 0.12 * g, { pan0: 0.1, pan1: 0.1, q: 2, rev: 0 }),
  swipe: (t, g) => noiseSweep(t - 0.05, 0.3, 900, 4500, 0.22 * g, { pan0: 0.3, pan1: -0.3 }),
  whoosh: (t, g) => noiseSweep(t - 0.1, 0.5, 300, 6000, 0.32 * g),
  thump: (t, g) => tone(t, 110, 48, 0.25, 0.42 * g, { decay: 0.08, rev: 0.05 }),
  chime: (t, g) => {
    tone(t, 1318.5, 1318.5, 1.1, 0.07 * g, { shape: 'bell', decay: 0.35, rev: 0.4, pan: -0.15 })
    tone(t + 0.085, 1975.5, 1975.5, 1.1, 0.06 * g, { shape: 'bell', decay: 0.35, rev: 0.4, pan: 0.15 })
  },
  send: (t, g) => tone(t, 480, 1050, 0.13, 0.12 * g, { decay: 0.06, rev: 0.15, pan: 0.2 }),
  receive: (t, g) => {
    tone(t, 880, 880, 0.09, 0.1 * g, { decay: 0.03, rev: 0.2, pan: -0.2 })
    tone(t + 0.07, 1318.5, 1318.5, 0.14, 0.1 * g, { decay: 0.05, rev: 0.2, pan: -0.2 })
  },
  pop: (t, g) => tone(t, 760, 520, 0.07, 0.14 * g, { decay: 0.025, rev: 0.1 }),
  click: (t, g) => {
    noiseSweep(t, 0.02, 2500, 2500, 0.18 * g, { pan0: 0, pan1: 0, rev: 0.05 })
    tone(t + 0.035, 2200, 1800, 0.02, 0.06 * g, { decay: 0.006 })
  },
  impact: (t, g) => {
    tone(t, 70, 30, 1.6, 0.6 * g, { decay: 0.45, rev: 0.3 })
    noiseSweep(t, 0.6, 2400, 300, 0.4 * g, { pan0: 0, pan1: 0, q: 0.6, rev: 0.6 })
  },
}

for (const cue of CUES) SFX[cue.type](cue.t, cue.gain ?? 1)

// Risers into the bigger moments.
if (MUSIC) noiseSweep(15.9, 1.15, 400, 7000, 0.16, { pan0: -0.2, pan1: 0.2, q: 2 })
if (MUSIC) noiseSweep(21.6, 1.45, 300, 8000, 0.18, { q: 2 })
if (MUSIC) noiseSweep(47, 2.0, 250, 9000, 0.24, { q: 2.2 })
if (MUSIC) {
  // Rising saw under the 47–49 build: two octaves in two seconds.
  let ph = 0
  for (let i = 0; i < SR * 2; i += 1) {
    const t = i / SR
    ph = (ph + (110 * 2 ** t) / SR) % 1
    add(Math.round(47 * SR) + i, (2 * ph - 1) * 0.03 * (t / 2), 0, 0.3)
  }
}

// ── reverb (Schroeder: four combs, two all-passes) ─────────────────────
{
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ buf: new Float32Array(Math.round((d * SR) / 44100)), i: 0 }))
  const aps = [225, 556].map((d) => ({ buf: new Float32Array(Math.round((d * SR) / 44100)), i: 0 }))
  const damp = new Biquad('lp', 5200, 0.7)
  for (let n = 0; n < N; n += 1) {
    const x = damp.run(send[n]) * 0.35
    let y = 0
    for (const c of combs) {
      const out = c.buf[c.i]
      c.buf[c.i] = x + out * 0.82
      c.i = (c.i + 1) % c.buf.length
      y += out
    }
    for (const a of aps) {
      const b = a.buf[a.i]
      const v = -y * 0.5 + b
      a.buf[a.i] = y + b * 0.5
      a.i = (a.i + 1) % a.buf.length
      y = v
    }
    L[n] += y * 0.5
    R[n] += y * 0.5 * (n % 2 ? 1.02 : 0.98)
  }
}

// ── master: gentle saturation, fade the tail, normalise to −1 dBFS ─────
let peak = 0
for (let n = 0; n < N; n += 1) {
  const t = n / SR
  const fade = t > DURATION - 0.6 ? Math.max(0, (DURATION - t) / 0.6) : 1
  L[n] = Math.tanh(L[n] * 1.1) * fade
  R[n] = Math.tanh(R[n] * 1.1) * fade
  peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n]))
}
const norm = 0.89 / (peak || 1)

const out = Buffer.alloc(44 + N * 4)
out.write('RIFF', 0)
out.writeUInt32LE(36 + N * 4, 4)
out.write('WAVEfmt ', 8)
out.writeUInt32LE(16, 16)
out.writeUInt16LE(1, 20)
out.writeUInt16LE(2, 22)
out.writeUInt32LE(SR, 24)
out.writeUInt32LE(SR * 4, 28)
out.writeUInt16LE(4, 32)
out.writeUInt16LE(16, 34)
out.write('data', 36)
out.writeUInt32LE(N * 4, 40)
for (let n = 0; n < N; n += 1) {
  out.writeInt16LE(Math.round(clamp(L[n] * norm, -1, 1) * 32767), 44 + n * 4)
  out.writeInt16LE(Math.round(clamp(R[n] * norm, -1, 1) * 32767), 46 + n * 4)
}
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true })
fs.writeFileSync(path.join(ROOT, 'out/audio.wav'), out)
console.log(`out/audio.wav: ${DURATION}s, peak normalised from ${peak.toFixed(2)}`)
