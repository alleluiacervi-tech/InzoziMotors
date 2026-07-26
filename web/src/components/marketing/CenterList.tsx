import { Icon } from '@/components/ui'
import { CENTERS } from '@/lib/site'

// The three centers, from the same constant the booking flow reads. Every
// inspection, every handover and every return happens at one of these — which is
// why they appear on the About page and the Contact page rather than only in a
// footer.

export function CenterList({ className = '' }: { className?: string }) {
  return (
    <ul className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {CENTERS.map((center) => (
        <li
          key={center.id}
          className="rounded-2xl border border-line-soft bg-surface p-6 shadow-card"
        >
          <h3 className="text-title-sm font-extrabold text-content">{center.name}</h3>
          <p className="mt-1 text-caption font-semibold text-content-muted">{center.area}</p>

          <dl className="mt-5 space-y-2.5 text-caption text-content-secondary">
            <div className="flex gap-2.5">
              <dt className="sr-only">Address</dt>
              <Icon name="location" size={16} className="mt-0.5 shrink-0 text-content-muted" />
              <dd>{center.address}</dd>
            </div>
            <div className="flex gap-2.5">
              <dt className="sr-only">Opening hours</dt>
              <Icon name="clock" size={16} className="mt-0.5 shrink-0 text-content-muted" />
              <dd>{center.hours}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  )
}

export default CenterList
