// Every screen the film shows, rebuilt from the real code so it can be
// animated: the app's views follow src/screens/*.js and src/components/*.js
// (labels from src/i18n/index.js, English), the website follows web/src, and
// the store page carries only what the live App Store listing says.
// Nothing here invents a rating, a review count, a download figure or a car.

import { el, esc, ico, googleG } from './dom.js'

const LOGO = '/web/public/brand/mark.svg'
const APP_ICON = '/assets/icon.png'

const cardImg = (car, i = 0) => car.photos[i].src

// ── sawacars.com in Safari ─────────────────────────────────────────────
export function webView(hero, others) {
  const cards = [hero, ...others.slice(0, 2)]
    .map(
      (car) => `
      <div class="w-card">
        <div class="ph"><img src="${cardImg(car)}"><div class="w-score"><i>${car.inspection_score}</i>of 150 points</div></div>
        <div class="bd">
          <div class="t">${esc(car.title)}</div>
          <div class="m">${car.year} / ${esc(car.mileage_label)} / ${esc(car.location)}</div>
          <div class="p">${esc(car.price_label)}</div>
        </div>
      </div>`
    )
    .join('')
  const node = el(`
    <div class="web">
      <div class="web-page">
        <div class="w-head">
          <img class="w-mark" src="${LOGO}">
          <div class="w-name">Sawa Cars</div>
          <div class="w-g">${googleG(20)}</div>
          <div class="w-sell">Sell</div>
          <div class="w-menu">${ico('menu')}</div>
        </div>
        <h1 class="w-h1">Know the car before you meet the seller.</h1>
        <p class="w-lead">Every car inspected on 150 points in Kigali, with the full report published.</p>
        <div class="w-search">
          <div class="w-row">
            <div><div class="w-l">Make</div><div class="w-sel">Any make ${ico('chevron-down')}</div></div>
            <div><div class="w-l">Budget</div><div class="w-sel">Any budget ${ico('chevron-down')}</div></div>
          </div>
          <div class="w-btn">${ico('search')} Show cars</div>
        </div>
        <p class="w-note">You and the seller agree the price and pay each other directly. Sawa Cars never holds the money.</p>
        ${cards}
        <div class="w-foot">
          <div class="k">Get the app</div>
          <div style="margin-top:18px"><span class="badge dark store-badge">${ico('logo-apple')}<span><small>Download on the</small><b>App Store</b></span></span></div>
          <div style="margin-top:12px"><span class="badge muted">${ico('logo-google-playstore')}<span><small>Coming soon to</small><b>Google Play</b></span></span></div>
          <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:rgba(255,255,255,.55)">On Android, use sawacars.com. Everything works in the browser.</p>
        </div>
      </div>
      <div class="safari"><div class="urlbar"><span class="aa">aA</span><span class="host">sawacars.com</span>${ico('refresh')}</div></div>
    </div>`)
  return { node, page: node.querySelector('.web-page'), storeBadge: node.querySelector('.store-badge'), foot: node.querySelector('.w-foot'), h1: node.querySelector('.w-h1') }
}

