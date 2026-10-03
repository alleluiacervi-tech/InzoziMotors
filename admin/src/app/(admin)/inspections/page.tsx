'use client'

import { ExportLink } from '@/components/ExportLink'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { api, type CenterRow } from '@/lib/api'
import { Card, EmptyState, ErrorState, LoadingState } from '@/components/ui'
import { QueueSearch } from '@/components/QueueSearch'
import { useToast, useConfirm } from '@/components/feedback'
import { useFocusRow } from '@/components/useFocusRow'
import { KIGALI, fmtWeekday } from '@/lib/format'

const STATUS_COLORS: Record<string, string> = {
  scheduled:  'bg-info-tint text-info',
  in_progress: 'bg-info-tint text-info',
  complete:   'bg-success-tint text-success',
}

function todayISO() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Today in Kigali, as YYYY-MM-DD, whatever the laptop's own zone. */
function kigaliDay(offsetDays = 0) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: KIGALI }).format(new Date(Date.now() + offsetDays * 864e5))
}

const STATUS_LABELS: Record<string, string> = { scheduled: 'Booked', in_progress: 'Being inspected', complete: 'Done' }

/**
 * The list grouped the way the day is worked: what is happening now, what
 * slipped, each day ahead, then finished inspections still waiting for a
 * listing. A flat list filtered to one date and one status used to open on
 * "today, booked" and hide everything else that needed doing.
 */
function groupInspections(rows: any[]) {
  const today = kigaliDay(0)
  const tomorrow = kigaliDay(1)
  const groups = new Map<string, { label: string; order: string; rows: any[] }>()
  const put = (key: string, label: string, order: string, row: any) => {
    if (!groups.has(key)) groups.set(key, { label, order, rows: [] })
    groups.get(key)!.rows.push(row)
  }
  for (const row of rows) {
    const day = String(row.scheduled_on || row.scheduled_date || '').slice(0, 10)
    if (row.status === 'in_progress') put('now', 'Being inspected', '0', row)
    else if (row.status === 'complete') put('done', 'Done, waiting for a listing', '9', row)
    else if (!day) put('undated', 'Booked, no date recorded', '8', row)
    else if (day < today) put('late', 'Booked earlier, not started', '1', row)
    else put(day, day === today ? 'Today' : day === tomorrow ? 'Tomorrow' : fmtWeekday(day), `2-${day}`, row)
  }
  return [...groups.values()].sort((a, b) => a.order.localeCompare(b.order))
}

