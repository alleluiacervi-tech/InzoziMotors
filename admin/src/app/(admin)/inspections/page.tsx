'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { api, type CenterRow } from '@/lib/api'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui'
import { QueueSearch } from '@/components/QueueSearch'
import { useToast } from '@/components/feedback'
import { useFocusRow } from '@/components/useFocusRow'

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

export default function InspectionsPage() {
  // Arrives here from an Action Center item; marks the row it named.
  const { focusProps } = useFocusRow()
  const toast = useToast()
  const [center, setCenter]   = useState('all')
  const [date, setDate]       = useState(todayISO())
  const [status, setStatus]   = useState('scheduled')
  const [items, setItems]     = useState<any[]>([])
  const [centers, setCenters] = useState<CenterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]             = useState<unknown>(null)
  const [query, setQuery]             = useState('')
  const [preparingReport, setPreparingReport] = useState<string | null>(null)

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
  const visible = useMemo(() => { const q = query.trim().toLowerCase(); return items.filter((insp) => !q || [insp.make, insp.model, insp.year, insp.seller_name, insp.center, insp.id, insp.submission_id].some((v) => String(v || '').toLowerCase().includes(q))) }, [items, query])

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
      <h1 className="text-xl font-bold text-gray-900 mb-6">Inspections</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Center</label>
          <select
            value={center}
            onChange={(e) => setCenter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="all">All Centers</option>
            {centers.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="complete">Complete</option>
          </select>
        </div>
      </div>
      <QueueSearch value={query} onChange={setQuery} resultCount={visible.length} placeholder="Search vehicle, seller, center, inspection, or submission ID" />

      {error ? (
        <ErrorState error={error} onRetry={() => load()} />
      ) : loading ? (
        <LoadingState />
      ) : visible.length === 0 ? (
        <EmptyState icon="settings" title="No inspections match" description="Try clearing the center, date or status filter." />
      ) : (
        <div className="space-y-3">
          {visible.map((insp) => (
            <div key={insp.id} id={`row-${insp.id}`} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4 ${focusProps(insp.id).className}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-gray-900 text-sm">
                    {insp.year} {insp.make} {insp.model}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[insp.status] || 'bg-gray-100 text-gray-600'}`}>
                    {insp.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{insp.center} · {insp.scheduled_date} at {insp.scheduled_time}</p>
                <p className="text-xs text-gray-500">Seller: {insp.seller_name}</p>
              </div>
              {insp.status !== 'complete' && (
                <Link
                  href={`/inspections/${insp.id}`}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold bg-brand text-white rounded-lg hover:bg-brand-light"
                >
                  {insp.status === 'scheduled' ? 'Start Checklist' : 'Continue'}
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
                  ) : (
                    <Link
                      href={`/listings/new?submissionId=${insp.submission_id}&inspectionId=${insp.id}`}
                      className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold bg-brand text-white rounded-lg hover:bg-brand-light"
                    >
                      Create Listing
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
