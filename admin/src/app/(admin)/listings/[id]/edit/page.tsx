'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand'
const labelCls = 'block text-xs font-semibold text-gray-700 mb-1'

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [car, setCar]         = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  // Only the fields in the EDITABLE list of PATCH /cars/:id
  const [title, setTitle]             = useState('')
  const [price, setPrice]             = useState('')
  const [mileage, setMileage]         = useState('')
  const [location, setLocation]       = useState('')
  const [color, setColor]             = useState('')
  const [driveSide, setDriveSide]     = useState('LHD')
  const [description, setDescription] = useState('')
  const [images, setImages]           = useState('')

  useEffect(() => {
    api.getCar(id)
      .then((data) => {
        setCar(data)
        setTitle(data.title || '')
        setPrice(String(data.price ?? ''))
        setMileage(String(data.mileage ?? ''))
        setLocation(data.location || '')
        setColor(data.color || '')
        setDriveSide(data.drive_side || 'LHD')
        setDescription(data.description || '')
        setImages((data.images || []).join('\n'))
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const imageList = () => images.split('\n').map((s) => s.trim()).filter(Boolean)
  const priceChanged = !!car && Number(price) !== Number(car.price)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim())                                  { setError('Title is required.'); return }
    const newPrice = parseInt(price, 10)
    if (!Number.isFinite(newPrice) || newPrice < 0)     { setError('Price must be a whole number of USD.'); return }
    const newMileage = parseInt(mileage, 10)
    if (!Number.isFinite(newMileage) || newMileage < 0) { setError('Mileage must be a whole number of km.'); return }

    // Send only what actually changed — an untouched price must not write price history.
    const payload: Record<string, any> = {}
    if (title.trim() !== (car.title || ''))               payload.title = title.trim()
    if (newPrice !== Number(car.price))                   payload.price = newPrice
    if (newMileage !== Number(car.mileage))               payload.mileage = newMileage
    if (location.trim() !== (car.location || ''))         payload.location = location.trim()
    if (color.trim() !== (car.color || ''))               payload.color = color.trim()
    if (driveSide !== (car.drive_side || 'LHD'))          payload.drive_side = driveSide
    if (description !== (car.description || ''))          payload.description = description
    if (imageList().join('\n') !== (car.images || []).join('\n')) payload.images = imageList()

    if (!Object.keys(payload).length) { setError('Nothing changed.'); return }

    setSaving(true)
    setError('')
    try {
      await api.updateCar(id, payload)
      router.push('/listings')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading)      return <div className="text-gray-400 text-sm">Loading listing…</div>
  if (!car && error) return <div className="text-red-600 text-sm">Error: {error}</div>
  if (!car)         return <div className="text-red-600 text-sm">Listing not found.</div>

  return (
    <div className="max-w-2xl bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Edit Listing</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {car.year} {car.make} {car.model} · <span className="capitalize">{car.status}</span> · {car.views || 0} views
          </p>
        </div>
        <Link
          href={`/listings/${id}/photos`}
          className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 whitespace-nowrap"
        >
          Photos ({car.images?.length || 0})
        </Link>
      </div>

      <form onSubmit={save} className="space-y-5">
        <div>
          <label className={labelCls}>Listing Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 2020 Toyota RAV4 XLE AWD"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Price (USD) *</label>
            <input
              type="number"
              step={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Mileage (km) *</label>
            <input
              type="number"
              step={1}
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Nyarutarama"
              className={inputCls}
            />
          </div>
        </div>

        {/* The backend writes price_history and pushes a price-drop alert — say so before they save */}
        <div className={`rounded-xl border p-4 text-xs ${priceChanged ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
          <p className="font-semibold mb-1">
            {priceChanged
              ? `Price change: USD ${Number(car.price).toLocaleString()} → ${Number(price || 0).toLocaleString()}`
              : 'Price changes are permanent and public'}
          </p>
          <p>
            Saving a new price records a price-history entry on the listing and notifies every buyer who
            saved this car{car.saves_count ? ` (${car.saves_count} saved)` : ''}. It cannot be undone quietly.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Color</label>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="e.g. Silver"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Drive Side</label>
            <select value={driveSide} onChange={(e) => setDriveSide(e.target.value)} className={inputCls}>
              <option value="LHD">LHD (Rwanda standard)</option>
              <option value="RHD">RHD (Japanese import)</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Public Description</label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Image URLs (one per line)</label>
          <textarea
            rows={3}
            value={images}
            onChange={(e) => setImages(e.target.value)}
            className={inputCls}
          />
          <p className="text-xs text-gray-400 mt-1">
            Order sets the gallery order — the first URL is the thumbnail. Use the Photos page to upload new shots.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => router.push('/listings')}
            className="px-4 py-2 text-sm font-semibold bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-light disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
