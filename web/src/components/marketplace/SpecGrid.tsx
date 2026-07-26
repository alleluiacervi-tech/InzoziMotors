import { Icon, type IconName } from '@/components/ui'

export interface Spec {
  label: string
  value: string
  icon?: IconName
  /** Extra line under the value — used where a spec needs context, e.g. what
   *  right-hand drive means for a buyer in Kigali. */
  hint?: string
}

/**
 * The facts panel. A definition list rather than a grid of divs, so a screen
 * reader announces "Gearbox, automatic" as a pair instead of two loose strings.
 * Icons are informational, so they stay neutral — never brand red.
 */
export function SpecGrid({ specs, className = '' }: { specs: Spec[]; className?: string }) {
  const present = specs.filter((spec) => spec.value && spec.value !== '—')
  if (!present.length) return null

  return (
    <dl className={`grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line-soft bg-line-soft sm:grid-cols-3 ${className}`}>
      {present.map((spec) => (
        <div key={spec.label} className="bg-surface p-4">
          <dt className="flex items-center gap-1.5 text-micro font-bold uppercase tracking-wide text-content-muted">
            {spec.icon ? <Icon name={spec.icon} size={13} /> : null}
            {spec.label}
          </dt>
          <dd className="mt-1.5 text-body font-bold text-content">{spec.value}</dd>
          {spec.hint ? (
            <dd className="mt-0.5 text-micro leading-relaxed text-content-muted">{spec.hint}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  )
}

export default SpecGrid