export default function InspectionsPage() {
  // Arrives here from an Action Center item; marks the row it named.
  const { focusProps } = useFocusRow()
  const toast = useToast()
  const confirm = useConfirm()
  const [center, setCenter]   = useState('all')
  const [date, setDate]       = useState('')
  const [status, setStatus]   = useState('open')
  const [items, setItems]     = useState<any[]>([])
  const [centers, setCenters] = useState<CenterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]             = useState<unknown>(null)
  const [query, setQuery]             = useState('')
  const [preparingReport, setPreparingReport] = useState<string | null>(null)
  const [walkInOpen, setWalkInOpen]   = useState(false)
  const [booking, setBooking]         = useState(false)
  const [cancelling, setCancelling]   = useState<string | null>(null)
  const [walkIn, setWalkIn] = useState({
    make: '', model: '', year: '', registration_plate: '', mileage: '',
    center: '', scheduled_date: '', scheduled_time: '09:00 AM',
    customer_name: '', customer_email: '', customer_phone: '',
  })

  async function load() {
    setLoading(true)
    setError(null)
    const params: Record<string, string> = { status }
    if (center !== 'all') params.center = center
    if (date)             params.date   = date
    try {
      const data = await api.inspections(params)
      setItems(data)
    } catch (e: any) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [center, date, status])
  useEffect(() => {
    api.centers()
      .then((rows) => setCenters(rows.filter((row) => row.active)))
      .catch((error) => toast(error instanceof Error ? error.message : 'Could not load inspection centers.', 'error'))
  }, [toast])
  const visible = useMemo(() => { const q = query.trim().toLowerCase(); return items.filter((insp) => !q || [insp.display_make ?? insp.make, insp.display_model ?? insp.model, insp.display_year ?? insp.year, insp.party_name ?? insp.seller_name, insp.center, insp.id, insp.submission_id].some((v) => String(v || '').toLowerCase().includes(q))) }, [items, query])

  async function bookWalkIn(event: React.FormEvent) {
    event.preventDefault()
    setBooking(true)
    try {
      const created = await api.bookWalkInInspection({
        make: walkIn.make.trim(),
        model: walkIn.model.trim(),
        year: Number(walkIn.year),
        registration_plate: walkIn.registration_plate.trim() || undefined,
        mileage: walkIn.mileage ? Number(walkIn.mileage.replace(/[^0-9]/g, '')) : undefined,
        center: walkIn.center,
        scheduled_date: walkIn.scheduled_date,
        scheduled_time: walkIn.scheduled_time,
        customer: {
          name: walkIn.customer_name.trim(),
          email: walkIn.customer_email.trim(),
          phone: walkIn.customer_phone.trim() || undefined,
        },
      })
      toast(
        created.invitation_sent
          ? 'Walk-in booked. The customer has an activation link by email.'
          : 'Walk-in booked. No activation email went out — send the link from Users if they need an account.',
        'success',
      )
      setWalkIn({ make: '', model: '', year: '', registration_plate: '', mileage: '',
        center: walkIn.center, scheduled_date: walkIn.scheduled_date, scheduled_time: walkIn.scheduled_time,
        customer_name: '', customer_email: '', customer_phone: '' })
      setWalkInOpen(false)
      // Jump the filters to the booking so it is visible immediately rather
      // than hidden behind whatever day the operator happened to be viewing.
      setStatus('scheduled')
      setCenter(walkIn.center)
      setDate(walkIn.scheduled_date)
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not book the inspection.', 'error')
    } finally {
      setBooking(false)
    }
  }

  async function cancelWalkIn(inspection: any) {
    const vehicle = [inspection.display_year, inspection.display_make, inspection.display_model].filter(Boolean).join(' ')
    const ok = await confirm({
      title: 'Cancel this walk-in?',
      message: `The booking for the ${vehicle || 'vehicle'} is removed and the bay frees up. Nothing has been inspected yet, and the audit log keeps the record.`,
      confirmLabel: 'Cancel booking',
      cancelLabel: 'Keep it',
      tone: 'danger',
    })
    if (!ok) return
    setCancelling(inspection.id)
    try {
      await api.cancelInspection(inspection.id)
      toast('Walk-in cancelled. The bay is free again.', 'success')
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not cancel the inspection.', 'error')
    } finally {
      setCancelling(null)
    }
  }

  async function downloadReport(inspectionId: string) {
    setPreparingReport(inspectionId)
    try {
      const document = await api.issueInspectionReport(inspectionId)
      const link = window.document.createElement('a')
      link.href = `/api/backend/inspections/${inspectionId}/report/file?download=1`
      link.download = document.filename || `${document.document_number}.pdf`
      window.document.body.appendChild(link)
      link.click()
      link.remove()
      toast(`${document.document_number} is ready to download.`, 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not prepare the report.', 'error')
    } finally {
      setPreparingReport(null)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Inspections</h1>
        <div className="flex flex-wrap items-center gap-2">
        <ExportLink dataset="inspections" />
        <button type="button" onClick={() => setWalkInOpen((open) => !open)}
          className="rounded-xl bg-brand px-4 py-2.5 text-label font-bold text-brand-on hover:bg-brand-bright">
          {walkInOpen ? 'Close form' : 'Book a walk-in inspection'}
        </button>
        </div>
      </div>

      {walkInOpen ? (
        <Card className="mb-6 p-5">
          <div className="mb-4">
            <h2 className="font-extrabold text-content">Walk-in inspection</h2>
            <p className="mt-1 text-label text-content-muted">
              A paid 150-point check on a vehicle Sawa is not selling — the same checklist, the same report.
              It cannot be attached to a listing, and it never publishes anything. The customer gets an account
              and a one-use link to set their own password; no password is ever emailed.
            </p>
          </div>
          <form onSubmit={bookWalkIn} className="grid gap-3 sm:grid-cols-2">
            {([
              ['make', 'Make', 'Toyota', true],
              ['model', 'Model', 'Land Cruiser', true],
              ['year', 'Year', '2016', true],
              ['registration_plate', 'Plate (optional)', 'RAD 123 X', false],
              ['mileage', 'Mileage in km (optional)', '141000', false],
            ] as const).map(([key, label, placeholder, required]) => (
              <label key={key} className="text-label font-semibold text-content">{label}
                <input required={required} inputMode={key === 'year' || key === 'mileage' ? 'numeric' : undefined}
                  value={walkIn[key]} placeholder={placeholder}
                  onChange={(e) => setWalkIn({ ...walkIn, [key]: e.target.value })}
                  className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:border-content-muted focus:outline-none" />
              </label>
            ))}
            <label className="text-label font-semibold text-content">Center
              <select required value={walkIn.center}
                onChange={(e) => setWalkIn({ ...walkIn, center: e.target.value })}
                className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:border-content-muted focus:outline-none">
                <option value="">Choose a center…</option>
                {centers.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              </select>
            </label>
            <label className="text-label font-semibold text-content">Date
              <input required type="date" value={walkIn.scheduled_date} min={todayISO()}
                onChange={(e) => setWalkIn({ ...walkIn, scheduled_date: e.target.value })}
                className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:border-content-muted focus:outline-none" />
            </label>
            <label className="text-label font-semibold text-content">Time
              <input value={walkIn.scheduled_time} placeholder="09:00 AM"
                onChange={(e) => setWalkIn({ ...walkIn, scheduled_time: e.target.value })}
                className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:border-content-muted focus:outline-none" />
            </label>
            <fieldset className="sm:col-span-2 grid gap-3 sm:grid-cols-3 rounded-xl border border-line-soft p-3">
              <legend className="px-1 text-label font-semibold text-content">Customer</legend>
              {([
                ['customer_name', 'Name', 'Jean Habimana', true],
                ['customer_email', 'Email', 'jean@example.rw', true],
                ['customer_phone', 'Phone (optional)', '+250 7…', false],
              ] as const).map(([key, label, placeholder, required]) => (
                <label key={key} className="text-label font-semibold text-content">{label}
                  <input required={required} type={key === 'customer_email' ? 'email' : 'text'}
                    value={walkIn[key]} placeholder={placeholder}
                    onChange={(e) => setWalkIn({ ...walkIn, [key]: e.target.value })}
                    className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:border-content-muted focus:outline-none" />
                </label>
              ))}
            </fieldset>
            <button disabled={booking} className="rounded-xl bg-ink-900 px-4 py-3 text-label font-bold text-white disabled:opacity-50 sm:col-span-2">
              {booking ? 'Booking…' : 'Book the inspection'}
            </button>
          </form>
        </Card>
      ) : null}

      {/* Filters */}
      <div className="bg-surface rounded-xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label htmlFor="inspections-filter-center" className="block text-xs font-medium text-gray-600 mb-1">Center</label>
          <select
            id="inspections-filter-center"
            value={center}
            onChange={(e) => setCenter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="all">All centers</option>
            {centers.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="inspections-filter-date" className="block text-xs font-medium text-gray-600 mb-1">Day</label>
          <div className="flex items-center gap-2">
            <input
              id="inspections-filter-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
            />
            {date ? (
              <button type="button" onClick={() => setDate('')} className="text-label font-semibold text-content underline decoration-line underline-offset-4 hover:decoration-content">
                Any day
              </button>
            ) : null}
          </div>
        </div>
        <div>
          <label htmlFor="inspections-filter-status" className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            id="inspections-filter-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="open">All open work</option>
            <option value="scheduled">Booked</option>
            <option value="in_progress">Being inspected</option>
            <option value="complete">Done (all)</option>
          </select>
        </div>
      </div>
      <QueueSearch value={query} onChange={setQuery} resultCount={visible.length} placeholder="Search vehicle, seller, center, inspection, or submission ID" />

      {error ? (
        <ErrorState error={error} onRetry={() => load()} />
      ) : loading ? (
        <LoadingState />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="clipboard-check"
          title={status === 'open' && !date && center === 'all' && !query ? 'Nothing open' : 'No inspections match'}
          description={status === 'open' && !date && center === 'all' && !query
            ? 'No inspection is booked, under way or waiting for a listing.'
            : 'Try another center, day or status.'}
        />
      ) : (
        <div className="space-y-6">
          {groupInspections(visible).map((group) => (
          <section key={group.label} aria-label={group.label}>
          <h2 className="mb-2 flex items-baseline gap-2 text-label font-bold text-content">
            {group.label}
            <span className="tnum font-semibold text-content-muted">{group.rows.length}</span>
          </h2>
          <div className="space-y-3">
          {group.rows.map((insp) => (
            <div key={insp.id} id={`row-${insp.id}`} className={`bg-surface rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4 ${focusProps(insp.id).className}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-gray-900 text-sm">
                    {[insp.display_year ?? insp.year, insp.display_make ?? insp.make, insp.display_model ?? insp.model]
                      .filter(Boolean).join(' ') || 'Vehicle not recorded'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[insp.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[insp.status] ?? insp.status.replaceAll('_', ' ')}
                  </span>
                  {insp.kind === 'standalone' ? (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
                      Walk-in · not a listing
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-gray-500">
                  {insp.center}
                  {insp.scheduled_on || insp.scheduled_date ? ` · ${fmtWeekday(String(insp.scheduled_on || insp.scheduled_date).slice(0, 10))}` : ''}
                  {insp.scheduled_time ? `, ${insp.scheduled_time}` : ''}
                </p>
                <p className="text-xs text-gray-500">
                  {insp.kind === 'standalone' ? 'Customer' : 'Seller'}: {insp.party_name ?? insp.seller_name ?? '—'}
                </p>
              </div>
              {insp.kind === 'standalone' && insp.status === 'scheduled' ? (
                <button type="button" onClick={() => cancelWalkIn(insp)} disabled={cancelling === insp.id}
                  className="flex-shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-content transition-colors hover:bg-surface-alt disabled:cursor-wait disabled:opacity-60">
                  {cancelling === insp.id ? 'Cancelling…' : 'Cancel'}
                </button>
              ) : null}
              {insp.status !== 'complete' && (
                <Link
                  href={`/inspections/${insp.id}`}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold bg-ink-900 text-white rounded-lg hover:bg-ink-800"
                >
                  {insp.status === 'scheduled' ? 'Start checklist' : 'Continue'}
                </Link>
              )}
              {insp.status === 'complete' && (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => downloadReport(insp.id)}
                    disabled={preparingReport === insp.id}
                    className="flex-shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-content transition-colors hover:bg-surface-alt disabled:cursor-wait disabled:opacity-60"
                  >
                    {preparingReport === insp.id ? 'Preparing PDF…' : 'Download report PDF'}
                  </button>
                  {insp.car_id ? (
                    // Was hardcoded "Live Listing" the moment a listing existed,
                    // which is true only after an admin has separately approved
                    // and published it. It read as done while the listing sat
                    // under review.
                    <span
                      className={`text-xs font-semibold flex-shrink-0 ${
                        insp.car_status === 'live' ? 'text-green-600'
                          : insp.car_status === 'sold' || insp.car_status === 'archived' ? 'text-gray-500'
                          : 'text-amber-600'
                      }`}
                    >
                      {insp.car_status === 'live' ? 'Live listing'
                        : insp.car_status === 'approved' ? 'Approved — not published'
                        : insp.car_status === 'sold' ? 'Sold'
                        : insp.car_status === 'archived' ? 'Archived'
                        : insp.car_status === 'rejected' ? 'Listing rejected'
                        : 'Listing under review'}
                    </span>
                  ) : insp.kind === 'standalone' ? (
                    // A walk-in has no submission, so this link would have
                    // emitted submissionId=undefined. It is also the wrong
                    // offer: the customer owns the car, and Sawa is not
                    // selling it.
                    <span className="flex-shrink-0 text-xs font-semibold text-gray-500">
                      Independent report — no listing
                    </span>
                  ) : insp.submission_purpose === 'rental' ? (
                    // The vehicle was taken in for the rental fleet. Offering
                    // Create listing here is how a van intended for hire ends
                    // up as a car for sale, or — more often — how an operator
                    // concludes the rental side simply does not work.
                    <Link
                      href={`/rentals/fleet?inspectionId=${insp.id}`}
                      className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold bg-ink-900 text-white rounded-lg hover:bg-ink-800"
                    >
                      Add to rental fleet
                    </Link>
                  ) : (
                    <div className="flex flex-shrink-0 flex-wrap justify-end gap-2">
                      <Link
                        href={`/listings/new?submissionId=${insp.submission_id}&inspectionId=${insp.id}`}
                        className="px-3 py-1.5 text-xs font-semibold bg-ink-900 text-white rounded-lg hover:bg-ink-800"
                      >
                        Create listing
                      </Link>
                      {insp.submission_purpose === 'both' ? (
                        <Link
                          href={`/rentals/fleet?inspectionId=${insp.id}`}
                          className="px-3 py-1.5 text-xs font-semibold border border-line rounded-lg text-content hover:bg-surface-alt"
                        >
                          Add to rental fleet
                        </Link>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          </div>
          </section>
          ))}
        </div>
      )}
    </div>
  )
}
