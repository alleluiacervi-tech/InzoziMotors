'use client'

import { useEffect, useMemo, useState } from 'react'
import { api, type CenterRow } from '@/lib/api'
import { Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader, fmtMoney } from '@/components/ui'
import { useToast } from '@/components/feedback'
import { useFocusRow } from '@/components/useFocusRow'

const STATUS_TABS = ['all', 'under_review', 'scheduled', 'inspecting', 'inspected', 'live', 'rejected']

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

  return (
    <div>
      <PageHeader title="Submissions" description="Review the oldest seller requests first and keep the 24-hour response promise visible." />

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
              tab === t ? 'bg-brand text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-brand'
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
            <div key={sub.id} id={`row-${sub.id}`} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 ${focusProps(sub.id).className}`}>
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
                  <p className="text-sm text-gray-500">{sub.mileage?.toLocaleString()} km · {sub.condition} · {sub.transmission}</p>
                  <p className="text-sm text-gray-500">Seller: {sub.seller_name} · {new Date(sub.submitted_at).toLocaleDateString()}</p>
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
                      onClick={() => setShowScheduleFor(showScheduleFor === sub.id ? null : sub.id)}
                      disabled={actionId === sub.id}
                      className="px-3 py-1.5 text-xs font-semibold bg-brand text-white rounded-lg hover:bg-brand-light disabled:opacity-50"
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
                      className="block mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
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
                      className="block mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
                    />
                  </label>
                  <label className="text-xs text-gray-600">
                    Time
                    <select
                      value={schedTime}
                      onChange={(e) => setSchedTime(e.target.value)}
                      className="block mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
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
                    className="px-4 py-2 text-xs font-semibold bg-brand text-white rounded-lg hover:bg-brand-light disabled:opacity-50"
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
