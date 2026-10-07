// Boots the stage: loads the cars and the icon map, builds every screen once,
// measures them, then hands frames to whichever scene owns that moment.
// Rendering is a pure function of the frame number (window.__seek), so any
// frame can be rendered alone, in any order, by any number of workers.

import { FPS, DURATION } from './timeline.js'
import { setGlyphs, el, show } from './ui/dom.js'
import { Phone } from './ui/phone.js'
import { Touch } from './ui/touch.js'
import * as screens from './ui/screens.js'
import { rand } from './motion.js'
import hook from './scenes/s1-hook.js'
import web from './scenes/s2-web.js'
import store from './scenes/s3-store.js'
import signin from './scenes/s4-signin.js'
import browse from './scenes/s5-browse.js'
import chat from './scenes/s6-chat.js'
import deal from './scenes/s7-deal.js'
import end from './scenes/s8-end.js'

const BASE = '/marketing/launch-video/'
const GLYPHS = '/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json'

const FILTERS = [
  { label: 'EV·Hybrid', test: (car) => ['Electric', 'Hybrid'].includes(car.fuel) },
  { label: 'Local', test: (car) => car.drive_side === 'LHD' },
  { label: 'Imported', test: (car) => car.drive_side === 'RHD' },
]

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}${url === GLYPHS ? ' (run npm install at the repository root)' : ''}`)
  return res.json()
}

/** The chip to tap: one the hero passes and at least one other car fails. */
function pickFilter(cars, hero) {
  for (const filter of FILTERS) {
    const kept = cars.filter(filter.test)
    if (filter.test(hero) && kept.length >= 2 && kept.length < cars.length) return filter
  }
  return { label: FILTERS[0].label, test: () => true }
}

function grainTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const g = canvas.getContext('2d')
  const img = g.createImageData(256, 256)
  for (let i = 0; i < 256 * 256; i += 1) {
    const v = Math.floor(rand(i + 1) * 255)
    img.data.set([v, v, v, 255], i * 4)
  }
  g.putImageData(img, 0, 0)
  return canvas.toDataURL()
}

async function boot() {
  const [data, glyphs] = await Promise.all([getJson(`${BASE}data/cars.json`), getJson(GLYPHS)])
  setGlyphs(glyphs)
  for (const car of data.cars) for (const photo of car.photos) photo.src = BASE + photo.file

  const hero = data.cars.find((car) => car.role === 'hero')
  const others = data.cars.filter((car) => car !== hero)
  const filter = pickFilter([hero, ...others], hero)
  // Feed order: the hero first, then a car the filter will remove, so the
  // reflow is visible, then the rest. Four cards fill two rows.
  const dropped = others.filter((car) => !filter.test(car))
  const kept = others.filter((car) => filter.test(car))
  const feed = [hero, ...dropped.slice(0, 1), ...kept, ...dropped.slice(1)].slice(0, 4)

  const stage = document.getElementById('stage')
  const atmo = el('<div class="layer"></div>')
  const glowA = el('<div class="glow" style="width:1500px;height:1500px;background:radial-gradient(closest-side, rgba(204,5,15,.32), rgba(204,5,15,0))"></div>')
  const glowB = el('<div class="glow" style="width:1300px;height:1300px;background:radial-gradient(closest-side, rgba(255,90,60,.12), rgba(255,90,60,0))"></div>')
  const grain = el(`<div class="grain" style="background-image:url(${grainTexture()})"></div>`)
  atmo.append(glowA, glowB)
  const back = el('<div class="layer"></div>')
  const phoneLayer = el('<div class="layer"></div>')
  const front = el('<div class="layer"></div>')
  const touchLayer = el('<div class="layer"></div>')
  const top = el('<div class="layer"></div>')
  stage.append(atmo, back, phoneLayer, front, touchLayer, top, grain, el('<div class="vignette"></div>'))

  const phone = new Phone(phoneLayer)
  const touch = new Touch(touchLayer)

  const messages = [
    { me: true, text: `Hi! Is the ${hero.model} still available?`, time: '9:41' },
    { me: false, text: 'Yes, it is! Want to see it tomorrow?', time: '9:42' },
    { me: true, text: 'Yes! 10am works for me.', time: '9:42' },
    { me: false, text: 'Perfect. See you at 10.', time: '9:43' },
  ]

  const views = {
    web: screens.webView(hero, others),
    store: screens.appStoreView(),
    springboard: screens.springboardView(),
    splash: screens.splashView(),
    signin: screens.signInView(),
    home: screens.homeView(feed, filter.label),
    detail: screens.detailView(hero),
    contact: screens.contactView(hero),
    chat: screens.chatView(hero, messages),
  }
  for (const [name, view] of Object.entries(views)) phone.addView(name, view.node)

  await Promise.all(['400', '500', '700', '900'].map((w) => document.fonts.load(`${w} 24px Satoshi`)))
  await document.fonts.load('24px Ionicons')
  await document.fonts.ready
  const images = [...stage.querySelectorAll('img')]
  await Promise.all(images.map((img) => img.decode().catch(() => { throw new Error(`Image failed: ${img.src}`) })))

  // Measure with the camera at identity.
  phone.el.style.transform = 'none'
  const ctx = {
    stage,
    phone,
    touch,
    data,
    hero,
    others,
    feed,
    filter,
    messages,
    views,
    measure: (node) => phone.measure(node),
    group() {
      const g = { back: el('<div class="layer"></div>'), front: el('<div class="layer"></div>'), top: el('<div class="layer"></div>') }
      back.appendChild(g.back)
      front.appendChild(g.front)
      top.appendChild(g.top)
      return g
    },
  }

  const scenes = [hook, web, store, signin, browse, chat, deal, end].map((make) => {
    const scene = make(ctx)
    for (const node of Object.values(scene.group)) node.style.display = 'none'
    return scene
  })
  const sceneImages = [...stage.querySelectorAll('img')].filter((img) => !images.includes(img))
  await Promise.all(sceneImages.map((img) => img.decode()))

  let current = null
  function render(t) {
    phone.reset()
    touch.reset()
    // Atmosphere: two slow glows and a moving grain, every frame.
    const a = t * 0.35
    glowA.style.transform = `translate(${-210 + Math.sin(a) * 120}px, ${150 + Math.cos(a * 0.8) * 160}px)`
    glowB.style.transform = `translate(${80 + Math.cos(a * 0.7) * 140}px, ${820 + Math.sin(a * 0.9) * 180}px)`
    const frame = Math.round(t * FPS)
    grain.style.transform = `translate(${Math.floor(rand(frame) * 64)}px, ${Math.floor(rand(frame + 999) * 64)}px)`

    const owner = scenes.find((s) => t >= s.range[0] && t < s.range[1]) || scenes[scenes.length - 1]
    if (owner !== current) {
      // display, not visibility: a child set visible would show through a hidden parent.
      if (current) for (const node of Object.values(current.group)) node.style.display = 'none'
      for (const node of Object.values(owner.group)) node.style.display = ''
      current = owner
    }
    owner.update(t)
  }

  window.__seek = (frame) => render(frame / FPS)
  window.__seekTime = (t) => render(t)
  window.__info = { fps: FPS, frames: Math.round(DURATION * FPS), duration: DURATION, feed: feed.map((c) => c.title), filter: filter.label }
  render(0)
  window.__ready = true
}

boot().catch((err) => {
  window.__error = String(err && err.stack ? err.stack : err)
  console.error(err)
})