// ── App Store product page ─────────────────────────────────────────────
// Name, price, category and age rating are the live listing's own fields
// (iTunes lookup, id 6803097569). The subtitle line is Sawa's own copy from
// sawacars.com/download. No ratings, reviews or chart positions are shown.
export function appStoreView() {
  const node = el(`
    <div class="as">
      <div class="as-nav">${ico('chevron-back')}Search</div>
      <div class="as-head">
        <div class="as-icon"><img src="${APP_ICON}"></div>
        <div class="as-meta">
          <div class="as-name">Sawa Cars</div>
          <div class="as-sub">Certified used cars in Rwanda</div>
          <div class="as-actions">
            <div class="get"><span class="get-label">Get</span>
              <svg class="ring" viewBox="0 0 30 30"><circle cx="15" cy="15" r="12.5" fill="none" stroke="#E5E5EA" stroke-width="2.6"/><circle class="arc" cx="15" cy="15" r="12.5" fill="none" stroke="#0A84FF" stroke-width="2.6" stroke-linecap="round" transform="rotate(-90 15 15)" stroke-dasharray="78.54" stroke-dashoffset="78.54"/><rect x="11.5" y="11.5" width="7" height="7" rx="1.4" fill="#0A84FF"/></svg>
            </div>
            <span class="as-share">${ico('share-outline')}</span>
          </div>
        </div>
      </div>
      <div class="as-info">
                <div><small>AGE</small><b>4+</b><span>Years Old</span></div>
        <div><small>CATEGORY</small><b>${ico('cart-outline', 'font-size:22px')}</b><span>Shopping</span></div>
      </div>
      <div class="as-desc">
        <p><b>Every car inspected. Every seller verified.</b></p>
        <p>Sawa Cars is Rwanda’s used-car marketplace and rental discovery platform. We connect buyers with inspected vehicles and verified sellers… <span class="more">more</span></p>
      </div>
    </div>`)
  return {
    node,
    get: node.querySelector('.get'),
    label: node.querySelector('.get-label'),
    ring: node.querySelector('.ring'),
    arc: node.querySelector('.arc'),
  }
}

// ── iPhone home screen ─────────────────────────────────────────────────
// Placeholder glass tiles, no other company's icons or names.
export const SB = { x0: 24, dx: 93.3, y0: 72, dy: 96, size: 62, slot: { col: 1, row: 3 } }
export function springboardView() {
  let tiles = ''
  for (let row = 0; row < 6; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      if (row === SB.slot.row && col === SB.slot.col) continue
      if (row === 5 && col > 1) continue
      const x = SB.x0 + col * SB.dx
      const y = SB.y0 + row * SB.dy
      const hue = [8, 28, 200, 340, 160, 260, 18, 220][(row * 4 + col) % 8]
      tiles += `<div class="sb-ico" style="left:${x}px;top:${y}px;background:hsla(${hue},40%,62%,.2)"></div>`
      tiles += `<div class="sb-lbl" style="left:${x + 14}px;top:${y + 70}px;width:${34 + ((row + col) % 3) * 6}px"></div>`
    }
  }
  let dock = ''
  for (let i = 0; i < 4; i += 1) dock += `<div class="sb-ico" style="left:${27 + i * 86}px;top:${844 - 12 - 92 + 15}px;background:hsla(${[200, 140, 30, 0][i]},35%,65%,.24)"></div>`
  const sx = SB.x0 + SB.slot.col * SB.dx
  const sy = SB.y0 + SB.slot.row * SB.dy
  const node = el(`
    <div class="sb">
      <div class="sb-wall" style="background:
        radial-gradient(60% 40% at 20% 18%, rgba(222,7,20,.55), transparent 70%),
        radial-gradient(70% 50% at 85% 70%, rgba(142,4,11,.6), transparent 70%),
        radial-gradient(50% 35% at 40% 95%, rgba(255,120,80,.18), transparent 70%),
        linear-gradient(180deg, #2a0c0d 0%, #120807 60%, #0b0606 100%)"></div>
      ${tiles}
      <div class="sb-search">${ico('search', 'font-size:13px')}Search</div>
      <div class="sb-dock"></div>
      ${dock}
      <div class="sb-app" style="left:${sx}px;top:${sy}px"><img src="${APP_ICON}"></div>
      <div class="sb-name" style="left:${sx - 14}px;top:${sy + 68}px">Sawa Cars</div>
    </div>`)
  return { node, app: node.querySelector('.sb-app'), name: node.querySelector('.sb-name'), slot: { x: sx, y: sy } }
}

// The splash, plus an icon-coloured square the store scene fades off it as
// the app opens out of its icon.
export function splashView() {
  const node = el(`<div class="splash"><img src="/assets/splash.png"><div class="splash-icon" style="position:absolute;left:0;top:227px;width:390px;height:390px"><img src="${APP_ICON}" style="width:100%;height:100%"></div></div>`)
  return { node, icon: node.querySelector('.splash-icon') }
}

