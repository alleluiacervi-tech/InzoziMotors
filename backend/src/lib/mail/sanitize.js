const sanitizeHtml = require('sanitize-html');

// ─────────────────────────────────────────────────────────────────────────────
// Email HTML is the most hostile input this system accepts.
//
// Anyone on the internet can send mail to contact@sawacars.com, and the person
// who opens it is an admin whose session can approve identity documents, publish
// listings and generate contracts. A script that runs in that page has the most
// privileged credential in the product.
//
// Two independent layers, because one is not enough:
//
//   1. HERE — an allowlist sanitiser. Nothing survives that is not on the list.
//   2. AT RENDER — the admin drops the result into a sandboxed iframe with no
//      allow-scripts. See admin/src/app/(admin)/inbox/MessageBody.tsx.
//
// Layer 2 exists because a sanitiser bypass is a known category of bug, and
// because the backend runs helmet with contentSecurityPolicy: false, so there is
// no CSP standing behind this in the API response.
//
// What is stripped and why:
//   <script>          obvious
//   <iframe> <object> <embed>   can load anything, including a scripted origin
//   <form> <input>    a mail can POST to an attacker's server; a login-shaped
//                     form inside a trusted dashboard is a credible phish
//   <base>            rewrites every relative URL on the page at once
//   <link> <meta>     stylesheet and refresh injection
//   on* attributes    inline handlers; sanitize-html drops these by not
//                     allowing them, and they are named again here as intent
//   style attributes  kept but filtered — see allowedStyles; `position: fixed`
//                     and friends let a mail cover the surrounding UI
//   remote images     NOT stripped, but rewritten to a placeholder unless the
//                     admin opts in — see stripRemoteImages
// ─────────────────────────────────────────────────────────────────────────────

// A visible, inert stand-in so a blocked image leaves a gap the admin can see
// and choose to fill, rather than silently vanishing.
const BLOCKED_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const ALLOWED_TAGS = [
  'a', 'b', 'blockquote', 'br', 'caption', 'code', 'div', 'em', 'figure',
  'figcaption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li',
  'ol', 'p', 'pre', 's', 'small', 'span', 'strike', 'strong', 'sub', 'sup',
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
];

/**
 * @param {string} html raw HTML from the message
 * @param {{ loadRemoteImages?: boolean }} opts
 * @returns {{ html: string, blockedImages: number }}
 */
function sanitizeEmailHtml(html, opts = {}) {
  const loadRemoteImages = Boolean(opts.loadRemoteImages);
  let blockedImages = 0;

  const clean = sanitizeHtml(String(html || ''), {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      // target/rel and data-blocked-src are produced by transformTags below, and
      // attribute filtering runs AFTER the transform — so anything the transform
      // adds must be allowed here too, or it is silently stripped again. Two
      // tests exist for exactly that mistake.
      a: ['href', 'name', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'data-blocked-src'],
      td: ['colspan', 'rowspan', 'align', 'valign'],
      th: ['colspan', 'rowspan', 'align', 'valign'],
      table: ['border', 'cellpadding', 'cellspacing', 'align'],
      '*': ['style', 'class', 'dir', 'lang'],
    },
    // http/https/mailto/tel only. This is what stops javascript: and data: URLs
    // in an href — data: because a data:text/html link opens an attacker-authored
    // page that, without this, would carry the dashboard's origin in the referrer.
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      // cid: is how mail references its own inline attachments. Left in so those
      // can be resolved server-side later; the browser cannot fetch cid: itself,
      // so it renders as a broken image rather than a request anywhere.
      img: ['http', 'https', 'data', 'cid'],
    },
    allowProtocolRelative: false,
    // Discard the CONTENTS of these too. Without this, <style>body{...}</style>
    // keeps its CSS as visible text at the top of the message, and a <script>
    // body would be shown as page text.
    nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript', 'title'],
    allowedStyles: {
      '*': {
        color: [/^[-#()0-9a-z.,%\s]+$/i],
        'background-color': [/^[-#()0-9a-z.,%\s]+$/i],
        'text-align': [/^(left|right|center|justify)$/],
        'font-weight': [/^(normal|bold|bolder|lighter|[1-9]00)$/],
        'font-style': [/^(normal|italic|oblique)$/],
        'font-size': [/^\d+(\.\d+)?(px|pt|em|rem|%)$/],
        'text-decoration': [/^[a-z\s-]+$/i],
        padding: [/^[\d.\spxem%]+$/i],
        margin: [/^[\d.\spxem%]+$/i],
        width: [/^\d+(\.\d+)?(px|em|rem|%)$/],
        height: [/^\d+(\.\d+)?(px|em|rem|%)$/],
        'max-width': [/^\d+(\.\d+)?(px|em|rem|%)$/],
        border: [/^[\w\s#(),.%-]+$/],
        'border-collapse': [/^(collapse|separate)$/],
        // Deliberately absent: position, top/left/right/bottom, z-index,
        // transform, opacity, display. Those are what a message would use to
        // lift itself out of its container and draw over the dashboard chrome.
      },
    },
    transformTags: {
      // Every link leaves in a new tab with no referrer and no window.opener
      // handle back into the dashboard.
      a: (tagName, attribs) => ({
        tagName: 'a',
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer nofollow',
        },
      }),
      img: (tagName, attribs) => {
        const src = String(attribs.src || '');
        const isRemote = /^https?:/i.test(src);
        if (isRemote && !loadRemoteImages) {
          // A remote image in mail is a tracking pixel by default: fetching it
          // confirms to the sender that a human opened the message, and leaks
          // the reader's IP. Blocked unless asked for.
          blockedImages += 1;
          return {
            tagName: 'img',
            attribs: {
              src: BLOCKED_IMAGE,
              alt: attribs.alt || 'Blocked image',
              'data-blocked-src': src,
              // No opacity: it is not in allowedStyles on purpose, because a
              // message could use it to hide text from the reader.
              style: 'width:24px;height:24px',
            },
          };
        }
        return { tagName: 'img', attribs };
      },
    },
    // Drop comments: conditional comments are a real HTML-injection vector in
    // mail, and nothing needs them to render.
    allowedIframeHostnames: [],
    parser: { lowerCaseTags: true, lowerCaseAttributeNames: true },
  });

  return { html: clean, blockedImages };
}

/**
 * Plain-text fallback rendered as escaped HTML.
 *
 * Used when a message has no HTML part. Escaped rather than trusted — a
 * text/plain body can still contain angle brackets, and concatenating it into
 * the page unescaped would turn the "safe" branch into the injection.
 */
function textToHtml(text) {
  const escaped = String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${escaped}</pre>`;
}

module.exports = { sanitizeEmailHtml, textToHtml, BLOCKED_IMAGE };
