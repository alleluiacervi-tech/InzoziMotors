'use client'

import { useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Render a message body without giving it the dashboard's origin.
//
// The HTML arriving here has already been through an allowlist sanitiser on the
// server (backend/src/lib/mail/sanitize.js). This is the SECOND layer, and it
// exists because:
//
//   • sanitiser bypasses are a recurring class of bug, not a hypothetical
//   • the API serves this with helmet's CSP disabled, so nothing else stands
//     behind it
//   • the reader is an admin whose session can approve identity documents and
//     generate contracts — the highest-value session in the product
//
// The mechanism: a `srcdoc` iframe with a `sandbox` attribute that does NOT
// include allow-scripts or allow-same-origin. Anything that survived
// sanitisation cannot execute, cannot read this document, and cannot reach the
// httpOnly session cookie. A CSP meta inside the frame is belt-and-braces.
//
// allow-popups IS granted, because links in mail should still open — with
// allow-popups-to-escape-sandbox so the opened tab is a normal page rather than
// inheriting this frame's restrictions.
// ─────────────────────────────────────────────────────────────────────────────

/** Baseline typography so a plain-text mail is not 8px Times, plus a hard
 *  `img { max-width }` so a 2000px signature graphic cannot stretch the frame. */
const FRAME_CSS = `
  :root { color-scheme: light; }
  html, body { margin: 0; padding: 0; }
  body {
    font: 14px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #1B1313;
    background: #FFFFFF;
    padding: 4px 2px 12px;
    word-break: break-word;
    overflow-wrap: anywhere;
  }
  a { color: #CC050F; }
  img { max-width: 100%; height: auto; }
  table { max-width: 100%; border-collapse: collapse; }
  pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
  blockquote {
    margin: 8px 0; padding-left: 12px;
    border-left: 3px solid #E8E3E3; color: #423737;
  }
`

// default-src 'none' is the point: even if markup for an image or a stylesheet
// survived, the frame cannot fetch it. img-src allows data: because the blocked
// image placeholder is a data URI, and https: because opting in to remote images
// has to actually work.
const FRAME_CSP =
  "default-src 'none'; img-src data: https:; style-src 'unsafe-inline'; " +
  "font-src data:; form-action 'none'; base-uri 'none'; frame-ancestors 'self'"

export function MessageBody({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement | null>(null)
  const [height, setHeight] = useState(220)

  const doc = `<!doctype html><html><head><meta charset="utf-8">` +
    `<meta http-equiv="Content-Security-Policy" content="${FRAME_CSP}">` +
    `<style>${FRAME_CSS}</style></head><body>${html}</body></html>`

  // An iframe does not size itself to its content, and a fixed height either
  // clips the message or leaves a large gap. Measured after load and on resize.
  //
  // Reading contentDocument works because srcdoc frames are same-origin for
  // MEASUREMENT purposes while the sandbox still blocks script execution inside.
  // Wrapped in try/catch anyway: if a browser ever treats it as opaque, the
  // fallback is a scrollable frame, not a crash.
  useEffect(() => {
    const frame = ref.current
    if (!frame) return

    const measure = () => {
      try {
        const body = frame.contentDocument?.body
        if (!body) return
        const next = Math.min(Math.max(body.scrollHeight + 16, 120), 4000)
        setHeight(next)
      } catch {
        /* opaque document — keep the default and let it scroll */
      }
    }

    frame.addEventListener('load', measure)
    // Late-loading images change the height after load fires.
    const t = window.setTimeout(measure, 400)
    const t2 = window.setTimeout(measure, 1500)
    window.addEventListener('resize', measure)
    return () => {
      frame.removeEventListener('load', measure)
      window.removeEventListener('resize', measure)
      window.clearTimeout(t)
      window.clearTimeout(t2)
    }
  }, [html])

  return (
    <iframe
      ref={ref}
      title="Message body"
      srcDoc={doc}
      // No allow-scripts and no allow-same-origin. That combination is what makes
      // this a boundary rather than decoration; adding either would defeat it.
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      className="w-full border-0 bg-surface"
      style={{ height }}
    />
  )
}

export default MessageBody
