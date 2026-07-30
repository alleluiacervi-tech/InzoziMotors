'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { fmtUSD } from '@/components/ui'

const STATUS_TABS = ['all', 'under_review', 'scheduled', 'inspecting', 'inspected', 'live', 'rejected']

const STATUS_COLORS: Record<string, string> = {
  pending:      'bg-warning-tint text-warning-text',
  under_review: 'bg-warning-tint text-warning-text',
  scheduled:    'bg-info-tint text-info',
  inspecting:   'bg-info-tint text-info',
  rejected:     'bg-danger-tint text-danger-strong',
}

export default function SubmissionsPage() {
  const [tab, setTab]               = useState('under_review')
  const [items, setItems]           = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [actionId, setActionId]     = useState<string | null>(null)
  const [notes, setNotes]           = useState('')
  const [showNotesFor, setShowNotesFor] = useState<string | null>(null)
  const [showScheduleFor, setShowScheduleFor] = useState<string | null>(null)
  const [schedCenter, setSchedCenter] = useState('Nyarutarama Center')
  const [schedDate, setSchedDate]     = useState('')
  const [schedTime, setSchedTime]     = useState('10:00 AM')

  async function load(status: string) {
    setLoading(true)
    try {
      const data = await api.submissions(status === 'all' ? undefined : status)
      setItems(data)
    } catch (e: any) {
      console.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(tab) }, [tab])

  async function updateStatus(id: string, status: string, extra: any = {}) {
    setActionId(id)
    try {
      await api.updateSubmission(id, { status, ...extra })
      load(tab)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActionId(null)
      setShowNotesFor(null)
      setNotes('')
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Submissions</h1>

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

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-gray-400 text-sm bg-white rounded-xl border border-gray-100 p-8 text-center">
          No submissions in this category.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((sub) => (
            <div key={sub.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-900">
                      {sub.year} {sub.make} {sub.model}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[sub.status] || 'bg-gray-100 text-gray-600'}`}>
                      {sub.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{sub.mileage?.toLocaleString()} km · {sub.condition} · {sub.transmission}</p>
                  <p className="text-sm text-gray-500">Seller: {sub.seller_name} · {new Date(sub.submitted_at).toLocaleDateString()}</p>
                  {sub.asking_price && (
                    <p className="text-sm font-medium text-brand mt-1">
                      {fmtUSD(sub.asking_price)}
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
                  <button
                    onClick={() => updateStatus(sub.id, 'inspecting')}
                    disabled={actionId === sub.id}
                    className="px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                  >
                    Mark Inspecting
                  </button>
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
                      <option>Nyarutarama Center</option>
                      <option>Kicukiro Center</option>
                      <option>Kimironko Center</option>
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
                      if (!schedDate) { alert('Pick a date'); return }
                      updateStatus(sub.id, 'scheduled', {
                        center: schedCenter,
                        scheduled_date: schedDate,
                        scheduled_time: schedTime,
                      })
                      setShowScheduleFor(null)
                    }}
                    disabled={actionId === sub.id}
                    className="px-4 py-2 text-xs font-semibold bg-brand text-white rounded-lg hover:bg-brand-light disabled:opacity-50"
                  >
                    Book Appointment
                  </button>
                </div>
              )}

              {/* Reject notes modal */}
              {showNotesFor === sub.id && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs font-medium text-red-700 mb-2">Rejection reason (shown to seller)</p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full text-sm border border-red-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-red-400"
                    placeholder="e.g. Car mileage not verifiable, missing documents…"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => updateStatus(sub.id, 'rejected', { admin_notes: notes })}
                      disabled={actionId === sub.id}
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
          ))}
        </div>
      )}
    </div>
  )
}
