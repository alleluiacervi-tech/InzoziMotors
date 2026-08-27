'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { api, type Readiness } from '@/lib/api'
import { EmptyState, ErrorState, Icon, LoadingState, fmtMoney } from '@/components/ui'
import { useConfirm, useToast } from '@/components/feedback'
import { QueueSearch } from '@/components/QueueSearch'

// 'needs_action' is a server-side view over under_review + approved — every car
// whose next step belongs to an administrator — and it is the default because
// the old default was 'live'. A vehicle that had just passed its inspection was
// therefore never on screen when this page opened: the operator saw the cars
// already published and reasonably concluded nothing was waiting. Opening on
// the work rather than on the archive is the whole point.
const NEEDS_ACTION = 'needs_action'
const STATUSES = [NEEDS_ACTION, 'under_review', 'approved', 'live', 'paused', 'sold', 'rejected', 'scheduled', 'inspecting', 'archived']
const STATUS_LABELS: Record<string, string> = { [NEEDS_ACTION]: 'Waiting on you' }
const STATUS_COLORS: Record<string, string> = {
  live:         'bg-success-tint text-success',
  approved:     'bg-info-tint text-info',
  paused:       'bg-gray-100 text-gray-700',
  rejected:     'bg-danger-tint text-danger-strong',
  sold:         'bg-gray-100 text-gray-600',
  under_review: 'bg-warning-tint text-warning-text',
  scheduled:    'bg-info-tint text-info',
  inspecting:   'bg-info-tint text-info',
}

