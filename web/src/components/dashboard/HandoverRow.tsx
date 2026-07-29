import Image from 'next/image'
import Link from 'next/link'
import { StatusPill } from '@/components/ui'
import { HANDOVER_STATUS_LABEL, formatDate, formatUSD } from '@/lib/business'
import type { Handover } from '@/lib/types'

// Compact request row for the overview. The requests page renders the full
// card with next steps; this is the glance version.

export function HandoverRow({ handover }: { handover: Handover }) {
  const image = handover.car_images?.[0]

  return (
    <Link
      href="/dashboard/requests"
      className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-alt"
    >
      <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-alt">
        {image ? (
          <Image src={image} alt="" fill sizes="64px" className="object-cover" />
        ) : null}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-caption font-bold text-content">
          {handover.car_title ?? 'Your request'}
        </span>
        <span className="block truncate text-micro text-content-muted">
          {handover.booking_id} · {formatUSD(handover.agreed_price ?? handover.price)} ·{' '}
          {formatDate(handover.booked_at)}
        </span>
      </span>

      <StatusPill
        status={handover.status}
        label={HANDOVER_STATUS_LABEL[handover.status] ?? handover.status}
      />
    </Link>
  )
}

export default HandoverRow
