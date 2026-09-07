'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { JourneyRail } from '@/components/JourneyRail'
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

  // Editable fields
  const [title, setTitle]             = useState('')
  const [sellerId, setSellerId]       = useState('')
  const [make, setMake]               = useState('')
  const [model, setModel]             = useState('')
  const [year, setYear]               = useState('')
  const [correcting, setCorrecting]   = useState(false)
  const [correctionReason, setCorrectionReason] = useState('')
  const [price, setPrice]             = useState('')
  const [currency, setCurrency]       = useState<'RWF' | 'USD'>('RWF')
  const [vehicleId, setVehicleId]     = useState('')
  const [mileage, setMileage]         = useState('')
  const [fuelType, setFuelType]       = useState('')
  const [transmission, setTransmission] = useState('')
  const [bodyType, setBodyType]       = useState('')
  const [location, setLocation]       = useState('')
  const [color, setColor]             = useState('')
  const [driveSide, setDriveSide]     = useState('LHD')
  const [vin, setVin]                 = useState('')
  const [description, setDescription] = useState('')
  const [reviewNotes, setReviewNotes] = useState('')
  const [images, setImages]           = useState('')

  useEffect(() => {
    api.getCar(id)
      .then((data) => {
        setCar(data)
        setTitle(data.title || '')
        setSellerId(data.seller_id || '')
        setMake(data.make || '')
        setModel(data.model || '')
        setYear(String(data.year ?? ''))
        setPrice(String(data.price ?? ''))
        setCurrency(data.currency === 'USD' ? 'USD' : 'RWF')
        setVehicleId(data.vehicle_id || '')
        setMileage(String(data.mileage ?? ''))
        setFuelType(data.fuel_type || '')
        setTransmission(data.transmission || '')
        setBodyType(data.body_type || '')
        setLocation(data.location || '')
        setColor(data.color || '')
        setDriveSide(data.drive_side || 'LHD')
        setVin(data.vin || data.vin_masked || '')
        setDescription(data.description || '')
        setReviewNotes(data.review_notes || '')
        setImages((data.images || []).join('\n'))
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const imageList = () => images.split('\n').map((s) => s.trim()).filter(Boolean)
  const priceChanged = !!car && (Number(price) !== Number(car.price) || currency !== (car.currency || 'RWF'))

  async function correctIdentity() {
    const newYear = parseInt(year, 10)
    if (!make.trim() || !model.trim()) { setError('Give the make and the model.'); return }
    if (!Number.isFinite(newYear) || newYear < 1900 || newYear > new Date().getFullYear() + 1) {
      setError('Enter a valid vehicle year.'); return
    }
    setSaving(true); setError('')
    try {
      await api.correctVehicleIdentity(String(id), {
        make: make.trim(), model: model.trim(), year: newYear, reason: correctionReason.trim(),
      })
      setCorrecting(false); setCorrectionReason('')
      setError('')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally { setSaving(false) }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    const newPrice = parseInt(price, 10)
    if (!Number.isFinite(newPrice) || newPrice < 0) {
      setError(`Price must be a positive number in ${currency === 'USD' ? 'US Dollars' : 'Rwandan Francs'}.`);
      return
    }
    const newMileage = parseInt(mileage, 10)
    if (!Number.isFinite(newMileage) || newMileage < 0) { setError('Mileage must be a non-negative number of km.'); return }

    const payload: Record<string, any> = {}
    if (title.trim() !== (car.title || ''))               payload.title = title.trim()
    if (sellerId.trim() !== (car.seller_id || ''))        payload.seller_id = sellerId.trim()
    if (newPrice !== Number(car.price))                   payload.price = newPrice
    if (currency !== (car.currency || 'RWF'))             payload.currency = currency
    if (vehicleId.trim() !== (car.vehicle_id || ''))      payload.vehicle_id = vehicleId.trim() || null
    if (newMileage !== Number(car.mileage))               payload.mileage = newMileage
    if (fuelType.trim() !== (car.fuel_type || ''))        payload.fuel_type = fuelType.trim()
    if (transmission.trim() !== (car.transmission || '')) payload.transmission = transmission.trim()
    if (bodyType.trim() !== (car.body_type || ''))        payload.body_type = bodyType.trim()
    if (location.trim() !== (car.location || ''))         payload.location = location.trim()
    if (color.trim() !== (car.color || ''))               payload.color = color.trim()
    if (driveSide !== (car.drive_side || 'LHD'))          payload.drive_side = driveSide
    if (vin.trim() !== (car.vin || ''))                   payload.vin = vin.trim()
    if (description !== (car.description || ''))          payload.description = description
    if (reviewNotes !== (car.review_notes || ''))         payload.review_notes = reviewNotes
    if (imageList().join('\n') !== (car.images || []).join('\n')) payload.images = imageList()

    if (!Object.keys(payload).length) { setError('Nothing changed.'); return }

    setSaving(true)
    setError('')
    try {
      await api.updateCar(String(id), payload)
      router.push('/listings')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading)       return <div className="text-gray-400 text-sm">Loading listing…</div>
  if (!car && error) return <div className="text-red-600 text-sm">Error: {error}</div>
  if (!car)          return <div className="text-red-600 text-sm">Listing not found.</div>

  return (
    <div className="max-w-4xl space-y-6">
      <JourneyRail subjectType="car" id={id} className="mb-5" />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Edit Listing</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {car.year} {car.make} {car.model} · <span className="capitalize font-semibold">{car.status}</span> · {car.views || 0} views
            </p>
          </div>

          <Link
            href={`/listings/${id}/photos`}
            className="px-3.5 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 whitespace-nowrap"
          >
            Photos ({car.images?.length || 0})
          </Link>
        </div>

        {/* Identity Correction Block */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">Inspected Vehicle Ground Truth</p>
              <p className="mt-0.5 text-sm font-semibold text-gray-900">{[year, make, model].filter(Boolean).join(' ')}</p>
              <p className="mt-1 text-[11px] text-gray-500 leading-relaxed">
                Bound to the certified inspection. Correcting it updates the listing and inspected submission in one transaction.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCorrecting(!correcting)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 hover:bg-gray-50"
            >
              {correcting ? 'Cancel' : 'Correct vehicle details'}
            </button>
          </div>

          {correcting && (
            <div className="mt-3 grid gap-2.5 sm:grid-cols-4">
              <input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Make" className={inputCls} />
              <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Model" className={inputCls} />
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year" className={inputCls} />
              <input
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="Audit Reason for Correction"
                className={inputCls}
              />
              <button
                type="button"
                onClick={correctIdentity}
                disabled={saving || correctionReason.trim().length < 4}
                className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white disabled:opacity-50 sm:col-span-4 hover:bg-brand-light"
              >
                {saving ? 'Saving…' : 'Confirm & Save Identity Correction'}
              </button>
            </div>
          )}
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

          {/* Pricing & Multi-Currency Block */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700">Listing Price *</label>
                {/* Currency Segmented Toggle */}
                <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setCurrency('RWF')}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all ${
                      currency === 'RWF' ? 'bg-ink-900 text-white shadow-xs' : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    RWF
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency('USD')}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all ${
                      currency === 'USD' ? 'bg-ink-900 text-white shadow-xs' : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    USD ($)
                  </button>
                </div>
              </div>
              <input
                type="number"
                step={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={currency === 'USD' ? 'e.g. 22000' : 'e.g. 28000000'}
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

          {/* Price Change Warning */}
          <div className={`rounded-xl border p-3.5 text-xs ${
            priceChanged ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-gray-50 border-gray-200 text-gray-500'
          }`}>
            <p className="font-bold mb-0.5">
              {priceChanged
                ? `Price adjustment: ${car.currency || 'RWF'} ${Number(car.price).toLocaleString()} → ${currency} ${Number(price || 0).toLocaleString()}`
                : 'Permanent Public Price History'}
            </p>
            <p className="text-[11px] leading-relaxed">
              Price adjustments are permanently recorded to historical market intelligence charts and alert interested buyers.
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

          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className={labelCls}>Fuel Type</label><input value={fuelType} onChange={(e) => setFuelType(e.target.value)} placeholder="Petrol, Diesel, Hybrid…" className={inputCls} /></div>
            <div><label className={labelCls}>Transmission</label><input value={transmission} onChange={(e) => setTransmission(e.target.value)} placeholder="Automatic, Manual…" className={inputCls} /></div>
            <div><label className={labelCls}>Body Type</label><input value={bodyType} onChange={(e) => setBodyType(e.target.value)} placeholder="SUV, Sedan, Hatchback…" className={inputCls} /></div>
          </div>

          {/* VIN & Canonical Vehicle Registry Binding */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>VIN / Chassis Number</label>
              <input value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())} className={inputCls} />
              <p className="mt-1 text-[11px] text-gray-400">Normalizes automatically. Displayed publicly with zero-leak masking.</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700">Canonical Vehicle Binding (UUID)</label>
                {vehicleId ? (
                  <span className="text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                    Linked to Registry
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    Unlinked
                  </span>
                )}
              </div>
              <input
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                className={`${inputCls} font-mono text-xs`}
              />
              <p className="mt-1 text-[11px] text-gray-400">Binds this marketplace listing to canonical vehicle specs & history.</p>
            </div>
          </div>

          {/* Seller Assignment */}
          <div>
            <label className={labelCls}>Assigned Seller Account ID</label>
            <input value={sellerId} onChange={(e) => setSellerId(e.target.value)} className={inputCls} />
            <p className="mt-1 text-[11px] text-gray-400">Reassignment requires an active, identity-verified seller account.</p>
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
            <label className={labelCls}>Internal Review Notes (Admin Only)</label>
            <textarea rows={3} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} className={inputCls} />
            <p className="mt-1 text-xs text-gray-400">Private operational remarks. Never visible to buyers.</p>
          </div>

          <div>
            <label className={labelCls}>Image URLs (One per line)</label>
            <textarea
              rows={3}
              value={images}
              onChange={(e) => setImages(e.target.value)}
              className={inputCls}
            />
            <p className="text-xs text-gray-400 mt-1">First URL serves as listing hero card thumbnail.</p>
          </div>

          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => router.push('/listings')}
              className="px-4 py-2 text-xs font-bold bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-xs font-bold bg-brand text-white rounded-xl hover:bg-brand-light disabled:opacity-50 shadow-sm"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
