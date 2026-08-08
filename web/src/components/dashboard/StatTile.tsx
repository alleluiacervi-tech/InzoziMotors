import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'

// A count and what it counts. Every value passed in comes from a list the API
// returned — there are no derived-for-effect numbers on this dashboard.

export function StatTile({
  label,
  value,
  icon,
  href,
  hint,
}: {
  label: string
  value: number
  icon: IconName
  href: string
  hint?: string
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-line-soft bg-surface p-4 shadow-card transition-all duration-300 ease-brand hover:-translate-y-0.5 hover:border-line hover:shadow-card-lg sm:p-5"
    >
      <span className="flex items-center gap-2 text-content-muted">
        <Icon name={icon} size={16} />
        <span className="text-caption font-bold uppercase tracking-wide">{label}</span>
      </span>
      <span className="mt-3 text-stat font-extrabold leading-none tracking-[-0.02em] text-content">
        {value}
      </span>
      {/* Reserved height, so a tile without a hint stays level with its row. */}
      <span className="mt-2 min-h-[2.25rem] text-caption leading-snug text-content-muted">
        {hint}
      </span>
    </Link>
  )
}

export default StatTile