// ── Sign in (SignInScreen + SocialAuthButtons) ─────────────────────────
export function signInView() {
  const node = el(`
    <div style="background:#fff">
      <div class="backhdr"><div class="backbtn">${ico('chevron-back')}</div></div>
      <div class="signin-body">
        <div class="logomark"><img src="${APP_ICON}" style="width:100%;height:100%"></div>
        <div class="si-title">Welcome back</div>
        <div class="si-sub">Sign in to continue to Sawa Cars.</div>
        <div class="social"><div class="apple">${ico('logo-apple')}</div><div class="google">${googleG(22)}</div></div>
        <div class="rule"><i></i>or use your email<i></i></div>
        <div class="label" style="margin-top:18px">Email</div>
        <div class="input email"><span class="val"></span><span class="ph">you@email.com</span></div>
        <div class="lrow"><div class="label">Password</div><div class="forgot">Forgot?</div></div>
        <div class="input pwd" style="justify-content:space-between"><span><span class="val" style="letter-spacing:2px"></span><span class="ph">Enter your password</span></span><span style="font-size:20px;color:var(--muted)">${ico('eye-outline')}</span></div>
        <div class="btn signin" style="margin-top:28px"><span class="lbl">Sign in</span><span class="spinner" style="display:none"></span></div>
        <div class="si-foot">Don't have an account? <b>Sign up</b></div>
      </div>
    </div>`)
  return {
    node,
    email: node.querySelector('.email'),
    emailVal: node.querySelector('.email .val'),
    emailPh: node.querySelector('.email .ph'),
    pwd: node.querySelector('.pwd'),
    pwdVal: node.querySelector('.pwd .val'),
    pwdPh: node.querySelector('.pwd .ph'),
    button: node.querySelector('.signin'),
    buttonLabel: node.querySelector('.signin .lbl'),
    spinner: node.querySelector('.signin .spinner'),
    form: node.querySelector('.signin-body'),
  }
}

// ── Home feed (HomeScreen, Buy mode) + CarCard ────────────────────────
function carCard(car) {
  return `
    <div class="card">
      <div class="card-img"><img src="${cardImg(car)}">
        <div class="cert" style="background:var(--red)">${ico('shield-checkmark')}Certified+</div>
        <div class="heart">${ico('heart-outline')}</div>
      </div>
      <div class="card-body">
        <div class="card-title">${esc(car.title)}</div>
        <div class="card-meta">${car.year}</div>
        <div class="card-meta">${esc(car.mileage_label)} · ${esc(car.location)}</div>
        <div class="card-score">${ico('shield-checkmark')}${car.inspection_score}/150 inspected</div>
        <div class="card-price">${esc(car.price_label)}</div>
      </div>
    </div>`
}

export const FEED = { cellW: 187, padX: 8 }

export function homeView(cars, filterLabel) {
  const cells = cars.map((car, i) => `<div class="cell" data-i="${i}">${carCard(car)}</div>`).join('')
  const node = el(`
    <div style="background:var(--bg)">
      <div class="feed" style="position:absolute;left:0;right:0;top:116px">
        <div style="background:var(--surface);padding-bottom:10px">
          <div class="toggle"><div class="on">${ico('pricetag-outline')}Buy</div><div>${ico('key-outline')}Rent</div></div>
          <div class="search">${ico('search')}Search make, model, type…</div>
        </div>
        <div class="chips">
          <div class="chip on" data-chip="All">All</div>
          <div class="chip" data-chip="Imported">Imported</div>
          <div class="chip" data-chip="Local">Local</div>
          <div class="chip" data-chip="EV·Hybrid">EV·Hybrid</div>
        </div>
        <div class="sect" style="position:relative;height:28px">
          <h3 class="sect-all" style="position:absolute;left:16px">Fresh this week</h3>
          <h3 class="sect-filter" style="position:absolute;left:16px">${esc(filterLabel)}</h3>
          <span class="sect-more" style="position:absolute;right:16px">More</span>
        </div>
        <div class="grid">${cells}</div>
      </div>
      <div class="home-head">
        <span class="menu">${ico('menu-outline')}</span>
        <div style="flex:1"><div class="loc-l">LOCATION</div><div class="loc-v">Kigali, Rwanda</div></div>
        <div class="circle-ico">${ico('map-outline')}</div>
        <div class="circle-ico">${ico('notifications-outline')}</div>
      </div>
      <div class="tabbar">
        <div class="tab on">${ico('home')}Home</div>
        <div class="tab">${ico('car-outline')}Cars</div>
        <div class="tab">${ico('heart-outline')}Saved</div>
        <div class="tab">${ico('chatbubble-ellipses-outline')}Messages</div>
        <div class="tab">${ico('person-outline')}Account</div>
      </div>
    </div>`)
  return {
    node,
    feed: node.querySelector('.feed'),
    grid: node.querySelector('.grid'),
    cells: [...node.querySelectorAll('.cell')],
    chipAll: node.querySelector('[data-chip="All"]'),
    chipFilter: node.querySelector(`[data-chip="${filterLabel}"]`),
    sectAll: node.querySelector('.sect-all'),
    sectFilter: node.querySelector('.sect-filter'),
    sectMore: node.querySelector('.sect-more'),
  }
}

