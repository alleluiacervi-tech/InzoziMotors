'use client'

import { ExportLink } from '@/components/ExportLink'
import { useEffect, useMemo, useState } from 'react'
import { api, type CenterRow } from '@/lib/api'
import { Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader, fmtMoney } from '@/components/ui'
import { useToast } from '@/components/feedback'
import { useFocusRow } from '@/components/useFocusRow'
import { fmtDate, fmtInt } from '@/lib/format'

const STATUS_TABS = ['all', 'under_review', 'scheduled', 'inspecting', 'inspected', 'live', 'rejected']

// What a vehicle is being taken in FOR. The rental fleet had no intake of its
// own: POST /submissions is the seller's own "sell my car" route, so an operator
// with ten vans to hire out had to ask the provider to file ten sale
// submissions. This form is the intake, and `purpose` is what stops every screen
// downstream from calling a hire van a car awaiting publication.
const PURPOSES = [
  { value: 'sale' as const, label: 'For sale', hint: 'Becomes a listing once inspected and approved.' },
  { value: 'rental' as const, label: 'For rental', hint: 'Goes to the rental fleet once inspected. Provider must be business-verified.' },
  { value: 'both' as const, label: 'Sale and rental', hint: 'One inspection covers both — it no longer has to be done twice.' },
]
const EMPTY_INTAKE = {
  seller_id: '', seller_label: '', purpose: 'rental' as 'sale' | 'rental' | 'both',
  // A person who drove to the office has no account to search for. Filling
  // these creates one as part of the intake, so the operator never has to leave
  // the form with a customer standing at the desk.
  new_name: '', new_email: '', new_phone: '',
  make: '', model: '', year: '', mileage: '', asking_price: '', notes: '',
}

const STATUS_COLORS: Record<string, string> = {
  pending:      'bg-warning-tint text-warning-text',
  under_review: 'bg-warning-tint text-warning-text',
  scheduled:    'bg-info-tint text-info',
  inspecting:   'bg-info-tint text-info',
  rejected:     'bg-danger-tint text-danger-strong',
}

