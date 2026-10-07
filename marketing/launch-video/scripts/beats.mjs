// Beat check: where every cut and cue falls against the 120 BPM grid.
//
//   node scripts/beats.mjs
//
// Scene cuts must sit on a beat. Taps and UI sounds may sit on a sixteenth
// (a natural thumb rhythm); anything off the sixteenth grid is flagged.

import { SCENES, T, CUES, BEAT } from '../src/timeline.js'

const SIXTEENTH = BEAT / 4
const off = (t, grid) => {
  const d = t - Math.round(t / grid) * grid
  return Math.abs(d) < 1e-9 ? 0 : d
}
let problems = 0

console.log('Scene cuts (must be on a beat):')
for (const [name, [start]] of Object.entries(SCENES)) {
  const d = off(start, BEAT)
  if (d) problems += 1
  console.log(`  ${String(start).padStart(5)}s  ${name.padEnd(7)} ${d ? `OFF BEAT by ${(d * 1000).toFixed(0)} ms` : `beat ${start / BEAT + 1}`}`)
}

console.log('\nKey moments (beat or sixteenth):')
for (const [name, value] of Object.entries(T)) {
  for (const t of [value].flat()) {
    const beat = off(t, BEAT)
    const six = off(t, SIXTEENTH)
    const tag = !beat ? 'beat' : !six ? '16th' : `off grid by ${(six * 1000).toFixed(0)} ms`
    // Ranges are motion spans that start a beat after a tap; only single moments must sit on the grid.
    if (beat && six && !Array.isArray(value)) problems += 1
    console.log(`  ${t.toFixed(2).padStart(6)}s  ${name.padEnd(15)} ${tag}`)
  }
}

const loose = CUES.filter((c) => c.type !== 'key' && off(c.t, SIXTEENTH))
console.log(`\nSound cues: ${CUES.length} (${CUES.filter((c) => c.type === 'key').length} key clicks follow the typing)`)
for (const cue of loose) console.log(`  ${cue.t.toFixed(3)}s ${cue.type} off the sixteenth grid`)
console.log(problems + loose.length ? `\n${problems + loose.length} item(s) to look at` : '\nEverything that should land on the grid does.')
