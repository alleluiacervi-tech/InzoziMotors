'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { api, type Readiness } from '@/lib/api'
import { EmptyState, ErrorState, Icon, LoadingState, fmtMoney } from '@/components/ui'
import { useConfirm, useToast } from '@/components/feedback'
import { QueueSearch } from '@/components/QueueSearch'

const STATUSES = ['under_review', 'approved', 'live', 'paused', 'sold', 'rejected', 'scheduled', 'inspecting', 'archived']
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
  const [statusFilter, setStatusFilter] = useState('live')
  const [items, setItems]               = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]             = useState<unknown>(null)
  const [actionId, setActionId]         = useState<string | null>(null)
  const ask = useConfirm()
  const toast = useToast()
  const [query, setQuery] = useState('')
  // Readiness is fetched per listing on demand rather than for every row: the
  // verdict costs a query each, and a list of fifty would mean fifty of them
  // to answer a question the operator only asks about the one they are
  // working on.
  const [readiness, setReadiness] = useState<Record<string, Readiness | 'loading' | 'error'>>({})

  async function checkReadiness(id: string) {
    setReadiness((prev) => ({ ...prev, [id]: 'loading' }))
    try {
      const verdict = await api.listingReadiness(id)
      setReadiness((prev) => ({ ...prev, [id]: verdict }))
    } catch {
      setReadiness((prev) => ({ ...prev, [id]: 'error' }))
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-900">Listings</h1>
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
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => load(statusFilter)} />
      ) : loading ? (
        <LoadingState />
      ) : visible.length === 0 ? (
        <EmptyState icon="car" title={items.length ? 'No listings match' : 'No listings here'} description={items.length ? 'Try a different vehicle, seller, location, VIN, or ID.' : `Nothing on the floor with status “${statusFilter}”.`} />
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
                        const ok = await ask({ title: 'Publish this listing?', message: 'The API will re-check seller verification, gallery and completed inspection before making it public.', confirmLabel: 'Publish listing' })
                        if (ok) updateStatus(car.id, 'live')
                      }}
                      disabled={actionId === car.id || !car.has_completed_inspection || Math.max(car.image_count || 0, car.structured_photo_count || 0) < 1 || car.seller_id_verified !== 'approved' || car.seller_account_status !== 'active'}
                      className="px-2 py-1 text-xs font-medium bg-brand text-white rounded-lg hover:bg-brand-light disabled:opacity-50"
                    >Publish</button>
                  )}
                  {car.status === 'under_review' && car.has_completed_inspection && Math.max(car.image_count || 0, car.structured_photo_count || 0) > 0 && car.seller_id_verified === 'approved' && car.seller_account_status === 'active' ? (
                    <button onClick={() => updateStatus(car.id, 'approved')} disabled={actionId === car.id} className="px-2 py-1 text-xs font-medium bg-info-tint text-info rounded-lg disabled:opacity-50">Approve for publication</button>
                  ) : car.status === 'under_review' ? (
                    <button
                      type="button"
                      onClick={() => checkReadiness(car.id)}
                      disabled={readiness[car.id] === 'loading'}
                      className="px-2 py-1 text-xs font-semibold text-warning-text underline underline-offset-2 hover:text-content disabled:opacity-50"
                    >
                      {readiness[car.id] === 'loading' ? 'Checking…' : "Not ready — see what's missing"}
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
                      <p className="text-xs font-semibold text-success">Every publication check passes — ready to approve.</p>
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