// ── Vehicle detail ─────────────────────────────────────────────────────
export function detailView(car) {
  const photos = car.photos.map((p, i) => `<img src="${p.src}" style="left:${i * 390}px">`).join('')
  const specs = [
    ['speedometer-outline', car.mileage_label, 'Mileage'],
    ['flash-outline', car.fuel, 'Fuel Type'],
    ['cog-outline', car.transmission, 'Transmission'],
    ['calendar-outline', String(car.year), 'Year'],
  ]
    .map(([icon, value, label]) => `<div class="spec">${ico(icon)}<b>${esc(value)}</b><span>${label}</span></div>`)
    .join('')
  const node = el(`
    <div style="background:var(--bg)">
      <div class="gallery"><div class="strip" style="position:absolute;left:0;top:0;width:${car.photos.length * 390}px;height:320px">${photos}</div>
        <div class="gallery-bar"><div class="cbtn">${ico('chevron-back')}</div><div style="display:flex;gap:10px"><div class="cbtn">${ico('git-compare-outline')}</div><div class="cbtn">${ico('share-outline')}</div><div class="cbtn">${ico('heart-outline')}</div></div></div>
        <div class="tier">${ico('shield-checkmark', 'font-size:11px')}Certified+</div>
        <div class="gallery-count">${ico('grid-outline', 'font-size:12px')}<span class="gc">1 / ${car.photos.length}</span></div>
      </div>
      <div class="detail-body">
        <div class="d-title">${esc(car.title)}</div>
        <div class="d-meta">${ico('location-outline')}<span>${esc(car.location)}</span><span>·</span><b>${esc(car.drive_side || '')}</b></div>
        <div class="d-price">${esc(car.price_label)}</div>
        <div class="specs">${specs}</div>
        <div class="irow"><div class="iicon">${ico('shield-checkmark')}</div><div style="flex:1"><b>150-Point Inspection Report</b><span>Scored ${car.inspection_score}/150 · View full report</span></div><span style="color:var(--muted);font-size:18px">${ico('chevron-forward')}</span></div>
      </div>
      <div class="cta"><div><div class="pl">Asking price</div><div class="pv">${esc(car.price_label)}</div></div><div class="btn contact-btn">${ico('chatbubble-outline')}Contact verified seller</div></div>
    </div>`)
  return {
    node,
    gallery: node.querySelector('.gallery'),
    strip: node.querySelector('.strip'),
    count: node.querySelector('.gc'),
    body: node.querySelector('.detail-body'),
    title: node.querySelector('.d-title'),
    price: node.querySelector('.d-price'),
    specs: [...node.querySelectorAll('.spec')],
    irow: node.querySelector('.irow'),
    cta: node.querySelector('.cta'),
    contactBtn: node.querySelector('.contact-btn'),
  }
}

