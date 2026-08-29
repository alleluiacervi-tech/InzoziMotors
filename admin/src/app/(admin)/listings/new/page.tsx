'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useToast } from '@/components/feedback'
import { SelectOrType } from '@/components/SelectOrType'

// The common answers, not the only permitted ones — each of these fields offers
// an "Other" that reveals a text box. The old lists were four items long, so an
// admin publishing a wagon or a plug-in hybrid had to record something untrue.
// Nothing in the database constrains these columns.
const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric'] as const
const BODY_TYPES = ['SUV', 'Sedan', 'Hatchback', 'Pickup', 'Coupe', 'Van', 'Wagon', 'Minibus'] as const

// ─────────────────────────────────────────────────────────────────────────────
// Choosing the inspection is step one, not an optional query string.
//
// A listing is bound to its inspection in exactly one place: the create call,
// and only when it carries the submission id. Nothing anywhere can link them
// afterwards. So a listing started without that id can never be published —
// not because publication is unsafe, but because the evidence it needs can
// never be attached, and the only remedy is to archive it and retype
// everything including the photographs.
//
// The blank form was reachable from the dashboard's primary button, its
// "Publish an inspected car" tile and the listings header — the three most
// prominent routes in the product all led into work that had to be thrown
// away. This picker makes the binding structural: pick the inspection, and
// the same form opens pre-filled and correctly linked.
// ─────────────────────────────────────────────────────────────────────────────
function InspectionPicker() {
  const router = useRouter()
  const toast = useToast()
  const [rows, setRows] = useState<any[] | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    api.inspections({ status: 'complete' })
      .then((data) => setRows(data.filter((i: any) => i.passed && !i.car_id)))
      .catch((e: any) => { toast('Could not load inspections: ' + e.message, 'error'); setRows([]) })
  }, [])

  const visible = (rows || []).filter((i) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [i.submission_make, i.submission_model, i.submission_year, i.seller_name, i.seller_email]
      .filter(Boolean).join(' ').toLowerCase().includes(q)
  })

  if (rows === null) return <div className="text-sm text-gray-400">Loading passed inspections…</div>

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900">Create a listing</h1>
      <p className="mt-2 text-sm text-gray-500">
        Pick the completed inspection this listing is for. That link is what lets the
        listing be published later — it cannot be added afterwards.
      </p>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-900">No inspection is waiting for a listing</p>
          <p className="mt-2 text-sm text-gray-500">
            A listing needs a completed, passing 150-point inspection that has not been used yet.
            Complete one first and it will appear here.
          </p>
          <Link href="/inspections" className="mt-4 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-deep">
            Go to Inspections
          </Link>
        </div>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by vehicle or seller…"
            className="mt-5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <ul className="mt-3 space-y-2">
            {visible.map((insp) => (
              <li key={insp.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/listings/new?submissionId=${insp.submission_id}&inspectionId=${insp.id}`)}
                  className="flex w-full items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-colors hover:border-brand"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-gray-900">
                      {[insp.submission_year, insp.submission_make, insp.submission_model].filter(Boolean).join(' ') || 'Inspected vehicle'}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-gray-500">
                      {insp.seller_name || insp.seller_email || 'Seller'} · scored {insp.score}/150
                    </span>
                  </span>
                  <span className="flex-shrink-0 text-xs font-bold text-brand">Use this →</span>
                </button>
              </li>
            ))}
          </ul>
          {visible.length === 0 && (
            <p className="mt-4 text-sm text-gray-400">No inspection matches that filter.</p>
          )}
        </>
      )}
    </div>
  )
}

function ListingCreatorForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const toast = useToast()
  const submissionId = searchParams.get('submissionId') || ''
  const inspectionId = searchParams.get('inspectionId') || ''


  // Seller picker — the API requires seller_id; nobody should type a UUID.
  const [sellerId, setSellerId] = useState('')
  const [sellerLabel, setSellerLabel] = useState('')
  const [sellerQuery, setSellerQuery] = useState('')
  const [sellerResults, setSellerResults] = useState<any[]>([])
  const [sellerSearching, setSellerSearching] = useState(false)
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

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Auto-fill from completed inspection if parameter is set
  useEffect(() => {
    if (inspectionId) {
      setLoading(true)
      api.getInspection(inspectionId)
        .then((data) => {
          setSellerId(data.seller_id || '')
          setSellerLabel(data.seller_name || data.seller_email || (data.seller_id ? 'Seller from inspection record' : ''))
          setMake(data.sub_make || '')
          setModel(data.sub_model || '')
          setYear(String(data.sub_year || ''))
          setMileage(String(data.sub_mileage || ''))
          setColor(data.sub_color || '')
          setTransmission(data.sub_transmission || 'Automatic')
          setFuelType(data.sub_fuel_type || 'Petrol')
          setBodyType(data.sub_body_type || 'SUV')
          setPrice(String(data.sub_asking_price || ''))
          
          // Generate draft title
          const generatedTitle = `${data.sub_year || ''} ${data.sub_make || ''} ${data.sub_model || ''}`.trim()
          setTitle(generatedTitle)
        })
        .catch((e) => toast('Failed to load inspection details: ' + e.message, 'error'))
        .finally(() => setLoading(false))
    }
  }, [inspectionId])

  // Automatically update title when make, model, or year changes
  useEffect(() => {
    if (!inspectionId) {
      setTitle(`${year} ${make} ${model}`.trim())
    }
  }, [make, model, year, inspectionId])

  // Debounced seller search against /admin/users
  useEffect(() => {
    const q = sellerQuery.trim()
    if (q.length < 2) { setSellerResults([]); return }
    setSellerSearching(true)
    const t = setTimeout(() => {
      api.searchUsers(q)
        .then(setSellerResults)
        .catch(() => setSellerResults([]))
        .finally(() => setSellerSearching(false))
    }, 300)
    return () => clearTimeout(t)
  }, [sellerQuery])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sellerId || !make || !model || !year || !mileage || !price || !title) {
      toast('Fill in all required fields first.', 'error')
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
        submission_id: submissionId || undefined,
        images: [], // photographer will upload in the next step
      })
      
      toast('Draft created — add a truthful gallery, then publish after every review check passes.', 'success')
      router.push(`/listings/${car.id}/photos`)
    } catch (e: any) {
      toast(e.message, 'error')
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
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Seller *</label>
            {sellerId ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <span className="truncate text-sm font-semibold text-gray-800">{sellerLabel || sellerId}</span>
                <button
                  type="button"
                  onClick={() => { setSellerId(''); setSellerLabel(''); setSellerQuery('') }}
                  className="shrink-0 text-xs font-semibold text-gray-500 hover:text-brand"
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={sellerQuery}
                  onChange={(e) => setSellerQuery(e.target.value)}
                  placeholder="Search by name, email or phone…"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
                />
                {sellerQuery.trim().length >= 2 && (
                  <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                    {sellerSearching ? (
                      <p className="px-3 py-2.5 text-xs text-gray-400">Searching…</p>
                    ) : sellerResults.length === 0 ? (
                      <p className="px-3 py-2.5 text-xs text-gray-400">No matching users.</p>
                    ) : (
                      sellerResults.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setSellerId(u.id)
                            setSellerLabel(`${u.name} · ${u.email}`)
                            setSellerResults([])
                          }}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-gray-50"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-gray-800">{u.name}</span>
                            <span className="block truncate text-xs text-gray-500">{u.email}</span>
                          </span>
                          {u.id_verified === 'approved' && (
                            <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
                              ID verified
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
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

        {/* Make, model and year come from the inspected submission and are shown,
            not typed.

            They used to be free-text inputs prefilled from that submission, so
            fixing a typo, adding a trim level or changing a capital silently
            broke the binding between the listing and its evidence — and the
            only sign was "Listing make, model and year must match the inspected
            submission" at the moment of publishing, an error whose fix lived in
            a record this page never showed. Locking them here is not a
            restriction on the admin; it removes a way to get stranded. A
            genuine correction is on the listing's edit page and changes the
            vehicle and its submission together. */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs font-bold text-gray-900">Vehicle — from the inspection</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {[year, make, model].filter(Boolean).join(' ') || 'Select the inspection above'}
            </p>
            <p className="mt-1 text-[11px] text-gray-500">
              This is what was inspected, so it is what the listing must say. To correct it,
              open the listing after creating it and use <strong>Correct vehicle details</strong>,
              which changes the submission too so the two never disagree.
            </p>
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
            <SelectOrType label="Fuel Type" required value={fuelType} onChange={setFuelType}
              options={FUEL_TYPES} placeholder="e.g. Plug-in hybrid, LPG" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <SelectOrType label="Body Type" required value={bodyType} onChange={setBodyType}
              options={BODY_TYPES} placeholder="e.g. Wagon, Minibus, Convertible" />
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
            <label className="block text-xs font-semibold text-gray-700 mb-1">Price (RWF) *</label>
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

        <div className="rounded-xl border border-info/20 bg-info-tint p-4 text-sm text-content-secondary">
          Inspection state and score come only from a completed inspection record. Creating this listing keeps it under review until the gallery, seller verification and inspection checks pass.
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

/** Which of the two screens this route is. Kept as its own component so each
 *  branch owns a stable set of hooks — picker and form are the same route, so
 *  branching inside one component would change its hook count mid-navigation. */
function NewListingRoute() {
  const submissionId = useSearchParams().get('submissionId') || ''
  return submissionId ? <ListingCreatorForm /> : <InspectionPicker />
}

export default function NewListingPage() {
  return (
    <Suspense fallback={<div className="text-gray-400 text-sm">Loading form components…</div>}>
      <NewListingRoute />
    </Suspense>
  )
}
