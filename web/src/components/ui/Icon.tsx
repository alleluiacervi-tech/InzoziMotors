import type { ReactElement, SVGProps } from 'react'

// A small hand-rolled icon set rather than a dependency.
//
// The app uses Ionicons; these are the ~30 glyphs the website actually needs,
// drawn on the same 24px grid with the same 1.75 stroke weight so the two
// products feel drawn by the same hand. Shipping ~4KB of inline SVG beats
// pulling a 200KB icon package for thirty shapes.
//
// All icons are decorative by default (aria-hidden). When an icon IS the only
// content of a control, give the control an aria-label.

export type IconName =
  | 'shield' | 'shield-check' | 'check' | 'check-circle' | 'close' | 'close-circle'
  | 'chevron-right' | 'chevron-left' | 'chevron-down' | 'chevron-up' | 'arrow-right'
  | 'search' | 'filter' | 'heart' | 'heart-filled' | 'star' | 'car' | 'key'
  | 'camera' | 'document' | 'refresh' | 'cash' | 'eye-off' | 'eye' | 'clock'
  | 'calendar' | 'location' | 'phone' | 'mail' | 'whatsapp' | 'user' | 'bell'
  | 'menu' | 'grid' | 'chart' | 'gauge' | 'fuel' | 'settings' | 'logout'
  | 'sparkles' | 'trending-down' | 'trending-up' | 'lock' | 'apple' | 'play-store'
  | 'alert' | 'info' | 'plus' | 'minus' | 'external' | 'compass'