// ── Contact seller (SellerContactScreen) ──────────────────────────────
// Only the in-app channel is shown: phone and WhatsApp appear only when a
// seller opts in, and the film does not assume this seller did.
export function contactView(car) {
  const node = el(`
    <div style="background:var(--bg)">
      <div class="backhdr"><div class="backbtn">${ico('chevron-back')}</div><div class="t">Contact Seller</div></div>
      <div class="contact-body">
        <div class="summary"><div class="si">${ico('car-sport-outline')}</div><div style="flex:1"><b>${esc(car.title)}</b><span>Verified Seller</span></div></div>
        <div class="c-head">Choose a contact method</div>
        <div class="c-channels"><div class="btn">${ico('chatbubble-outline')}In-App Message</div></div>
        <div class="label" style="margin-top:18px;font-weight:700;color:var(--ink)">Your message</div>
        <div class="textarea"><span class="val"></span><span class="ph" style="color:var(--muted)">Ask about availability or arrange a viewing…</span></div>
        <div class="notice">${ico('information-circle-outline')}<div><b>Direct-deal marketplace notice</b><span>Sawa Cars does not hold funds or charge transaction fees. You negotiate and transact directly with the seller in person.</span></div></div>
        <div class="btn outline confirm"><span class="ci">${ico('ellipse-outline')}</span><span class="cl">Confirm</span></div>
        <div class="btn send-btn" style="margin-top:14px">${ico('arrow-forward-outline')}Contact Seller</div>
      </div>
    </div>`)
  return {
    node,
    val: node.querySelector('.textarea .val'),
    ph: node.querySelector('.textarea .ph'),
    textarea: node.querySelector('.textarea'),
    notice: node.querySelector('.notice'),
    confirm: node.querySelector('.confirm'),
    confirmIcon: node.querySelector('.confirm .ci'),
    confirmLabel: node.querySelector('.confirm .cl'),
    send: node.querySelector('.send-btn'),
  }
}

// ── Chat (ChatScreen) ──────────────────────────────────────────────────
export function chatView(car, messages) {
  const rows = messages
    .map(
      (m, i) => `
      <div class="brow ${m.me ? 'me' : 'them'}" data-i="${i}">
        ${m.me ? '' : '<div class="avatar">V</div>'}
        <div class="bubble ${m.me ? 'me' : 'them'}">${esc(m.text)}<small>${esc(m.time)}</small></div>
      </div>`
    )
    .join('')
  const node = el(`
    <div style="background:var(--bg)">
      <div class="chat-hdr"><div class="backbtn">${ico('chevron-back')}</div><div class="t">Verified Seller</div><div class="hbtn">${ico('car-outline')}</div><div class="hbtn">${ico('ellipsis-horizontal')}</div></div>
      <div class="chat-body">
        <div class="pinned">
          <div class="pl">${ico('pin', 'font-size:12px')}Pinned Vehicle</div>
          <div class="pc"><img src="${cardImg(car)}"><div><b>${esc(car.title)}</b><div class="pp">${esc(car.price_label)}</div><div class="pv">${ico('shield-checkmark', 'font-size:11px;color:var(--green)')}Verified</div></div><div class="viewbtn">View${ico('chevron-forward', 'font-size:12px')}</div></div>
        </div>
        <div class="daysep">Today</div>
        <div class="msgs">${rows}
          <div class="brow them typing"><div class="avatar">V</div><div class="bubble them"><div class="dots"><i></i><i></i><i></i></div></div></div>
        </div>
      </div>
      <div class="inputbar"><div class="field"><span class="val"></span><span class="ph">Type a message…</span></div><div class="send off">${ico('arrow-up')}</div></div>
    </div>`)
  return {
    node,
    msgs: node.querySelector('.msgs'),
    rows: [...node.querySelectorAll('.brow:not(.typing)')],
    typing: node.querySelector('.typing'),
    dots: [...node.querySelectorAll('.typing .dots i')],
    inputVal: node.querySelector('.inputbar .val'),
    inputPh: node.querySelector('.inputbar .ph'),
    send: node.querySelector('.inputbar .send'),
    body: node.querySelector('.chat-body'),
  }
}
