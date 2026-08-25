'use client'

// ─────────────────────────────────────────────────────────────────────────────
// The pipeline board.
//
// Every vehicle in flight, in its stage, waiting-on-us first and oldest first
// within that. The ordering is the product: read the board top to bottom and
// you are working the right thing next, without anyone writing a to-do list.
//
// A live listing is deliberately absent. It is the end of the journey and it is
// counted in the summary — putting forty-seven of them in a column would bury
// the six that need somebody today.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api, type Journey, type JourneyBoard } from '@/lib/api'
import { Card, ErrorState, LoadingState, PageHeader, StatCard } from '@/components/ui'
import { ActorChip, ageLabel } from '@/components/JourneyRail'

const BORDER: Record<string, string> = {
  us: 'border-l-danger-strong',
  seller: 'border-l-warning',
  clock: 'border-l-line',
  none: 'border-l-success',
}

/** Where a vehicle's card belongs: the stage it is currently sitting in, or the
 *  last stage it finished when there is nothing outstanding at all. */
function columnFor(journey: Journey): string {
  if (journey.current_stage) return journey.current_stage
  const done = [...journey.stages].reverse().find((stage) => stage.state === 'done')
  return done ? done.key : journey.stages[0].key
}

function VehicleCard({ journey }: { journey: Journey }) {
  const stage = journey.stages.find((s) => s.key === journey.current_stage)
  const age = ageLabel(journey.age_hours)
  const href = stage?.href
    || (journey.subject.car_id ? `/listings/${journey.subject.car_id}/edit` : null)
    || (journey.subject.inspection_id ? `/inspections/${journey.subject.inspection_id}` : null)
    || (journey.subject.submission_id ? `/submissions?focus=${journey.subject.submission_id}` : '#')

  const blockerCount = stage?.blockers.length ?? 0
  const summary = journey.blocked
    ? (stage?.detail || 'Blocked')
    : blockerCount > 1 ? `${blockerCount} blockers`
    : (stage?.detail || 'Nothing outstanding')

  return (
    <li>
      <Link
        href={href}
        className={`block rounded border border-line border-l-[3px] bg-surface p-2.5 shadow-sm transition-colors hover:border-content-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${BORDER[journey.actor]}`}
      >
        <span className="block text-label font-semibold leading-tight text-content">{journey.vehicle.title}</span>
        <span className="mt-1 block text-caption text-content-muted">
          {summary}
          {age ? <span className={`tabular-nums ${journey.blocked || (journey.actor === 'us' && (journey.age_hours ?? 0) > 48) ? 'font-bold text-danger-strong' : ''}`}>{` · ${age}`}</span> : null}
        </span>
        {journey.seller ? (
          <span className="mt-0.5 block truncate text-caption text-content-muted">{journey.seller.name}</span>
        ) : null}
      </Link>
    </li>
  )
}

export default function PipelinePage() {
  const [board, setBoard] = useState<JourneyBoard | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true); setError(null)
    try { setBoard(await api.journeyBoard()) } catch (e) { setError(e) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description="Every vehicle between a seller and a public listing. Sorted so the work that is ours, and oldest, comes first."
      />

      {loading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={load} /> : board ? (
          <>
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon="alert" label="Waiting on us" value={board.summary.waiting_on_us}
                sub="ours to move, oldest first" tone={board.summary.waiting_on_us > 0 ? 'brand' : 'neutral'} />
              <StatCard icon="clock" label="Waiting on sellers" value={board.summary.waiting_on_seller}
                sub="chased, not blocked" tone="warning" />
              <StatCard icon="close-circle" label="Blocked" value={board.summary.blocked}
                sub="went backwards or failed" tone={board.summary.blocked > 0 ? 'brand' : 'neutral'} />
              <StatCard icon="check-circle" label="Published this week" value={board.summary.published_this_week}
                sub={`${board.summary.live} live in total`} tone="success" />
            </div>

            {board.truncated ? (
              <Card className="mb-4 p-3">
                <p className="text-label text-content-muted">
                  Showing the oldest {board.vehicles.length} vehicles. There are more in flight than this
                  board draws — clear some, or say the word and we will paginate it.
                </p>
              </Card>
            ) : null}

            {board.vehicles.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="font-bold text-content">Nothing in flight</p>
                <p className="mt-1 text-label text-content-muted">
                  Every submitted vehicle has either been published or turned away.
                  {board.summary.live > 0 ? ` ${board.summary.live} listings are live.` : ''}
                </p>
              </Card>
            ) : (
              <div className="overflow-x-auto pb-2">
                <div className="flex min-w-[62rem] gap-3">
                  {board.stages.map((column) => {
                    const cards = board.vehicles.filter((journey) => columnFor(journey) === column.key)
                    const ours = cards.some((journey) => journey.actor === 'us' || journey.blocked)
                    return (
                      <section key={column.key} className="min-w-[9rem] flex-1">
                        <header className={`mb-2.5 flex items-baseline gap-2 border-b-2 pb-1.5 ${ours ? 'border-brand' : 'border-line'}`}>
                          <h2 className="text-caption font-bold uppercase tracking-wide text-content">{column.label}</h2>
                          <span className="ml-auto text-caption font-bold tabular-nums text-content-muted">{cards.length}</span>
                        </header>
                        {cards.length ? (
                          <ul className="grid gap-2">
                            {cards.map((journey) => (
                              <VehicleCard key={journey.subject.submission_id || journey.subject.car_id} journey={journey} />
                            ))}
                          </ul>
                        ) : (
                          <p className="rounded border border-dashed border-line p-2.5 text-center text-caption text-content-muted">
                            {column.key === 'live' ? `${board.summary.live} live` : 'Empty'}
                          </p>
                        )}
                      </section>
                    )
                  })}
                </div>
              </div>
            )}

            <p className="mt-5 flex flex-wrap items-center gap-3 text-caption text-content-muted">
              <ActorChip actor="us" /> ours to move
              <ActorChip actor="seller" /> theirs to move
              <ActorChip actor="clock" /> nothing to do but wait
            </p>
          </>
      ) : null}
    </div>
  )
}
