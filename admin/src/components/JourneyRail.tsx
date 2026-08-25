'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Where is this vehicle, and who is it waiting on?
//
// The seven stages come from the server (GET /admin/journey/…), which derives
// them from the same tables that gate publication — this file renders them and
// decides nothing. In particular it must never compute readiness itself: the
// moment a client-side rule disagrees with the transaction that actually
// refuses, the rail starts saying "ready" beside a button that returns 409.
//
// Two visual rules carry the meaning:
//   • state  → the bar (done, active, blocked, locked)
//   • actor  → the colour of the active bar, because "waiting on us" and
//              "waiting on the seller" are different jobs, not different shades
//              of the same one.
// Neither is colour-only: every stage also states its position in words.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api, type Journey, type JourneyStage, type JourneyActor } from '@/lib/api'

const ACTOR_LABEL: Record<JourneyActor, string> = {
  us: 'Waiting on us',
  seller: 'Waiting on the seller',
  clock: 'Scheduled',
  none: 'Nothing outstanding',
}

/** Tone is a function of (state, actor) — never of state alone. */
function tone(stage: JourneyStage): 'done' | 'us' | 'seller' | 'clock' | 'blocked' | 'idle' {
  if (stage.state === 'done') return 'done'
  if (stage.state === 'blocked') return 'blocked'
  if (stage.state === 'locked') return 'idle'
  return stage.actor === 'seller' ? 'seller' : stage.actor === 'clock' ? 'clock' : 'us'
}

const BAR: Record<string, string> = {
  done: 'bg-success', us: 'bg-brand', seller: 'bg-warning',
  clock: 'bg-line', blocked: 'bg-danger-strong', idle: 'bg-line',
}
// TEXT uses the -text variants deliberately: tailwind.config.ts documents that
// the DEFAULT success and warning hues fail AA on their tints and are for icons
// and graphics only. BAR above is a graphic, so it keeps the DEFAULTs.
const TEXT: Record<string, string> = {
  done: 'text-success-text', us: 'text-brand', seller: 'text-warning-text',
  clock: 'text-content-muted', blocked: 'text-danger-strong', idle: 'text-content-muted',
}

export function ageLabel(hours: number | null | undefined): string | null {
  if (hours == null || !Number.isFinite(hours)) return null
  if (hours < 1) return 'just now'
  if (hours < 24) return `${Math.floor(hours)}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function ActorChip({ actor, ageHours, blocked }: { actor: JourneyActor; ageHours?: number | null; blocked?: boolean }) {
  const age = ageLabel(ageHours)
  const style = blocked ? 'bg-danger-tint text-danger-strong'
    : actor === 'us' ? 'bg-danger-tint text-danger-strong'
    : actor === 'seller' ? 'bg-warning-tint text-warning-text'
    : actor === 'clock' ? 'bg-surface-alt text-content-muted'
    : 'bg-success-tint text-success-text'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-caption font-bold uppercase tracking-wide ${style}`}>
      {blocked ? 'Blocked' : ACTOR_LABEL[actor]}{age ? ` · ${age}` : ''}
    </span>
  )
}

/**
 * @param subjectType whichever id this page already has — all three resolve to
 *        the same journey, so no page needs to look up another's id first.
 */
export function JourneyRail({
  subjectType, id, className = '',
}: { subjectType: 'submission' | 'inspection' | 'car'; id: string; className?: string }) {
  const [journey, setJourney] = useState<Journey | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'none'>('loading')

  useEffect(() => {
    let live = true
    setState('loading')
    api.journey(subjectType, id)
      .then((data) => { if (live) { setJourney(data); setState('ready') } })
      // A walk-in answers 409: it has no publication pipeline, and drawing an
      // empty rail on it would invite someone to wonder why it never completes.
      .catch(() => { if (live) setState('none') })
    return () => { live = false }
  }, [subjectType, id])

  if (state === 'loading') {
    return <div className={`h-24 animate-pulse rounded-xl bg-surface-alt ${className}`} aria-hidden />
  }
  if (state === 'none' || !journey) return null

  const current = journey.stages.find((stage) => stage.key === journey.current_stage)
  const blockers = current?.blockers ?? []

  return (
    <section
      className={`overflow-hidden rounded-xl border border-line bg-surface shadow-sm ${className}`}
      aria-label="Progress to publication"
    >
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line-soft px-4 py-3">
        <h2 className="font-bold text-content">{journey.vehicle.title}</h2>
        {journey.seller ? <span className="text-label text-content-muted">{journey.seller.name}</span> : null}
        <span className="ml-auto flex items-center gap-2">
          <span className="text-caption font-semibold text-content-muted">
            {journey.stages_done} of {journey.stages_total} done
          </span>
          <ActorChip actor={journey.actor} ageHours={journey.age_hours} blocked={journey.blocked} />
        </span>
      </header>

      <ol className="flex gap-0 overflow-x-auto px-4 py-4">
        {journey.stages.map((stage) => {
          const key = tone(stage)
          const age = stage.state === 'active' || stage.state === 'blocked' ? ageLabel(stage.age_hours) : null
          const body = (
            <>
              <span className={`mb-2 mr-1.5 block h-[3px] rounded ${BAR[key]}`} aria-hidden />
              <span className="block text-caption font-bold tracking-widest text-content-muted tabular-nums">
                {String(stage.index).padStart(2, '0')}
              </span>
              <span className={`block text-label font-semibold leading-tight ${stage.state === 'locked' ? 'text-content-muted' : 'text-content'}`}>
                {stage.label}
              </span>
              <span className={`mt-0.5 block text-caption leading-snug ${TEXT[key]}`}>
                {stage.detail}{age ? ` · ${age}` : ''}
              </span>
            </>
          )
          return (
            <li
              key={stage.key}
              className="min-w-[8.5rem] flex-1 pr-2"
              aria-current={stage.key === journey.current_stage ? 'step' : undefined}
            >
              {/* Only reachable stages link anywhere — a locked stage has no
                  record to open yet, and a dead link reads as a broken page. */}
              {stage.href && stage.state !== 'locked' ? (
                <Link href={stage.href} className="block rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  {body}
                  <span className="sr-only">{`${stage.label}: ${stage.state}, ${ACTOR_LABEL[stage.actor]}`}</span>
                </Link>
              ) : (
                <div>
                  {body}
                  <span className="sr-only">{`${stage.label}: ${stage.state}`}</span>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {blockers.length > 0 ? (
        <div className="border-t border-line-soft bg-surface-alt px-4 py-3.5">
          <h3 className="mb-2 text-caption font-bold uppercase tracking-widest text-content-muted">
            {journey.blocked ? 'Why this went backwards' : `Blocking ${current?.label.toLowerCase()}`}
          </h3>
          <ul className="grid gap-1.5">
            {blockers.map((blocker, index) => (
              <li key={index} className="flex items-baseline gap-2.5 text-label">
                <span className="shrink-0 font-bold text-danger-strong" aria-hidden>✗</span>
                <span className="text-content">{blocker.label}</span>
                {/* Every blocker is the shortest route out of itself. */}
                {blocker.fix ? (
                  <Link href={blocker.fix} className="ml-auto shrink-0 whitespace-nowrap text-caption font-bold text-brand hover:underline">
                    Fix this →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
