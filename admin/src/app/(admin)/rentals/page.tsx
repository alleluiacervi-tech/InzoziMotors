'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { EmptyState, ErrorState, LoadingState, fmtMoney } from '@/components/ui'

const STATUS_COLORS: Record<string, string> = {
  upcoming:  'bg-info-tint text-info',
  active:    'bg-success-tint text-success',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-gray-100 text-gray-500',
}

interface RentalBooking {
  id: string
  booking_ref: string
  car_title: string
  renter_name: string
  renter_phone: string | null
  start_date: string
  days: number
  center: string | null
  total: number
  currency: string
  status: 'upcoming' | 'active' | 'completed' | 'cancelled'
  pickup_record: any
  return_record: any
}

export default function RentalsPage() {
  const [tab, setTab]           = useState<'upcoming' | 'active' | 'completed' | 'cancelled'>('upcoming')
  const [items, setItems]       = useState<RentalBooking[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]             = useState<unknown>(null)
  const [actionId, setActionId] = useState<string | null>(null)

  async function load(s: string) {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getRentalBookings(s)
      setItems(data)
    } catch (e: any) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(tab) }, [tab])

  async function transition(id: string, status: 'active' | 'completed' | 'cancelled', confirmMsg: string) {
    if (!window.confirm(confirmMsg)) return
    setActionId(id)
    try {
      await api.updateRentalBookingStatus(id, status)
      load(tab)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActionId(null)
    }
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {(['upcoming', 'active', 'completed', 'cancelled'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
              tab === t ? 'bg-brand text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-brand'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => load(tab)} />
      ) : loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState icon="calendar" title="No bookings" description={`No ${tab} rental bookings.`} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3 font-medium">Ref</th>
                <th className="px-4 py-3 font-medium">Car</th>
                <th className="px-4 py-3 font-medium">Renter</th>
                <th className="px-4 py-3 font-medium">Start</th>
                <th className="px-4 py-3 font-medium">Center</th>
                <th className="px-4 py-3 font-medium text-right">Total (USD)</th>
                {(tab === 'upcoming' || tab === 'active') && (
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{b.booking_ref}</td>
                  <td className="px-4 py-3 text-gray-900">{b.car_title}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-900">{b.renter_name}</p>
                    {b.renter_phone && <p className="text-xs text-gray-500">{b.renter_phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {b.start_date}
                    <span className="text-xs text-gray-400"> · {b.days} day{b.days === 1 ? '' : 's'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.center || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                    {fmtMoney(b.total, b.currency)}
                  </td>
                  {(tab === 'upcoming' || tab === 'active') && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        {b.status === 'upcoming' && (
                          <>
                            <button
                              onClick={() => transition(b.id, 'active', 'Check the renter in? The booking becomes ACTIVE.')}
                              disabled={actionId === b.id}
                              className="px-2 py-1 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                            >
                              Check In
                            </button>
                            <button
                              onClick={() => transition(b.id, 'cancelled', 'Cancel this booking?')}
                              disabled={actionId === b.id}
                              className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {b.status === 'active' && (
                          <button
                            onClick={() => transition(b.id, 'completed', 'Check the car back in? The booking becomes COMPLETED.')}
                            disabled={actionId === b.id}
                            className="px-2 py-1 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                          >
                            Check Out
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
