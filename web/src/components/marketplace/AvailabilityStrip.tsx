import type { RentalCar } from '@/lib/types'
import { availabilityWindow } from './rental-math'

/**
 * The next two weeks, drawn from the car's real bookings. Availability is a
 * fact the API already returns (`booked_ranges`), so showing it costs nothing
 * and saves a WhatsApp round trip on dates that were never free.
 *
 * Availability is never signalled by colour alone: a taken day is struck
 * through and says so in its accessible name.
 */
export function AvailabilityStrip({
  ranges,
  className = '',
}: {
  ranges: RentalCar['booked_ranges']
  className?: string
}) {
  const days = availabilityWindow(ranges, 14)
  const free = days.filter((day) => day.available).length

  return (
    <div className={className}>
      <ul className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {days.map((day) => {
          const label = day.date.toLocaleDateString('en-US', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            timeZone: 'UTC',
          })
          return (
            <li key={day.key} className="shrink-0">
              <div
                className={`flex h-16 w-14 flex-col items-center justify-center rounded-xl border text-center ${
                  day.available
                    ? 'border-line bg-surface text-content'
                    : 'border-line-soft bg-surface-alt text-content-muted line-through'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  {day.date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}
                </span>
                <span className="text-body font-extrabold">
                  {day.date.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' })}
                </span>
                <span className="sr-only">
                  {label} — {day.available ? 'available' : 'already booked'}
                </span>
              </div>
            </li>
          )
        })}
      </ul>

      <p className="mt-2 text-micro text-content-muted">
        {free} of the next 14 days are free. Dates are confirmed when we reply.
      </p>
    </div>
  )
}

export default AvailabilityStrip
