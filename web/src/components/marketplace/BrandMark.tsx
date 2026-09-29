// A brand's mark — its logo when an operator has uploaded one, its initials
// otherwise. The website twin of src/components/BrandMark.js: same footprint
// either way (so a row never reflows as logos arrive), the same muted tint per
// name (so Toyota is always the same shade), and never Signal Red — a brand is
// an identifier, not a call to action.

const TINTS = ['#EDEBEA', '#E8EDEF', '#EFEBE6', '#E9EEE9', '#EEE9EE', '#EAEDF1']
const INKS = ['#4A4040', '#3C4A50', '#4F463C', '#3E4A3E', '#4A3E4A', '#3B4450']

function tintIndex(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 997
  return hash % TINTS.length
}

function initials(name: string) {
  const words = String(name || '?').trim().split(/[\s-]+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return String(words[0] || '?').slice(0, 2).toUpperCase()
}

export function BrandMark({
  name,
  logoUrl,
  size = 32,
  className = '',
}: {
  name: string
  logoUrl?: string | null
  size?: number
  className?: string
}) {
  const box = { width: size, height: size, borderRadius: Math.round(size * 0.28) }
  if (logoUrl) {
    return (
      <span
        style={box}
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-white ring-1 ring-inset ring-line-soft ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a small operator-uploaded mark, drawn `contain` */}
        <img
          src={logoUrl}
          alt={`${name} logo`}
          style={{ width: size - 6, height: size - 6 }}
          className="object-contain"
          loading="lazy"
        />
      </span>
    )
  }
  const index = tintIndex(name)
  return (
    <span
      role="img"
      aria-label={name}
      style={{ ...box, backgroundColor: TINTS[index], color: INKS[index], fontSize: Math.round(size * 0.36) }}
      className={`inline-flex shrink-0 items-center justify-center font-extrabold tracking-tight ${className}`}
    >
      {initials(name)}
    </span>
  )
}

export default BrandMark
