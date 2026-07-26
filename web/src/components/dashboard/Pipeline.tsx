import { Icon } from '@/components/ui'
import type { Submission } from '@/lib/types'

// The five-stage seller pipeline, identical to the one SellerDashboardScreen
// draws in the app: Review → Scheduled → Inspected → Live → Sold. A seller who
// checks the app and then the site must see the same car at the same stage.

const STAGES = ['Review', 'Scheduled', 'Inspected', 'Live', 'Sold'] as const

/**
 * Which stage a submission has reached.
 *
 * `approved` still sits at Review: it means our team accepted the car but no
 * inspection slot is booked yet. `sold` is not a submission status at all — it
 * comes from the listing the submission became.
 */
export function stageIndex(submission: Submission): number {
  if (submission.listing_status === 'sold') return 4
  switch (submission.status) {
    case 'under_review':
    case 'approved':
      return 0
    case 'scheduled':
    case 'inspecting':
      return 1
    case 'inspected':
      return 2
    case 'live':
      return 3
    default:
      return 0
  }
}

export function Pipeline({ current }: { current: number }) {
  return (
    <ol className="flex items-start gap-1">
      {STAGES.map((stage, index) => {
        const done = index < current
        const active = index === current
        return (
          <li
            key={stage}
            aria-current={active ? 'step' : undefined}
            className="flex min-w-0 flex-1 flex-col items-center"
          >
            <div className="flex w-full items-center">
              {/* Connector left */}
              <span
                aria-hidden="true"
                className={`h-0.5 flex-1 ${index === 0 ? 'bg-transparent' : done || active ? 'bg-ink-900' : 'bg-line'}`}
              />
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  active
                    ? 'border-brand bg-brand text-white'
                    : done
                    ? 'border-ink-900 bg-ink-900 text-white'
                    : 'border-line bg-surface'
                }`}
              >
                {done ? <Icon name="check" size={13} /> : null}
              </span>
              {/* Connector right */}
              <span
                aria-hidden="true"
                className={`h-0.5 flex-1 ${index === STAGES.length - 1 ? 'bg-transparent' : done ? 'bg-ink-900' : 'bg-line'}`}
              />
            </div>
            <span
              className={`mt-2 truncate text-center text-micro leading-tight ${
                active
                  ? 'font-extrabold text-content'
                  : done
                  ? 'font-semibold text-content-secondary'
                  : 'text-content-muted'
              }`}
            >
              {stage}
              {active ? <span className="sr-only"> — current stage</span> : null}
              {done ? <span className="sr-only"> — done</span> : null}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export default Pipeline
