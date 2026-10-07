// Review stills: renders key moments of every scene to out/stills/, checks
// every visible photograph for upscaling, and tiles a contact sheet.
//
//   node scripts/stills.mjs                 (default moments, per scene)
//   node scripts/stills.mjs 4.5 31 52.9     (specific seconds)

import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { openStage } from './browser.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'out/stills')

const DEFAULT = [
  0.12, 0.7, 1.4, 2.3, 2.85,
  3.4, 4.2, 5.6, 7.2, 8.05, 9.7,
  10.4, 11.9, 13.1, 14.3, 15.5, 16.6,
  17.3, 18.6, 20.1, 21.2, 22.7,
  23.8, 25.5, 27.3, 28.8, 30.9, 32.5, 34.0, 35.0, 35.7, 37.4,
  38.3, 39.7, 40.9, 42.9, 44.4, 46.2, 48.4,
  49.3, 50.6, 52.0, 53.4, 55.2,
  56.4, 57.2, 58.4, 59.9,
]

/** Largest enlargement of any visible photo, from its on-screen box. */
async function upscaleCheck(page) {
  return page.evaluate(() => {
    const issues = []
    for (const img of document.querySelectorAll('#stage img')) {
      if (!img.naturalWidth || /\.svg($|\?)/.test(img.src) || /assets\/(icon|splash)\.png/.test(img.src)) continue
      let node = img
      let visible = true
      while (node && node.id !== 'stage') {
        const cs = getComputedStyle(node)
        if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) visible = false
        node = node.parentElement
      }
      if (!visible) continue
      const box = img.getBoundingClientRect()
      if (box.right < 0 || box.bottom < 0 || box.left > 1080 || box.top > 1920) continue
      const fit = getComputedStyle(img).objectFit
      const sx = box.width / img.naturalWidth
      const sy = box.height / img.naturalHeight
      const scale = fit === 'cover' ? Math.max(sx, sy) : fit === 'contain' ? Math.min(sx, sy) : Math.max(sx, sy)
      if (scale > 1.01) issues.push(`${img.src.split('/').slice(-2).join('/')} at ${scale.toFixed(2)}×`)
    }
    return issues
  })
}

async function main() {
  const times = process.argv.slice(2).map(Number).filter((n) => Number.isFinite(n))
  const moments = times.length ? times : DEFAULT
  await fs.rm(OUT, { recursive: true, force: true })
  await fs.mkdir(OUT, { recursive: true })
  const stage = await openStage()
  const [page] = stage.pages
  const files = []
  let problems = 0
  for (const t of moments) {
    await page.evaluate((s) => window.__seekTime(s), t)
    const file = path.join(OUT, `t${t.toFixed(2).padStart(5, '0')}.png`)
    await page.screenshot({ path: file })
    files.push(file)
    const issues = await upscaleCheck(page)
    if (issues.length) {
      problems += issues.length
      console.log(`t=${t}: UPSCALED ${issues.join(', ')}`)
    }
  }
  await stage.close()

  // Contact sheet(s), 8 per row at 270×480.
  const perSheet = 24
  for (let s = 0; s * perSheet < files.length; s += 1) {
    const chunk = files.slice(s * perSheet, (s + 1) * perSheet)
    const cols = Math.min(8, chunk.length)
    const inputs = chunk.flatMap((f) => ['-i', f])
    const scaled = chunk.map((f, i) => `[${i}:v]scale=270:480,drawtext=text='${path.basename(f, '.png').slice(1)}':x=8:y=8:fontsize=22:fontcolor=yellow:box=1:boxcolor=black@0.6[v${i}]`).join(';')
    const layout = chunk.map((_, i) => `${(i % cols) * 270}_${Math.floor(i / cols) * 480}`).join('|')
    const stack = chunk.length > 1 ? `${chunk.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${chunk.length}:layout=${layout}:fill=black` : '[v0]null'
    execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', `${scaled};${stack}`, '-frames:v', '1', path.join(OUT, `sheet-${s + 1}.jpg`)])
  }
  console.log(`${files.length} stills in ${path.relative(process.cwd(), OUT)}; ${problems ? `${problems} upscaling problem(s)` : 'no photo upscaled'}`)
  if (problems) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