export default function ListingsPage() {
  const [statusFilter, setStatusFilter] = useState(NEEDS_ACTION)
  const [items, setItems]               = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]             = useState<unknown>(null)
  const [actionId, setActionId]         = useState<string | null>(null)
  const ask = useConfirm()
  const toast = useToast()
  const [query, setQuery] = useState('')
  // Readiness used to be fetched only when the operator pressed "see what's
  // missing", on the reasoning that fifty verdicts is fifty queries to answer a
  // question about one car. That reasoning holds for a browse and fails for a
  // queue: on the waiting-on-you view, "what is missing?" is the question being
  // asked about every row at once, and hiding the answer behind a click is what
  // let a fully-ready vehicle read as a stuck one. So it is fetched up front
  // for the decision views, bounded, and still on demand everywhere else.
  const [readiness, setReadiness] = useState<Record<string, Readiness | 'loading' | 'error'>>({})
  const AUTO_READINESS_LIMIT = 24

  async function checkReadiness(id: string) {
    setReadiness((prev) => ({ ...prev, [id]: 'loading' }))
    try {
      const verdict = await api.listingReadiness(id)
      setReadiness((prev) => ({ ...prev, [id]: verdict }))
      return verdict
    } catch {
      setReadiness((prev) => ({ ...prev, [id]: 'error' }))
      return null
    }
  }

  async function load(s: string) {
    setLoading(true)
    setError(null)
    try {
      const data = await api.cars({ status: s })
      setItems(data)
    } catch (e: any) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(statusFilter) }, [statusFilter])

  // Sequential rather than parallel: this is a background courtesy, and firing
  // twenty-four requests at once to fill in labels would compete with whatever
  // the operator is actually clicking. `cancelled` stops the walk when the
  // filter changes mid-flight, so switching tabs does not keep loading rows
  // that are no longer on screen.
  useEffect(() => {
    if (![NEEDS_ACTION, 'under_review', 'approved'].includes(statusFilter)) return
    const pending = items
      .filter((car) => ['under_review', 'approved'].includes(car.status))
      .slice(0, AUTO_READINESS_LIMIT)
      .filter((car) => readiness[car.id] === undefined)
    if (!pending.length) return
    let cancelled = false
    ;(async () => {
      for (const car of pending) {
        if (cancelled) return
        await checkReadiness(car.id)
      }
    })()
    return () => { cancelled = true }
    // `readiness` is deliberately not a dependency: it is written by the loop
    // below, and depending on it would restart the walk on every verdict.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, statusFilter])

  const visible = useMemo(() => { const q = query.trim().toLowerCase(); return items.filter((car) => !q || [car.title, car.make, car.model, car.year, car.location, car.seller_name, car.id, car.vin].some((v) => String(v || '').toLowerCase().includes(q))) }, [items, query])

  async function updateStatus(id: string, status: string, reason?: string) {
    setActionId(id)
    try {
      await api.updateCarStatus(id, status, reason)
      load(statusFilter)
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setActionId(null)
    }
  }

  // Approving moved a car out of 'under_review' and into 'approved' — a
  // different tab — so from the operator's side the vehicle they were working on
  // disappeared and nothing appeared to have happened. They would go looking for
  // it in the wrong place, or approve it a second time. Two server transitions
  // are still the right model (approve records the editorial decision, publish
  // enacts it), but they are one intention, so they get one button. The server
  // re-checks readiness on both, so a race that invalidates the car between them
  // fails at the second call rather than publishing something unready.
  async function approveAndPublish(car: any) {
    const ok = await ask({
      title: `Publish the ${car.year} ${car.make} ${car.model}?`,
      message: 'It is approved and made public in one step, and appears on the website and in the app immediately. Seller verification, gallery and completed inspection are re-checked by the API before it goes live.',
      confirmLabel: 'Approve and publish',
    })
    if (!ok) return
    setActionId(car.id)
    try {
      await api.updateCarStatus(car.id, 'approved')
      await api.updateCarStatus(car.id, 'live')
      toast(`${car.year} ${car.make} ${car.model} is live`, 'success')
    } catch (e: any) {
      // A failure between the two leaves the car at 'approved', which is a
      // legitimate resting state — say so, so the next step is obvious.
      toast(`${e.message} — the listing is approved but not yet published; use Publish to finish.`, 'error')
    } finally {
      setActionId(null)
      load(statusFilter)
    }
  }

  async function feature(id: string) {
    const ok = await ask({
      title: 'Feature this listing for 7 days?',
      message: 'It is boosted to the top of the public feed for a week, then drops back automatically.',
      confirmLabel: 'Feature for 7 days',
    })
    if (!ok) return
    setActionId(id)
    try {
      await api.featureCar(id, 7)
      load(statusFilter)
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setActionId(null)
    }
  }

  const isFeatured = (car: any) =>
    car.featured_until && new Date(car.featured_until).getTime() > Date.now()

  // The row flags are a summary of four of the checks; publicationReadiness on
  // the server is all of them. Prefer the real verdict wherever it has arrived
  // and fall back to the summary otherwise, so a button is never enabled on
  // less information than is available — and never disabled on more caution
  // than is warranted once the verdict says yes.
  const coarseReady = (car: any) =>
    Boolean(car.has_completed_inspection)
    && Math.max(car.image_count || 0, car.structured_photo_count || 0) >= 1
    && car.seller_id_verified === 'approved'
    && car.seller_account_status === 'active'
  const verdictOf = (car: any) => {
    const r = readiness[car.id]
    return r && r !== 'loading' && r !== 'error' ? (r as Readiness) : null
  }
  const mayPublish = (car: any) => verdictOf(car)?.ready ?? coarseReady(car)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Listings</h1>
          {statusFilter === NEEDS_ACTION ? (
            <p className="mt-0.5 text-xs text-content-muted">Vehicles whose next step is an approval or a publication by you. Oldest first.</p>
          ) : null}
        </div>
        <Link
          href="/listings/new"
          className="px-4 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-light transition-colors"
        >
          Create Listing
        </Link>
      </div>
      <QueueSearch value={query} onChange={setQuery} resultCount={visible.length} placeholder="Search vehicle, seller, location, VIN, or listing ID" />

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-1 mb-6">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
              statusFilter === s ? 'bg-brand text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-brand'
            }`}
          >
            {STATUS_LABELS[s] || s.replace('_', ' ')}
            {s === NEEDS_ACTION && statusFilter === NEEDS_ACTION && items.length ? ` (${items.length})` : ''}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => load(statusFilter)} />
      ) : loading ? (
        <LoadingState />
      ) : visible.length === 0 ? (
        <EmptyState icon="car"
          title={items.length ? 'No listings match' : statusFilter === NEEDS_ACTION ? 'Nothing is waiting on you' : 'No listings here'}
          description={items.length ? 'Try a different vehicle, seller, location, VIN, or ID.'
            : statusFilter === NEEDS_ACTION ? 'Every submitted vehicle has been decided. New submissions appear here once their inspection is complete — check Submissions and Inspections for vehicles still earlier in the process.'
            : `Nothing on the floor with status “${statusFilter}”.`} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((car) => (
            <div key={car.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Thumbnail */}
              {car.images?.[0] ? (
                <img src={car.images[0]} alt={car.model} className="w-full h-36 object-contain bg-gray-100 p-1.5" />
              ) : (
                <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-gray-300"><Icon name="car" size={32} /></div>
              )}

              <div className="p-4">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="font-semibold text-gray-900 text-sm truncate">{car.year} {car.make} {car.model}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isFeatured(car) && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-600">
                        Featured
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[car.status] || 'bg-gray-100 text-gray-600'}`}>
                      {car.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">{car.mileage?.toLocaleString()} km · {car.location}</p>
                <p className="text-sm font-bold text-brand mt-1">{fmtMoney(car.price, car.currency)}</p>
                <p className="text-xs text-gray-400">{car.views || 0} views</p>
                <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[11px]">
                  <span className={`rounded-md px-1 py-1 ${car.seller_id_verified === 'approved' && car.seller_account_status === 'active' ? 'bg-success-tint text-success' : 'bg-danger-tint text-danger-strong'}`}>Seller</span>
                  <span className={`rounded-md px-1 py-1 ${car.has_completed_inspection ? 'bg-success-tint text-success' : 'bg-warning-tint text-warning-text'}`}>Inspection</span>
                  <span className={`rounded-md px-1 py-1 ${Math.max(car.image_count || 0, car.structured_photo_count || 0) > 0 ? 'bg-success-tint text-success' : 'bg-warning-tint text-warning-text'}`}>Gallery</span>
                </div>

                {/* Actions */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {car.status !== 'sold' && (
                    <Link
                      href={`/listings/${car.id}/edit`}
                      className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Edit
                    </Link>
                  )}
                  {car.status !== 'sold' && (
                    <Link
                      href={`/listings/${car.id}/photos`}
                      className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Photos ({car.images?.length || 0})
                    </Link>
                  )}
                  {car.status === 'live' && !isFeatured(car) && (
                    <button
                      onClick={() => feature(car.id)}
                      disabled={actionId === car.id}
                      className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                    >
                      Feature
                    </button>
                  )}
                  {car.status === 'live' && (
                    <button
                      onClick={() => updateStatus(car.id, 'paused')}
                      disabled={actionId === car.id}
                      className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                    >Pause</button>
                  )}
                  {['approved', 'paused'].includes(car.status) && (
                    <button
                      onClick={async () => {
                        const ok = await ask({ title: `Publish the ${car.year} ${car.make} ${car.model}?`, message: 'It appears on the website and in the app immediately. The API re-checks seller verification, gallery and completed inspection before making it public.', confirmLabel: 'Publish listing' })
                        if (ok) updateStatus(car.id, 'live')
                      }}
                      disabled={actionId === car.id || !mayPublish(car)}
                      title={mayPublish(car) ? undefined : 'Something below is still required before this can be published.'}
                      className="px-2 py-1 text-xs font-medium bg-brand text-white rounded-lg hover:bg-brand-light disabled:opacity-50"
                    >Publish</button>
                  )}
                  {car.status === 'under_review' && mayPublish(car) ? (
                    <>
                      <button onClick={() => approveAndPublish(car)} disabled={actionId === car.id} className="px-2 py-1 text-xs font-semibold bg-brand text-white rounded-lg hover:bg-brand-light disabled:opacity-50">
                        {actionId === car.id ? 'Publishing…' : 'Approve & publish'}
                      </button>
                      {/* Kept for the case where the decision to publish is
                          someone else's, or is not for today. */}
                      <button onClick={() => updateStatus(car.id, 'approved')} disabled={actionId === car.id} title="Record the approval now and publish later. The listing moves to the Approved filter." className="px-2 py-1 text-xs font-medium bg-info-tint text-info rounded-lg disabled:opacity-50">Approve only</button>
                    </>
                  ) : car.status === 'under_review' ? (
                    <button
                      type="button"
                      onClick={() => checkReadiness(car.id)}
                      disabled={readiness[car.id] === 'loading'}
                      className="px-2 py-1 text-xs font-semibold text-warning-text underline underline-offset-2 hover:text-content disabled:opacity-50"
                    >
                      {readiness[car.id] === 'loading' ? 'Checking…' : readiness[car.id] ? 'Re-check' : "See what's missing"}
                    </button>
                  ) : null}
                  {car.status === 'under_review' && (
                    <button onClick={() => { const reason = window.prompt('Why is this listing rejected?'); if (reason?.trim()) updateStatus(car.id, 'rejected', reason.trim()) }} disabled={actionId === car.id} className="px-2 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-lg disabled:opacity-50">Reject</button>
                  )}
                  {car.status === 'live' && (
                    <button
                      onClick={() => updateStatus(car.id, 'sold')}
                      disabled={actionId === car.id}
                      className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                    >
                      Mark Sold
                    </button>
                  )}
                  {!['sold', 'archived'].includes(car.status) && (
                    <button
                      onClick={async () => {
                        const ok = await ask({
                          title: 'Remove this listing?',
                          message: 'It disappears from the public marketplace. The car and its history stay in the system.',
                          confirmLabel: 'Remove listing',
                          tone: 'danger',
                        })
                        if (ok) {
                          const reason = window.prompt('Record the reason for archiving this listing:')
                          if (reason?.trim()) updateStatus(car.id, 'archived', reason.trim())
                        }
                      }}
                      disabled={actionId === car.id}
                      className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* The server's own verdict, verbatim. Previously the operator
                    could only be told that "inspection, seller approval and
                    gallery are required" — three categories, whichever one was
                    actually wrong — and had to trip the 409 to find out. */}
                {readiness[car.id] && readiness[car.id] !== 'loading' && (
                  <div className="mt-3 rounded-lg border border-line-soft bg-surface-alt p-3">
                    {readiness[car.id] === 'error' ? (
                      <p className="text-xs text-danger-strong">Could not read the publication checks. Try again.</p>
                    ) : (readiness[car.id] as Readiness).ready ? (
                      <p className="text-xs font-semibold text-success-text">
                        Every publication check passes.{' '}
                        {car.status === 'under_review' ? 'Use Approve & publish above to put it live.'
                          : car.status === 'approved' ? 'Use Publish above to put it live.'
                          : 'Nothing is blocking publication.'}
                      </p>
                    ) : (
                      <>
                        <p className="text-xs font-bold text-content">Still required before publication</p>
                        <ul className="mt-1.5 space-y-1">
                          {(readiness[car.id] as Readiness).missing.map((item) => (
                            <li key={item} className="flex gap-2 text-xs text-content-secondary">
                              <span aria-hidden className="text-warning-text">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-[11px] text-content-muted">
                          {(readiness[car.id] as Readiness).photo_count} of {(readiness[car.id] as Readiness).min_photos} required photo
                          {(readiness[car.id] as Readiness).min_photos === 1 ? '' : 's'} uploaded.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
