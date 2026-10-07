// One command, the whole film:
//
//   npm run video                 (or: node scripts/render.mjs [--workers 3])
//
// 1. makes sure every photo in data/cars.json is on disk (fetched from the
//    public listing if not), 2. synthesises the soundtrack, 3. renders all
//    3,600 frames in parallel headless Chromium workers straight into H.264
//    segments, 4. joins them and lays the audio under, levelled to −14 LUFS.
//
// Output: out/sawa-cars-launch.mp4 (1080×1920, 60 fps, H.264 + AAC) and
// out/poster.png (the end card). Re-run after `npm run cars` to pick up new
// listings. Needs Node 20+, ffmpeg on PATH, and `npm install` here.

import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { openStage } from './browser.mjs'
import { download } from './select-cars.mjs'
import { FPS, DURATION } from '../src/timeline.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'out')
const FINAL = path.join(OUT, 'sawa-cars-launch.mp4')

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : fallback
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'], ...opts })
    child.on('error', reject)
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))))
  })
}

async function ensurePhotos() {
  const data = JSON.parse(await fs.readFile(path.join(ROOT, 'data/cars.json'), 'utf8'))
  let fetched = 0
  for (const car of data.cars) {
    for (const photo of car.photos) {
      const file = path.join(ROOT, photo.file)
      if (!existsSync(file)) {
        await download(photo.url, file)
        fetched += 1
      }
    }
  }
  console.log(`photos: ${data.cars.length} cars ready${fetched ? ` (${fetched} fetched)` : ''}`)
}

async function soundtrack() {
  const custom = ['audio/music.wav', 'audio/music.mp3'].map((f) => path.join(ROOT, f)).find((f) => existsSync(f))
  if (!custom) {
    await run(process.execPath, [path.join(ROOT, 'audio/synth.mjs')])
    return path.join(OUT, 'audio.wav')
  }
  // A supplied track replaces the generated music; the UI sounds stay on top.
  await run(process.execPath, [path.join(ROOT, 'audio/synth.mjs')], { env: { ...process.env, SFX_ONLY: '1' } })
  const mixed = path.join(OUT, 'audio-mixed.wav')
  await run('ffmpeg', ['-v', 'error', '-y', '-i', custom, '-i', path.join(OUT, 'audio.wav'), '-filter_complex',
    `[0:a]atrim=0:${DURATION},afade=t=out:st=${DURATION - 1}:d=1,aresample=48000[m];[m][1:a]amix=inputs=2:normalize=0[a]`, '-map', '[a]', mixed])
  console.log(`audio: using ${path.relative(ROOT, custom)} with generated UI sounds`)
  return mixed
}

async function renderFrames(workers) {
  const total = Math.round(DURATION * FPS)
  const stage = await openStage({ pages: workers })
  const per = Math.ceil(total / workers)
  const started = Date.now()
  let done = 0
  const segments = await Promise.all(
    stage.pages.map(async (page, w) => {
      const from = w * per
      const to = Math.min(total, from + per)
      const file = path.join(OUT, `segment-${w}.mp4`)
      const ffmpeg = spawn('ffmpeg', [
        '-v', 'error', '-y',
        '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
        '-vf', 'scale=out_color_matrix=bt709:out_range=tv',
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
        '-r', String(FPS), file,
      ], { stdio: ['pipe', 'inherit', 'inherit'] })
      const exited = new Promise((resolve, reject) => ffmpeg.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg segment ${w} exited ${code}`)))))
      const cdp = await page.context().newCDPSession(page)
      for (let f = from; f < to; f += 1) {
        await page.evaluate((n) => window.__seek(n), f)
        const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true })
        if (!ffmpeg.stdin.write(Buffer.from(data, 'base64'))) await new Promise((r) => ffmpeg.stdin.once('drain', r))
        done += 1
        if (done % 300 === 0) {
          const rate = done / ((Date.now() - started) / 1000)
          console.log(`frames: ${done}/${total} (${rate.toFixed(1)}/s, ~${Math.round((total - done) / rate)}s left)`)
        }
      }
      ffmpeg.stdin.end()
      await exited
      return file
    })
  )
  await stage.close()
  return segments
}

async function main() {
  const workers = Number(arg('workers', Math.max(1, Math.min(4, os.cpus().length - 1))))
  await fs.mkdir(OUT, { recursive: true })
  await ensurePhotos()
  const audio = await soundtrack()

  const segments = await renderFrames(workers)
  const list = path.join(OUT, 'segments.txt')
  await fs.writeFile(list, segments.map((s) => `file '${s}'`).join('\n'))
  const silent = path.join(OUT, 'video.mp4')
  await run('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent])

  // Level the mix to −14 LUFS integrated (social platforms' reference).
  const probe = spawn('ffmpeg', ['-nostats', '-i', audio, '-af', 'ebur128', '-f', 'null', '-'])
  let log = ''
  probe.stderr.on('data', (d) => (log += d))
  await new Promise((r) => probe.on('exit', r))
  const measured = Number((log.match(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold/) || [])[1])
  const gain = Number.isFinite(measured) ? -14 - measured : 0

  await run('ffmpeg', ['-v', 'error', '-y', '-i', silent, '-i', audio,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
    '-af', `volume=${gain.toFixed(2)}dB`, '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
    '-shortest', '-movflags', '+faststart', FINAL])
  await run('ffmpeg', ['-v', 'error', '-y', '-sseof', '-0.2', '-i', FINAL, '-frames:v', '1', path.join(OUT, 'poster.png')])
  for (const s of segments) await fs.rm(s, { force: true })
  await fs.rm(list, { force: true })
  await fs.rm(silent, { force: true })
  const { size } = await fs.stat(FINAL)
  console.log(`done: ${path.relative(process.cwd(), FINAL)} (${(size / 1e6).toFixed(1)} MB, audio ${measured.toFixed(1)} → −14 LUFS)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
