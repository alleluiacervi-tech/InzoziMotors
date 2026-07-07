'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'

function ListingCreatorForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const submissionId = searchParams.get('submissionId') || ''
  const inspectionId = searchParams.get('inspectionId') || ''

  // Form states
  const [sellerId, setSellerId] = useState('')
  const [title, setTitle] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [mileage, setMileage] = useState('')
  const [fuelType, setFuelType] = useState('Petrol')
  const [transmission, setTransmission] = useState('Automatic')
  const [bodyType, setBodyType] = useState('SUV')
  const [color, setColor] = useState('')
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('Kigali')
  const [driveSide, setDriveSide] = useState('LHD')
  const [vin, setVin] = useState('')
  const [description, setDescription] = useState('')
  const [inspected, setInspected] = useState(true)
  const [inspectionScore, setInspectionScore] = useState('0')

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Auto-fill from completed inspection if parameter is set
  useEffect(() => {
    if (inspectionId) {
      setLoading(true)
      api.getInspection(inspectionId)
        .then((data) => {
          setSellerId(data.seller_id || '')
          setMake(data.sub_make || '')
          setModel(data.sub_model || '')
          setYear(String(data.sub_year || ''))
          setMileage(String(data.sub_mileage || ''))
          setColor(data.sub_color || '')
          setTransmission(data.sub_transmission || 'Automatic')
          setFuelType(data.sub_fuel_type || 'Petrol')
          setBodyType(data.sub_body_type || 'SUV')
          setPrice(String(data.sub_asking_price || ''))
          setInspectionScore(String(data.score || '0'))
          setInspected(true)
          
          // Generate draft title
          const generatedTitle = `${data.sub_year || ''} ${data.sub_make || ''} ${data.sub_model || ''}`.trim()
          setTitle(generatedTitle)
        })
        .catch((e) => alert('Failed to load inspection details: ' + e.message))
        .finally(() => setLoading(false))
    }
  }, [inspectionId])

  // Automatically update title when make, model, or year changes
  useEffect(() => {
    if (!inspectionId) {
      setTitle(`${year} ${make} ${model}`.trim())
    }
  }, [make, model, year, inspectionId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sellerId || !make || !model || !year || !mileage || !price || !title) {
      alert('Please fill in all required fields.')
      return
    }
    setSubmitting(true)
    try {
      const car = await api.createCar({
        seller_id: sellerId,
        title,
        make,
        model,
        year: parseInt(year),
        mileage: parseInt(mileage),
        fuel_type: fuelType,
        transmission,
        body_type: bodyType,
        color,
        price: parseInt(price),
        location,
        drive_side: driveSide,
        vin,
        description,
        inspected,
        inspection_score: parseInt(inspectionScore),
        submission_id: submissionId || undefined,
        images: [], // photographer will upload in the next step
      })
      
      alert('Listing created successfully! Proceeding to photo upload.')
      router.push(`/listings/${car.id}/photos`)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-gray-400 text-sm">Pre-filling listing from inspection report…</div>
  }

  return (
    <div className="max-w-2xl bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Create Car Listing</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Core details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Seller User ID *</label>
            <input
              type="text"
              required
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
              placeholder="e.g. uuid-of-seller"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Listing Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 2020 Toyota RAV4 XLE AWD"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand bg-gray-50"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Make *</label>
            <input
              type="text"
              required
              value={make}
              onChange={(e) => setMake(e.target.value)}
              placeholder="e.g. Toyota"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Model *</label>
            <input
              type="text"
              required
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. RAV4"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Year *</label>
            <input
              type="number"
              required
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 2020"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        {/* Specs */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Mileage (km) *</label>
            <input
              type="number"
              required
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              placeholder="e.g. 45000"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Transmission *</label>
            <select
              value={transmission}
              onChange={(e) => setTransmission(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="Automatic">Automatic</option>
              <option value="Manual">Manual</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Fuel Type *</label>
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="Petrol">Petrol</option>
              <option value="Diesel">Diesel</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Electric">Electric</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Body Type *</label>
            <select
              value={bodyType}
              onChange={(e) => setBodyType(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="SUV">SUV</option>
              <option value="Sedan">Sedan</option>
              <option value="Hatchback">Hatchback</option>
              <option value="Truck">Truck</option>
              <option value="Coupe">Coupe</option>
              <option value="EV">EV</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Drive Side *</label>
            <select
              value={driveSide}
              onChange={(e) => setDriveSide(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="LHD">LHD (Rwanda standard)</option>
              <option value="RHD">RHD (Japanese import)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Color</label>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="e.g. Silver"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        {/* Pricing, location, VIN */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Price (USD) *</label>
            <input
              type="number"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 26000"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Location *</label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Nyarutarama"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">VIN / Chassis No.</label>
            <input
              type="text"
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="e.g. JTEBF1FV..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        {/* Inspection Details */}
        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-150">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="inspected"
              checked={inspected}
              onChange={(e) => setInspected(e.target.checked)}
              className="rounded text-brand focus:ring-brand h-4 w-4"
            />
            <label htmlFor="inspected" className="text-sm font-semibold text-gray-700">150-Point Inspected</label>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-750 mb-1">Inspection Score (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              disabled={!inspected}
              value={inspectionScore}
              onChange={(e) => setInspectionScore(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand bg-white disabled:opacity-50"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Public Description</label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Introduce details about ownership, trim level, standard packages, active insurance, and overall vehicle condition..."
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        {/* Submissions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-semibold bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-55"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-light disabled:opacity-50"
          >
            {submitting ? 'Creating Listing…' : 'Create & Upload Photos'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NewListingPage() {
  return (
    <Suspense fallback={<div className="text-gray-400 text-sm">Loading form components…</div>}>
      <ListingCreatorForm />
    </Suspense>
  )
}
