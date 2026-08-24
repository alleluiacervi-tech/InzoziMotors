import { Icon } from '@/components/ui'
import { JsonLd } from '@/components/JsonLd'
import { autoDealerNodes, graph } from '@/lib/seo'
import { getDisplayCenters } from '@/lib/centers'

// Public center information for inspection visitors. The authenticated mobile
// booking flow reads the active list from the API so operational changes are
// enforced immediately; this marketing list supplies stable address and hours
// content for visitors and search engines.
//
// The AutoDealer markup lives here rather than on the pages, so the addresses
// and hours a crawler is told are, by construction, the same strings a visitor
// reads a few pixels away. A physical business that never declares itself as
// one cannot appear in local results — "car dealer Kigali" is the search that
// matters most and the site was invisible to it.

export async function CenterList({ className = '' }: { className?: string }) {
  const centers = await getDisplayCenters()

  return (
    <>
    <JsonLd data={graph(...autoDealerNodes(centers))} />
    <ul className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {centers.map((center) => (
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
    </>
  )
}

export default CenterList
