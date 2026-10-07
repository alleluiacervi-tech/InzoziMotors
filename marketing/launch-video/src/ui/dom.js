// Tiny DOM helpers shared by the screens and scenes.

let glyphs = {}

/** Ionicons glyph map (name → code point), loaded once by main.js. */
export function setGlyphs(map) {
  glyphs = map
}

/** An Ionicons glyph, the icon set the app itself uses (@expo/vector-icons). */
export function ico(name, style = '') {
  const code = glyphs[name]
  if (code == null) throw new Error(`Unknown Ionicons glyph: ${name}`)
  return `<i class="ico" style="${style}">&#${code};</i>`
}

export function el(html) {
  const tpl = document.createElement('template')
  tpl.innerHTML = html.trim()
  return tpl.content.firstElementChild
}

export function esc(text) {
  return String(text ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
}

export const $ = (root, sel) => root.querySelector(sel)
export const $$ = (root, sel) => [...root.querySelectorAll(sel)]

/** Write a transform/opacity in one go; skips work when nothing changed. */
export function set(node, { x = 0, y = 0, s = 1, r = 0, o = 1, sx, sy, origin } = {}) {
  const scale = sx != null || sy != null ? `scale(${sx ?? s}, ${sy ?? s})` : `scale(${s})`
  const transform = `translate(${x}px, ${y}px) rotate(${r}deg) ${scale}`
  if (node.__t !== transform) {
    node.style.transform = transform
    node.__t = transform
  }
  if (origin && node.__o !== origin) {
    node.style.transformOrigin = origin
    node.__o = origin
  }
  // Opacity only: it multiplies down through children, so a faded parent
  // always hides everything inside it (visibility would not).
  const opacity = String(Math.max(0, Math.min(1, o)))
  if (node.__op !== opacity) {
    node.style.opacity = opacity
    node.__op = opacity
  }
}

/** Take a node out of (or back into) the frame entirely. */
export function show(node, visible) {
  const value = visible ? '' : 'none'
  if (node.__d !== value) {
    node.style.display = value
    node.__d = value
  }
}

export function text(node, value) {
  if (node.__txt !== value) {
    node.textContent = value
    node.__txt = value
  }
}

export function html(node, value) {
  if (node.__html !== value) {
    node.innerHTML = value
    node.__html = value
  }
}

/** Google's multicolour G (same paths as web/src/components/auth/SocialButtons.tsx). */
export const googleG = (size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`

/** iOS status-bar glyphs, drawn rather than borrowed. */
export const statusIcons = (color) => `
  <svg width="18" height="12" viewBox="0 0 18 12"><g fill="${color}"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></g></svg>
  <svg width="16" height="12" viewBox="0 0 16 12"><g fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"><path d="M1.5 4.2a9.4 9.4 0 0 1 13 0"/><path d="M4 7a5.7 5.7 0 0 1 8 0"/></g><circle cx="8" cy="10" r="1.6" fill="${color}"/></svg>
  <svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.8" fill="none" stroke="${color}" stroke-opacity="0.4"/><rect x="2" y="2" width="18" height="9" rx="2.4" fill="${color}"/><rect x="24.6" y="4.3" width="1.6" height="4.4" rx="0.8" fill="${color}" fill-opacity="0.45"/></svg>`
