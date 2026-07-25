'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

const STATUSES = ['live', 'reserved', 'sold', 'under_review', 'scheduled', 'inspecting', 'archived']
const STATUS_COLORS: Record<string, string> = {
  live:         'bg-green-100 text-green-700',
  reserved:     'bg-purple-100 text-purple-700',
  sold:         'bg-gray-100 text-gray-600',
  under_review: 'bg-amber-100 text-amber-700',
  scheduled:    'bg-indigo-100 text-indigo-700',
  inspecting:   'bg-blue-100 text-blue-700',
}

export default function ListingsPage() {
  const [statusFilter, setStatusFilter] = useState('live')
  const [items, setItems]               = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [actionId, setActionId]         = useState<string | null>(null)

  async function load(s: string) {
    setLoading(true)
    try {
      const data = await api.cars({ status: s })
      setItems(data)
    } catch (e: any) {
      console.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(statusFilter) }, [statusFilter])

  async function updateStatus(id: string, status: string) {
    setActionId(id)
    try {
      await api.updateCarStatus(id, status)
      load(statusFilter)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActionId(null)
    }
  }

  async function feature(id: string) {
    if (!window.confirm('Feature this listing for 7 days? It will be boosted to the top of the feed.')) return
    setActionId(id)
    try {
      await api.featureCar(id, 7)
      load(statusFilter)
    } catch (e: any) {
      alert(e.message)
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

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-gray-400 text-sm bg-white rounded-xl border border-gray-100 p-8 text-center">
          No listings with status "{statusFilter}".
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((car) => (
            <div key={car.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Thumbnail */}
              {car.images?.[0] ? (
                <img src={car.images[0]} alt={car.model} className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-4xl">🚗</div>
              )}

              <div className="p-4">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="font-semibold text-gray-900 text-sm truncate">{car.year} {car.make} {car.model}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isFeatured(car) && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-600">
                        ★ Featured
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[car.status] || 'bg-gray-100 text-gray-600'}`}>
                      {car.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">{car.mileage?.toLocaleString()} km · {car.location}</p>
                <p className="text-sm font-bold text-brand mt-1">RWF {Number(car.price).toLocaleString()}</p>
                <p className="text-xs text-gray-400">{car.views || 0} views</p>

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
                      className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                    >
                      Photos ({car.images?.length || 0})
                    </Link>
                  )}
                  {car.status === 'live' && !isFeatured(car) && (
                    <button
                      onClick={() => feature(car.id)}
                      disabled={actionId === car.id}
                      className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 disabled:opacity-50"
                    >
                      Feature
                    </button>
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
                  {car.status === 'reserved' && (
                    <button
                      onClick={() => updateStatus(car.id, 'live')}
                      disabled={actionId === car.id}
                      className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 disabled:opacity-50"
                    >
                      Un-reserve
                    </button>
                  )}
                  {(car.status === 'live' || car.status === 'reserved' || car.status === 'under_review') && (
                    <button
                      onClick={() => {
                        if (window.confirm('Remove this listing?')) updateStatus(car.id, 'removed')
                      }}
                      disabled={actionId === car.id}
                      className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