// React 19 removed the global JSX namespace — ReactElement is the supported type.
const PATHS: Record<IconName, ReactElement> = {
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </>
  ),
  shield: <path d="M12 3l7 3v6c0 4.4-3 8.1-7 9-4-.9-7-4.6-7-9V6l7-3z" />,
  'shield-check': (
    <>
      <path d="M12 3l7 3v6c0 4.4-3 8.1-7 9-4-.9-7-4.6-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  check: <path d="M5 13l4 4L19 7" />,
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  'close-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  'chevron-right': <path d="M9 5l7 7-7 7" />,
  'chevron-left': <path d="M15 5l-7 7 7 7" />,
  'chevron-down': <path d="M5 9l7 7 7-7" />,
  'chevron-up': <path d="M19 15l-7-7-7 7" />,
  'arrow-right': <path d="M4 12h15m0 0l-6-6m6 6l-6 6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  heart: <path d="M12 20s-7-4.4-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.6-7 9-7 9z" />,
  'heart-filled': (
    <path
      d="M12 20s-7-4.4-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.6-7 9-7 9z"
      fill="currentColor"
      stroke="none"
    />
  ),
  star: <path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 4z" />,
  car: (
    <>
      <path d="M4 16v-3.2a2 2 0 01.4-1.2l2-2.7A3 3 0 018.8 7.7h6.4a3 3 0 012.4 1.2l2 2.7a2 2 0 01.4 1.2V16" />
      <path d="M3 16h18v2a1 1 0 01-1 1h-1.5a1 1 0 01-1-1v-1h-11v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" />
      <path d="M6.5 12.5h11" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="12" r="3.5" />
      <path d="M11.5 12H21l-1.5 2.5M17 12v3" />
    </>
  ),
  camera: (
    <>
      <path d="M3 8.5A1.5 1.5 0 014.5 7h2.2l1.1-1.8A1 1 0 018.7 4.7h6.6a1 1 0 01.9.5L17.3 7h2.2A1.5 1.5 0 0121 8.5v9A1.5 1.5 0 0119.5 19h-15A1.5 1.5 0 013 17.5v-9z" />
      <circle cx="12" cy="13" r="3.2" />
    </>
  ),
  document: (
    <>
      <path d="M6 3.5h7l5 5v12a1 1 0 01-1 1H6a1 1 0 01-1-1v-16a1 1 0 011-1z" />
      <path d="M13 3.5v5h5M8.5 13h7M8.5 16.5h5" />
    </>
  ),
  refresh: <path d="M4 12a8 8 0 0113.7-5.7L20 8m0-4.5V8h-4.5M20 12a8 8 0 01-13.7 5.7L4 16m0 4.5V16h4.5" />,
  cash: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  'eye-off': <path d="M4 4l16 16M10.6 10.7a2 2 0 002.8 2.8M6.5 6.9C4.6 8.2 3.3 10 2.8 12c1.3 3.6 5 6 9.2 6 1.5 0 2.9-.3 4.1-.9m2.5-1.9c1-.9 1.8-2 2.3-3.2-1.3-3.6-5-6-9.2-6-.7 0-1.4.1-2 .2" />,
  eye: (
    <>
      <path d="M2.8 12c1.3-3.6 5-6 9.2-6s7.9 2.4 9.2 6c-1.3 3.6-5 6-9.2 6s-7.9-2.4-9.2-6z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3.5v4M16 3.5v4" />
    </>
  ),
  location: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-10a6.5 6.5 0 0113 0c0 4.4-6.5 10-6.5 10z" />
      <circle cx="12" cy="11" r="2.4" />
    </>
  ),
  phone: <path d="M6.5 3.5h3l1.5 4-2 1.4a12 12 0 005.1 5.1l1.4-2 4 1.5v3a2 2 0 01-2.2 2A16.5 16.5 0 014.5 5.7a2 2 0 012-2.2z" />,
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3.6 7l8.4 6 8.4-6" />
    </>
  ),
  whatsapp: (
    <path
      d="M12.04 2.5a9.4 9.4 0 00-8 14.3L3 21.5l4.8-1.25a9.4 9.4 0 104.24-17.75zm0 1.9a7.5 7.5 0 016.4 11.4l-.35.6.6 2.2-2.26-.6-.58.34a7.5 7.5 0 11-3.8-13.95zm-3.3 3.4c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.44 1.03 2.6c.13.18 1.75 2.8 4.35 3.8 2.16.83 2.6.67 3.07.63.47-.05 1.5-.61 1.72-1.2.21-.6.21-1.1.15-1.2-.07-.11-.24-.17-.5-.3-.25-.12-1.5-.74-1.73-.82-.23-.09-.4-.13-.57.12-.17.25-.65.82-.8.99-.14.17-.29.19-.54.06-.25-.12-1.06-.39-2.02-1.25-.75-.66-1.25-1.48-1.4-1.73-.14-.25-.01-.38.11-.5.11-.11.25-.29.38-.44.12-.15.16-.25.24-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.36-.77-1.86-.2-.48-.4-.42-.56-.42h-.49z"
      fill="currentColor"
      stroke="none"
    />
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20a7 7 0 0114 0" />
    </>
  ),
  bell: <path d="M7 10a5 5 0 1110 0c0 4 1.5 5.5 1.5 5.5h-13S7 14 7 10zM10.3 19a2 2 0 003.4 0" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  gauge: (
    <>
      <path d="M4 17a8 8 0 1116 0" />
      <path d="M12 17l3.5-4.5" />
    </>
  ),
  fuel: (
    <>
      <path d="M5 20V6a2 2 0 012-2h5a2 2 0 012 2v14M4 20h11" />
      <path d="M14 10h2.5a1.5 1.5 0 011.5 1.5V16a1.5 1.5 0 003 0V8l-2-2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1v.2a2 2 0 11-4 0v-.1a1.6 1.6 0 00-2.8-1.1l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.6 1.6 0 004 15a2 2 0 110-4 1.6 1.6 0 001.1-2.8l-.1-.1a2 2 0 112.8-2.8l.1.1A1.6 1.6 0 0010.6 4a2 2 0 114 0 1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1A1.6 1.6 0 0020 11a2 2 0 110 4z" />
    </>
  ),
  logout: <path d="M15 17l5-5-5-5M20 12H9M12 4H6a2 2 0 00-2 2v12a2 2 0 002 2h6" />,
  sparkles: <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3zM18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" />,
  'trending-down': <path d="M3 7l6.5 6.5 4-4L21 17m0 0v-5m0 5h-5" />,
  'trending-up': <path d="M3 17l6.5-6.5 4 4L21 7m0 0v5m0-5h-5" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" />
    </>
  ),
  apple: (
    <path
      d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.15-2.8.85-3.5.85-.7 0-1.85-.83-3.05-.8-1.55.02-3 .9-3.8 2.3-1.65 2.85-.42 7.05 1.17 9.35.8 1.13 1.73 2.4 2.96 2.35 1.2-.05 1.65-.77 3.1-.77 1.44 0 1.85.77 3.1.75 1.28-.02 2.1-1.15 2.87-2.28.9-1.3 1.28-2.57 1.3-2.64-.03-.01-2.5-.96-2.53-3.8zM14.1 5.9c.65-.8 1.1-1.9 1-3-.95.04-2.1.63-2.78 1.42-.6.7-1.13 1.83-1 2.9 1.06.08 2.14-.54 2.78-1.32z"
      fill="currentColor"
      stroke="none"
    />
  ),
  'play-store': (
    <path
      d="M3.6 2.4a1 1 0 00-.6.92v17.36a1 1 0 00.6.92l9.5-9.6-9.5-9.6zm10.9 8.2l2.9-2.93-9.2-5.2a1 1 0 00-.36-.12l6.66 8.25zm0 2.8L7.84 21.65a1 1 0 00.36-.12l9.2-5.2-2.9-2.93zm4.2-4.13l-3.2 3.23 3.2 3.23 2.2-1.25a1.5 1.5 0 000-2.6l-2.2-1.6z"
      fill="currentColor"
      stroke="none"
    />
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5M12 16h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 8h.01" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  external: <path d="M14 4h6v6M20 4l-8 8M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4" />,
}

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
  /** Give this when the icon carries meaning on its own. */
  title?: string
}

export function Icon({ name, size = 20, title, className = '', ...rest }: IconProps) {
  const glyph = PATHS[name]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {glyph}
    </svg>
  )
}

export default Icon
