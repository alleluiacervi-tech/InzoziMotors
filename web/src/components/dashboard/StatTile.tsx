import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'

// A count and what it counts. Every value passed in comes from a list the API
// returned — there are no derived-for-effect numbers on this dashboard.
//
// WHAT CHANGED, AND WHY.
//
// The tile was a label, a number and a hint stacked flush left, which made a
// row of four read as one paragraph broken into columns: nothing told the eye
// where a tile began, and the number — the only thing anyone opens a dashboard
// to see — was set at the same weight as its own caption.
//
// Three fixes, all of them hierarchy rather than decoration:
//
//   · The icon moves into a tinted square. A 16px glyph floating beside
//     uppercase text has no mass; a filled chip gives each tile an anchor in
//     the top-left corner and makes the four tiles scan as four objects.
//   · The number goes up a step and takes `tnum`, so 8 / 12 / 140 stay in the
//     same column and the row stops shimmering as counts change.
//   · A ZERO IS NOT AN ALARM. "0 saved cars" set in full-strength ink reads as
//     a problem to solve; it is just an empty shortlist. Zero renders muted, a
//     non-zero renders in content ink, and only a tile that is actually waiting
//     on the user (`attention`) gets a brand marker. That marker is the one
//     sanctioned use of red here — an active state, per the house rule.
// ─────────────────────────────────────────────────────────────────────────────

export function StatTile({
  label,
  value,
  icon,
  href,
  hint,
  attention = false,
}: {
  label: string
  value: number
  icon: IconName
  href: string
  hint?: string
  /** True when a non-zero value means something is waiting on the user — an
   *  unread notification, not a saved car. Draws the brand dot. */
  attention?: boolean
}) {
  const empty = value === 0
  const flagged = attention && !empty

  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line-soft bg-surface p-4 shadow-card transition-all duration-300 ease-brand hover:-translate-y-0.5 hover:border-line hover:shadow-card-lg sm:p-5"
    >
      <span className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
            flagged ? 'bg-brand/10 text-brand' : 'bg-surface-alt text-content-muted'
          }`}
        >
          <Icon name={icon} size={16} />
        </span>
        <span className="mt-1.5 min-w-0 text-caption font-bold uppercase tracking-wide text-content-muted">
          {label}
        </span>
        {/* The chevron lives in the corner and only leans on hover — an arrow
            that is already offset has nowhere to go when you point at it. */}
        <span
          aria-hidden="true"
          className="ml-auto mt-1.5 shrink-0 text-content-muted opacity-0 transition-all duration-300 ease-brand group-hover:translate-x-0.5 group-hover:opacity-100 motion-reduce:transition-none"
        >
          <Icon name="arrow-right" size={16} />
        </span>
      </span>

      <span
        className={`tnum mt-4 text-price-lg font-extrabold leading-none tracking-[-0.03em] ${
          empty ? 'text-content-muted' : 'text-content'
        }`}
      >
        {value}
      </span>

      {/* Reserved height, so a tile without a hint stays level with its row. */}
      <span className="mt-2 min-h-[2.25rem] text-caption leading-snug text-content-muted">
        {hint}
      </span>

      {/* A hairline on the bottom edge, brand where something waits. It reads
          as an underline on the tile rather than as a badge shouting a count
          the number already gives. */}
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 bottom-0 h-[3px] transition-colors ${
          flagged ? 'bg-brand' : 'bg-transparent'
        }`}
      />
    </Link>
  )
}

export default StatTile