export default function SubmissionsPage() {
  // Arrives here from an Action Center item; marks the row it named.
  const { focusProps } = useFocusRow()
  const [tab, setTab]               = useState('under_review')
  const [items, setItems]           = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]             = useState<unknown>(null)
  const [actionId, setActionId]     = useState<string | null>(null)
  const toast = useToast()
  const [notes, setNotes]           = useState('')
  const [showNotesFor, setShowNotesFor] = useState<string | null>(null)
  const [showScheduleFor, setShowScheduleFor] = useState<string | null>(null)
  const [schedCenter, setSchedCenter] = useState('')
  const [centers, setCenters] = useState<CenterRow[]>([])
  const [schedDate, setSchedDate]     = useState('')
  const [schedTime, setSchedTime]     = useState('10:00 AM')
  const [intake, setIntake]           = useState<null | typeof EMPTY_INTAKE>(null)
  const [sellerQuery, setSellerQuery] = useState('')
  const [sellerHits, setSellerHits]   = useState<any[]>([])
  const [query, setQuery]             = useState('')
  const [order, setOrder]             = useState<'oldest' | 'newest'>('oldest')

  async function load(status: string) {
    setLoading(true)
    setError(null)
    try {
      const data = await api.submissions(status === 'all' ? undefined : status)
      setItems(data)
    } catch (e: any) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(tab) }, [tab])
  useEffect(() => {
    api.centers()
      .then((rows) => {
        const active = rows.filter((row) => row.active && row.daily_capacity > 0)
        setCenters(active)
        setSchedCenter((current) => current || active[0]?.name || '')
      })
      .catch((e) => toast(e instanceof Error ? e.message : 'Could not load active inspection centers.', 'error'))
  }, [toast])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items.filter((sub) => !needle || [sub.make, sub.model, sub.year, sub.seller_name, sub.seller_email, sub.id]
      .some((value) => String(value || '').toLowerCase().includes(needle)))
      .sort((a, b) => {
        const delta = new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
        return order === 'oldest' ? delta : -delta
      })
  }, [items, query, order])

  // "What date?" is a real decision, so it is never overridden once an
  // operator has picked one — but the first time the form opens in a
  // session, tomorrow (skipping the weekend) is right often enough that
  // requiring it to be typed every single time was pure friction.
  function nextBusinessDay(): string {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  }

  function age(sub: { submitted_at: string; status: string }) {
    const hours = Math.max(0, Math.floor((Date.now() - new Date(sub.submitted_at).getTime()) / 3_600_000))
    if (hours < 24) return { label: `${hours}h waiting`, overdue: false }
    const days = Math.floor(hours / 24)
    return { label: `${days}d waiting`, overdue: ['under_review', 'pending'].includes(sub.status) && hours >= 24 }
  }

  async function updateStatus(id: string, status: string, extra: any = {}) {
    setActionId(id)
    try {
      await api.updateSubmission(id, { status, ...extra })
      load(tab)
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setActionId(null)
      setShowNotesFor(null)
      setNotes('')
    }
  }

  // Debounced, and deliberately NOT filtered to sellers: a buyer account that
  // should be a seller is the commonest reason a real person cannot be found,
  // and silently omitting them makes it look like they do not exist.
  useEffect(() => {
    if (!intake) return
    const q = sellerQuery.trim()
    if (q.length < 2 || intake.seller_id) { setSellerHits([]); return }
    const timer = window.setTimeout(() => {
      api.searchUsers(q, 20)
        .then((rows) => setSellerHits(rows.filter((row) => row.role !== 'admin')))
        .catch(() => setSellerHits([]))
    }, 250)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerQuery, intake?.seller_id, Boolean(intake)])

  const asNumber = (value: string) => {
    const digits = String(value || '').replace(/[^0-9]/g, '')
    return digits ? Number(digits) : null
  }

  async function submitIntake(event: React.FormEvent) {
    event.preventDefault()
    const walkIn = !intake?.seller_id && intake?.new_name.trim() && intake?.new_email.trim()
    if (!intake || (!intake.seller_id && !walkIn)) {
      toast('Choose a seller, or fill in the name and email of a new one.', 'error'); return
    }
    const year = asNumber(intake.year)
    if (!year) { toast('Give the vehicle model year.', 'error'); return }
    setActionId('intake')
    try {
      const created = await api.createSubmission({
        // One or the other: an existing account, or enough to create one.
        ...(intake.seller_id
          ? { seller_id: intake.seller_id }
          : { seller: {
              name: intake.new_name.trim(),
              email: intake.new_email.trim(),
              phone: intake.new_phone.trim() || undefined,
            } }),
        purpose: intake.purpose,
        make: intake.make.trim(),
        model: intake.model.trim(),
        year,
        mileage: asNumber(intake.mileage),
        asking_price: asNumber(intake.asking_price),
        notes: intake.notes.trim() || null,
      })
      // Warnings are why this returns anything at all: a rental intake for a
      // seller who is not business-verified will be refused three steps later by
      // POST /rentals, and the operator needs to know now, while the car is
      // still in the workshop.
      if (created.seller_created) {
        toast(`Account created for ${created.seller.name}${created.invitation_sent
          ? ' and the sign-in link is on its way.' : '.'} Book the inspection next.`, 'success')
      } else if (!created.warnings?.length) {
        toast('Submission filed. Book its inspection next.', 'success')
      }
      // Warnings are errors on purpose: each one is something that will block
      // this vehicle later if it is not dealt with now.
      if (created.warnings?.length) created.warnings.forEach((w: string) => toast(w, 'error'))
      setIntake(null)
      setSellerQuery('')
      load(tab)
    } catch (e: any) {
      toast(e.message, 'error')
    } finally { setActionId(null) }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Submissions" description="Review the oldest seller requests first and keep the 24-hour response promise visible." action={<ExportLink dataset="submissions" />} />
        <button type="button" onClick={() => { setIntake(intake ? null : { ...EMPTY_INTAKE }); setSellerQuery(''); setSellerHits([]) }}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-on hover:bg-brand-light">
          {intake ? 'Cancel intake' : 'Take in a vehicle'}
        </button>
      </div>

      {intake ? (
        <Card className="mb-5 p-5">
          <h2 className="font-extrabold text-content">Take in a vehicle for a seller</h2>
          <p className="mt-1 text-label text-content-muted">
            Files the submission the seller would otherwise have to file themselves, which is what the
            rental fleet never had. The vehicle then follows the ordinary route: book its inspection,
            complete the 150 points, and add it to the fleet or publish it as a listing.
          </p>
          <form onSubmit={submitIntake} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-label font-semibold text-content">Seller or provider</label>
              <input value={sellerQuery} onChange={(e) => { setSellerQuery(e.target.value); setIntake((old) => old && { ...old, seller_id: '', seller_label: '' }) }}
                placeholder="Search by name, business or email"
                className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 focus:border-content-muted focus:outline-none" />
              {intake.seller_id ? (
                <p className="mt-1 text-caption font-semibold text-success-text">{intake.seller_label} selected</p>
              ) : null}
              {sellerHits.length > 0 && !intake.seller_id ? (
                <div className="mt-1 max-h-44 overflow-y-auto rounded-lg border border-line bg-surface">
                  {sellerHits.map((row) => (
                    <button key={row.id} type="button"
                      onClick={() => { const label = row.business_name || row.name; setIntake((old) => old && { ...old, seller_id: row.id, seller_label: label }); setSellerQuery(label); setSellerHits([]) }}
                      className="block w-full border-b border-line-soft px-3 py-2 text-left text-label last:border-0 hover:bg-surface-alt">
                      <span className="font-semibold text-content">{row.business_name || row.name}</span>
                      <span className="ml-2 text-caption text-content-muted">{row.email}</span>
                      {row.role !== 'seller' ? <span className="ml-2 text-caption text-warning-text">buyer account — change the role first</span> : null}
                    </button>
                  ))}
                </div>
              ) : null}
              {/* Nobody found, and nothing selected: this is a walk-in. The account
                  is created with no password, so nothing can be signed into
                  until they follow the emailed link themselves. */}
              {!intake.seller_id && sellerQuery.trim().length >= 2 && sellerHits.length === 0 ? (
                <div className="mt-2 rounded-xl border border-line-soft bg-surface-alt p-3">
                  <p className="text-label font-bold text-content">Nobody by that name — is this a walk-in?</p>
                  <p className="mt-0.5 text-caption text-content-muted">
                    Create the seller here and take the car in without leaving this form. They get an
                    email with a link to set their own password and follow the vehicle.
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <input value={intake.new_name} onChange={(e) => setIntake({ ...intake, new_name: e.target.value })}
                      placeholder="Full name" className="h-10 rounded-lg border border-line bg-surface px-3 text-label" />
                    <input value={intake.new_email} onChange={(e) => setIntake({ ...intake, new_email: e.target.value })}
                      type="email" placeholder="Email" className="h-10 rounded-lg border border-line bg-surface px-3 text-label" />
                    <input value={intake.new_phone} onChange={(e) => setIntake({ ...intake, new_phone: e.target.value })}
                      type="tel" placeholder="Phone (optional)" className="h-10 rounded-lg border border-line bg-surface px-3 text-label" />
                  </div>
                </div>
              ) : null}
            </div>

            <fieldset className="sm:col-span-2 grid gap-2 sm:grid-cols-3">
              <legend className="mb-1 text-label font-semibold text-content">What is it for?</legend>
              {PURPOSES.map((p) => (
                <label key={p.value} className={`cursor-pointer rounded-xl border p-3 ${intake.purpose === p.value ? 'border-brand bg-surface-alt' : 'border-line hover:border-content-muted'}`}>
                  <input type="radio" name="intake-purpose" className="sr-only" checked={intake.purpose === p.value}
                    onChange={() => setIntake({ ...intake, purpose: p.value })} />
                  <span className="block text-label font-bold text-content">{p.label}</span>
                  <span className="text-caption text-content-muted">{p.hint}</span>
                </label>
              ))}
            </fieldset>

            {([['make', 'Make'], ['model', 'Model'], ['year', 'Model year'], ['mileage', 'Mileage (km)'], ['asking_price', 'Asking or valuation (RWF)']] as const).map(([key, label]) => (
              <label key={key} className="text-label font-semibold text-content">{label}
                <input value={intake[key]} onChange={(e) => setIntake({ ...intake, [key]: e.target.value })}
                  required={['make', 'model', 'year'].includes(key)}
                  inputMode={['year', 'mileage', 'asking_price'].includes(key) ? 'numeric' : 'text'}
                  className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:border-content-muted focus:outline-none" />
              </label>
            ))}
            <label className="text-label font-semibold text-content sm:col-span-2">Notes
              <textarea value={intake.notes} onChange={(e) => setIntake({ ...intake, notes: e.target.value })} rows={2}
                placeholder="Anything the inspection team should know before the vehicle arrives."
                className="mt-1.5 w-full rounded-xl border border-line bg-surface p-3 font-normal focus:border-content-muted focus:outline-none" />
            </label>
            <button disabled={actionId === 'intake'
              || (!intake.seller_id && !(intake.new_name.trim() && intake.new_email.trim()))}
              className="rounded-xl bg-brand px-4 py-3 text-label font-bold text-brand-on disabled:opacity-50 sm:col-span-2">
              {actionId === 'intake' ? 'Filing…' : 'File the submission'}
            </button>
          </form>
        </Card>
      ) : null}

      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1"><span className="sr-only">Search submissions</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted"><Icon name="search" size={16} /></span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search vehicle, seller, email, or submission ID"
              className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-label text-content focus:border-content-muted focus:outline-none" />
          </label>
          <label><span className="sr-only">Sort submissions</span>
            <select value={order} onChange={(e) => setOrder(e.target.value as 'oldest' | 'newest')}
              className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-label font-semibold text-content focus:outline-none sm:w-48">
              <option value="oldest">Oldest waiting first</option><option value="newest">Newest first</option>
            </select>
          </label>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === t ? 'bg-brand text-brand-on' : 'bg-surface text-gray-600 border border-gray-200 hover:border-brand'
            }`}
          >
            {t === 'all' ? 'All' : t.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => load(tab)} />
      ) : loading ? (
        <LoadingState />
      ) : visible.length === 0 ? (
        <EmptyState icon="document" title={items.length ? 'No submissions match' : 'Nothing in this queue'} description={items.length ? 'Try a different vehicle, seller, email, or ID.' : 'No submissions are sitting at this stage.'} />
      ) : (
        <div className="space-y-4">
          {visible.map((sub) => {
            const waiting = age(sub)
            return (
            <div key={sub.id} id={`row-${sub.id}`} className={`bg-surface rounded-xl border border-gray-100 shadow-sm p-5 ${focusProps(sub.id).className}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-900">
                      {sub.year} {sub.make} {sub.model}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[sub.status] || 'bg-gray-100 text-gray-600'}`}>
                      {sub.status.replace('_', ' ')}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${waiting.overdue ? 'bg-danger-tint text-danger-strong' : 'bg-surface-alt text-content-muted'}`}>{waiting.overdue ? 'Overdue · ' : ''}{waiting.label}</span>
                  </div>
                  <p className="text-sm text-gray-500">{fmtInt(sub.mileage)} km · {sub.condition} · {sub.transmission}</p>
                  <p className="text-sm text-gray-500">Seller: {sub.seller_name} · {fmtDate(sub.submitted_at)}</p>
                  {sub.asking_price && (
                    <p className="text-sm font-medium text-brand mt-1">
                      {fmtMoney(sub.asking_price, sub.currency)}
                    </p>
                  )}
                  {sub.admin_notes && (
                    <p className="text-xs text-gray-400 mt-1 italic">Note: {sub.admin_notes}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex flex-wrap gap-2">
                {sub.status === 'pending' && (
                  <>
                    <button
                      onClick={() => updateStatus(sub.id, 'under_review')}
                      disabled={actionId === sub.id}
                      className="px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                    >
                      Mark Under Review
                    </button>
                    <button
                      onClick={() => setShowNotesFor(sub.id)}
                      className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                      Reject
                    </button>
                  </>
                )}
                {sub.status === 'under_review' && (
                  <>
                    <button
                      onClick={() => {
                        const next = showScheduleFor === sub.id ? null : sub.id
                        setShowScheduleFor(next)
                        if (next && !schedDate) setSchedDate(nextBusinessDay())
                      }}
                      disabled={actionId === sub.id}
                      className="px-3 py-1.5 text-xs font-semibold bg-brand text-brand-on rounded-lg hover:bg-brand-light disabled:opacity-50"
                    >
                      Schedule Inspection
                    </button>
                    <button
                      onClick={() => setShowNotesFor(sub.id)}
                      className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                      Reject
                    </button>
                  </>
                )}
                {sub.status === 'scheduled' && (
                  <p className="text-xs font-medium text-gray-500">
                    Start this appointment from Inspections so the assigned inspector and start time are recorded.
                  </p>
                )}
              </div>

              {/* Inline scheduling form — creates the inspection appointment */}
              {showScheduleFor === sub.id && (
                <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap items-end gap-3">
                  <label className="text-xs text-gray-600">
                    Center
                    <select
                      value={schedCenter}
                      onChange={(e) => setSchedCenter(e.target.value)}
                      className="block mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-surface"
                    >
                      {centers.length ? centers.map((center) => (
                        <option key={center.id} value={center.name}>{center.name}</option>
                      )) : <option value="">No active centers available</option>}
                    </select>
                  </label>
                  <label className="text-xs text-gray-600">
                    Date
                    <input
                      type="date"
                      value={schedDate}
                      onChange={(e) => setSchedDate(e.target.value)}
                      className="block mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-surface"
                    />
                  </label>
                  <label className="text-xs text-gray-600">
                    Time
                    <select
                      value={schedTime}
                      onChange={(e) => setSchedTime(e.target.value)}
                      className="block mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-surface"
                    >
                      {['8:00 AM','9:00 AM','10:00 AM','11:00 AM','1:00 PM','2:00 PM','3:00 PM','4:00 PM'].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    onClick={() => {
                      if (!schedCenter) { toast('No active inspection center is available.', 'error'); return }
                      if (!schedDate) { toast('Pick a date for the appointment first.', 'error'); return }
                      updateStatus(sub.id, 'scheduled', {
                        center: schedCenter,
                        scheduled_date: schedDate,
                        scheduled_time: schedTime,
                      })
                      setShowScheduleFor(null)
                    }}
                    disabled={actionId === sub.id || !schedCenter}
                    className="px-4 py-2 text-xs font-semibold bg-brand text-brand-on rounded-lg hover:bg-brand-light disabled:opacity-50"
                  >
                    Book Appointment
                  </button>
                </div>
              )}

              {/* Reject notes modal */}
              {showNotesFor === sub.id && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs font-medium text-red-700 mb-2">Rejection reason (sent to the seller)</p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full text-sm border border-red-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-red-400"
                    placeholder="e.g. Car mileage not verifiable, missing documents…"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => updateStatus(sub.id, 'rejected', { admin_notes: notes.trim() })}
                      disabled={actionId === sub.id || notes.trim().length < 4}
                      title={notes.trim().length < 4 ? 'Write the reason the seller will receive' : undefined}
                      className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      Confirm Reject
                    </button>
                    <button
                      onClick={() => { setShowNotesFor(null); setNotes('') }}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )})}
        </div>
      )}
    </div>
  )
}
