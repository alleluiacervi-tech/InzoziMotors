'use client'

// ─────────────────────────────────────────────────────────────────────────────
// One vehicle from the pipeline board, opened.
//
// The card on the board says "2 blockers" and nothing else, and it used to be
// a link to wherever the current stage lived — so what the blockers were, and
// how to take a car off the board at all, were both somewhere else. This panel
// is the whole answer in one place: what it is waiting for and why, the pages
// that move it on, every stage so far, and — for a car that is not going to be
// listed — the way off the board.
//
// Removing is POST /submissions/:id/close, the same call Submissions makes, so
// the rules live on the server: an unused appointment is released, a draft
// listing is archived, a finished inspection is kept, a public listing is
// refused. The panel only explains them before the button is pressed.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { api, type Journey } from '@/lib/api'
import { ActorChip, JourneyStageList, STEP_TITLE } from './JourneyRail'
import { Icon } from './Icon'

const PUBLIC = ['live', 'paused', 'sold']

// Quick reasons. The two that are about our own records, not the seller's
// car, default to not messaging the seller.
const REASONS: { label: string; notify: boolean }[] = [
  { label: 'The seller is not going ahead', notify: true },
  { label: 'The car was sold elsewhere', notify: true },
  { label: 'Duplicate entry', notify: false },
  { label: 'Test entry', notify: false },
]

