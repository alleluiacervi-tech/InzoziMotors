import Link from 'next/link'
import { Icon } from '@/components/ui'
import { BrandMark } from '@/components/marketplace/BrandMark'
import type { LogoLookup } from '@/lib/brands'
import type { Showroom } from '@/lib/types'
import type { OpenStatusLabels } from '@/lib/showroom-hours'
import { OpenStatusLine } from '@/components/market/OpenStatusLine'

// One verified showroom, as a compact row: its newest car as the thumbnail
// (the showroom's own photo badges it, or fills it when there is no car photo),
// the name, a verified line, the brands it has live right now, and the number
// of cars. Used by the homepage section and the /showrooms index so the two
// cannot drift apart. The marks are read off its live cars (GET /showrooms),
// never chosen, and the card claims nothing about the business beyond that.
export function ShowroomCard({
  room, logoFor, verifiedLabel, carsLabel, statusLabels,
}: {
  room: Showroom
  logoFor: LogoLookup
  verifiedLabel: string
  carsLabel: string
  /** When given, the card says whether the showroom is open right now. */
  statusLabels?: OpenStatusLabels
}) {
  return (
    <Link
      href={`/sellers/${room.id}`}
      className="group relative flex items-center gap-2.5 rounded-xl border border-line-soft bg-surface p-2 shadow-card transition-shadow hover:shadow-card-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
    >
      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#1A1413]">
        {room.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element -- decorative: the showroom's newest car
          <img src={room.cover_image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : null}
        {room.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- the showroom's own photo
          <img
            src={room.avatar_url}
            alt=""
            className={room.cover_image ? 'absolute bottom-0.5 right-0.5 h-5 w-5 rounded-full bg-white object-cover ring-[1.5px] ring-white' : 'h-full w-full bg-white object-cover'}
          />
        ) : (
          <span
            aria-hidden="true"
            className={room.cover_image
              ? 'absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#1A1413] text-[9px] font-extrabold text-white ring-[1.5px] ring-white'
              : 'flex h-full w-full items-center justify-center text-body font-extrabold text-white'}
          >
            {room.name.trim().charAt(0).toUpperCase()}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-caption font-extrabold text-content">{room.name}</span>
        <span className="flex items-center gap-1 text-micro font-semibold text-content-secondary">
          <Icon name="shield-check" size={12} className="shrink-0 text-success-text" />
          <span className="sr-only">{verifiedLabel}</span>
          <span className="truncate">{room.location || verifiedLabel}</span>
        </span>
        {statusLabels && room.hours ? (
          <OpenStatusLine hours={room.hours} labels={statusLabels} className="mt-0.5 text-micro font-medium text-content-secondary" />
        ) : null}
        <span className="mt-1 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1">
            {room.brands.slice(0, 3).map((b) => (
              <BrandMark key={b.make} name={b.make} logoUrl={logoFor(b.make)} size={18} />
            ))}
            {room.brands.length > 3 ? (
              <span className="text-micro font-bold text-content-muted">+{room.brands.length - 3}</span>
            ) : null}
          </span>
          <span className="tnum shrink-0 text-micro font-bold text-content">
            {carsLabel}
          </span>
        </span>
      </span>
    </Link>
  )
}

export default ShowroomCard