export function PipelineDrawer({
  journey, onClose, onRemoved,
}: {
  journey: Journey
  onClose: () => void
  onRemoved: (message: string) => void
}) {
  const panel = useRef<HTMLDivElement>(null)
  const [reason, setReason] = useState('')
  const [notify, setNotify] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { subject } = journey
  const stage = journey.stages.find((s) => s.key === journey.current_stage) || null
  const stageOf = (key: string) => journey.stages.find((s) => s.key === key)
  const inspected = stageOf('inspected')
  const isPublic = PUBLIC.includes(journey.listing_status || '')
  const canRemove = Boolean(subject.submission_id) && !isPublic
  const reasonBox = useRef<HTMLTextAreaElement>(null)
  const goToRemove = () => {
    reasonBox.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    reasonBox.current?.focus({ preventScroll: true })
  }
  const canCreateListing = journey.current_stage === 'listing_created' && !subject.car_id
    && Boolean(subject.inspection_id) && journey.submission_status !== 'archived'

  useEffect(() => {
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  // What Remove will do to this particular car, said before it is done.
  const consequences: string[] = ['The submission is closed and the car leaves the board.']
  if (subject.car_id && journey.listing_status && !['archived', 'rejected'].includes(journey.listing_status)) {
    consequences.push('Its draft listing is archived. You can delete it for good from Listings afterwards.')
  }
  if (inspected?.state === 'done') consequences.push('The inspection report is kept as a record.')
  else if (stageOf('booked')?.state === 'done' && inspected?.detail !== 'Checklist in progress') {
    consequences.push('The booked appointment is released, unless a fee was recorded against it.')
  }
  consequences.push('Reopen it from Submissions if this was a mistake.')

  async function remove() {
    if (!subject.submission_id) return
    setBusy(true); setError(null)
    try {
      const r = await api.closeSubmission(subject.submission_id, reason.trim(), notify)
      const extras = [
        r.released_appointment ? 'appointment released' : null,
        r.archived_listing ? 'draft listing archived' : null,
        r.seller_notified ? 'seller told' : 'seller not messaged',
      ].filter(Boolean).join(' · ')
      onRemoved(`${journey.vehicle.title} removed from the pipeline · ${extras}.`)
    } catch (e: any) {
      setError(e?.message || 'Could not remove it. Try again.')
      setBusy(false)
    }
  }

  const button = 'inline-flex h-9 items-center justify-center rounded-xl px-3.5 text-label font-semibold transition-colors'
  const secondary = `${button} border border-line bg-surface text-content hover:border-content-muted`

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/40" onClick={() => { if (!busy) onClose() }}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pipeline-drawer-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-surface shadow-card-lg outline-none"
      >
        <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-line-soft bg-surface px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id="pipeline-drawer-title" className="text-body font-bold leading-tight text-content">{journey.vehicle.title}</h2>
            {journey.seller ? (
              <Link href={`/users?q=${encodeURIComponent(journey.seller.email)}`} className="mt-0.5 block truncate text-label text-content-muted hover:underline">
                {journey.seller.name}{journey.seller.seller_type === 'showroom' ? ' · showroom' : ''}
              </Link>
            ) : null}
            <div className="mt-2">
              <ActorChip actor={journey.actor} ageHours={journey.age_hours} blocked={journey.blocked} />
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="rounded-lg p-1.5 text-content-muted transition-colors hover:bg-surface-alt hover:text-content">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="grid gap-6 px-5 py-5">
          <section aria-labelledby="next-step">
            <h3 id="next-step" className="mb-2 text-caption font-bold uppercase tracking-widest text-content-muted">
              {stage ? `Next: ${(STEP_TITLE[stage.key] || stage.label).toLowerCase()}` : 'Nothing outstanding'}
            </h3>
            {stage ? <p className="text-label text-content">{stage.detail}</p> : null}
            {stage && stage.blockers.length ? (
              <ul className="mt-2.5 grid gap-2">
                {stage.blockers.map((blocker, i) => (
                  <li key={i} className="rounded-lg border border-line-soft bg-surface-alt p-2.5 text-label">
                    <span className="text-content">{blocker.label}</span>
                    {/* Closing is done right here, not on another page. */}
                    {blocker.fix?.startsWith('/submissions') && canRemove ? (
                      <button type="button" onClick={goToRemove} className="mt-1 block text-caption font-bold text-brand hover:underline">Remove it below ↓</button>
                    ) : blocker.fix ? (
                      <Link href={blocker.fix} className="mt-1 block text-caption font-bold text-brand hover:underline">Do this →</Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              {canCreateListing ? (
                <Link href={`/listings/new?submissionId=${subject.submission_id}&inspectionId=${subject.inspection_id}`}
                  className={`${button} bg-brand text-brand-on hover:bg-brand-light`}>
                  Create the listing
                </Link>
              ) : null}
              {subject.car_id ? (
                <Link href={`/listings/${subject.car_id}/edit`} className={secondary}>Edit the listing</Link>
              ) : null}
              {subject.inspection_id ? (
                <Link href={`/inspections/${subject.inspection_id}`} className={secondary}>Inspection</Link>
              ) : null}
              {subject.submission_id ? (
                <Link href={`/submissions?focus=${subject.submission_id}`} className={secondary}>Submission</Link>
              ) : null}
            </div>
          </section>

          <section aria-labelledby="stages">
            <h3 id="stages" className="mb-2 text-caption font-bold uppercase tracking-widest text-content-muted">
              {journey.stages_done} of {journey.stages_total} stages done
            </h3>
            <JourneyStageList journey={journey} />
          </section>

          {subject.submission_id ? (
            <section aria-labelledby="remove" className="rounded-xl border border-danger-strong/30 p-4">
              <h3 id="remove" className="text-label font-bold text-content">Remove from the pipeline</h3>
              {isPublic ? (
                <p className="mt-1.5 text-label leading-relaxed text-content-secondary">
                  This car is a public listing ({journey.listing_status}). Pause it, mark it sold or remove it from{' '}
                  <Link href={`/listings/${subject.car_id}/edit`} className="font-semibold text-brand hover:underline">the listing</Link>.
                </p>
              ) : (
                <>
                  <ul className="mt-1.5 grid gap-1 text-caption leading-snug text-content-secondary">
                    {consequences.map((line) => <li key={line}>· {line}</li>)}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {REASONS.map((r) => (
                      <button key={r.label} type="button"
                        onClick={() => { setReason(r.label); setNotify(r.notify) }}
                        aria-pressed={reason === r.label}
                        className={`rounded-full border px-2.5 py-1 text-caption font-semibold transition-colors ${reason === r.label ? 'border-ink-900 bg-ink-900 text-white dark:border-content dark:bg-surface-alt dark:text-content' : 'border-line text-content-secondary hover:border-content-muted'}`}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <label className="mt-3 block text-caption font-semibold text-content-secondary">
                    Reason (kept in the activity log)
                    <textarea ref={reasonBox} value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
                      placeholder="Why is this car coming off the pipeline?"
                      className="mt-1 block w-full rounded-lg border border-line bg-surface p-2 text-label text-content placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-brand" />
                  </label>
                  <label className="mt-2 flex items-start gap-2 text-caption text-content-secondary">
                    <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-0.5" />
                    <span>Tell the seller — they receive a notification with this reason.</span>
                  </label>
                  {error ? <p role="alert" className="mt-2 text-caption font-semibold text-danger-strong">{error}</p> : null}
                  <button type="button" onClick={remove} disabled={busy || reason.trim().length < 4}
                    className={`${button} mt-3 w-full bg-danger-strong text-white hover:bg-danger-strong/90 disabled:opacity-50`}>
                    {busy ? 'Removing…' : 'Remove from the pipeline'}
                  </button>
                </>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
