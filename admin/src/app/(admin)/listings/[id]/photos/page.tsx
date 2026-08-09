'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Icon } from '@/components/ui'
import { useToast } from '@/components/feedback'

// Pre-defined Encar photography slots (26 required shots)
const PHOTO_GUIDE_SLOTS = [
  // Exterior
  { id: 'ext_front',       label: 'Front Full View',      cat: 'Exterior' },
  { id: 'ext_front_left',  label: 'Front-Left 45° Angle',  cat: 'Exterior' },
  { id: 'ext_left',        label: 'Left Side Profile',    cat: 'Exterior' },
  { id: 'ext_rear_left',   label: 'Rear-Left 45° Angle',   cat: 'Exterior' },
  { id: 'ext_rear',        label: 'Rear Full View',       cat: 'Exterior' },
  { id: 'ext_rear_right',  label: 'Rear-Right 45° Angle',  cat: 'Exterior' },
  { id: 'ext_right',       label: 'Right Side Profile',   cat: 'Exterior' },
  { id: 'ext_front_right', label: 'Front-Right 45° Angle', cat: 'Exterior' },
  
  // Details
  { id: 'det_roof',        label: 'Roof Panel',           cat: 'Details' },
  { id: 'det_underbody',   label: 'Underbody / Chassis',  cat: 'Details' },
  { id: 'det_wheel_fl',    label: 'Front-Left Wheel',     cat: 'Details' },
  { id: 'det_wheel_fr',    label: 'Front-Right Wheel',    cat: 'Details' },
  { id: 'det_wheel_rl',    label: 'Rear-Left Wheel',      cat: 'Details' },
  { id: 'det_wheel_rr',    label: 'Rear-Right Wheel',     cat: 'Details' },
  { id: 'det_tyre_fl',     label: 'Front Tyre Tread',     cat: 'Details' },
  { id: 'det_tyre_rl',     label: 'Rear Tyre Tread',      cat: 'Details' },

  // Under Hood
  { id: 'eng_bay',         label: 'Engine Bay Overall',   cat: 'Engine' },
  { id: 'eng_serial',      label: 'Engine Block Serial',  cat: 'Engine' },

  // Instruments
  { id: 'inst_odo',        label: 'Odometer Reading',     cat: 'Instruments' },
  { id: 'inst_vin',        label: 'VIN Plate / Stamp',    cat: 'Instruments' },

  // Interior
  { id: 'int_dash',        label: 'Dashboard Overview',   cat: 'Interior' },
  { id: 'int_console',     label: 'Infotainment Console', cat: 'Interior' },
  { id: 'int_driver',      label: 'Driver Seat Bolster',  cat: 'Interior' },
  { id: 'int_rear',        label: 'Rear Passenger Bench', cat: 'Interior' },
  { id: 'int_boot',        label: 'Boot / Trunk Space',   cat: 'Interior' },
  { id: 'int_headliner',   label: 'Ceiling Headliner',    cat: 'Interior' },
]

export default function CarPhotosPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [car, setCar] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const toast = useToast()

  async function loadCar() {
    try {
      const data = await api.getCar(id)
      setCar(data)
    } catch (e: any) {
      toast('Failed to load listing: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCar()
  }, [id])

  async function handleFiles(files: FileList) {
    if (files.length === 0) return
    setUploading(true)
    setUploadProgress(`Uploading ${files.length} photo(s)...`)
    
    try {
      const formData = new FormData()
      for (let i = 0; i < files.length; i++) {
        formData.append('photos', files[i])
      }
      
      const res = await api.uploadCarPhotos(id, formData)
      setUploadProgress(`Successfully uploaded ${res.uploaded} file(s)!`)
      setTimeout(() => setUploadProgress(''), 3000)
      loadCar()
    } catch (e: any) {
      toast('Upload failed: ' + e.message, 'error')
      setUploadProgress('')
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  if (loading) return <div className="text-gray-400 text-sm">Loading vehicle details…</div>
  if (!car) return <div className="text-red-600 text-sm">Listing not found.</div>

  const currentCount = car.images?.length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-150 pb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{car.year} {car.make} {car.model}</h1>
          <p className="text-xs text-gray-500">VIN: {car.vin || 'Not provided'} · Status: <span className="capitalize font-semibold text-brand">{car.status}</span></p>
        </div>
        <button
          onClick={() => router.push('/listings')}
          className="px-4 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-light transition-colors"
        >
          Publish & Exit
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Drag & drop upload box */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
              dragActive ? 'border-brand bg-brand/5' : 'border-gray-300 hover:border-brand hover:bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-500"><Icon name="camera" size={24} /></span>
            <p className="text-sm font-semibold text-gray-800">Drag and drop photos here</p>
            <p className="text-xs text-gray-500 mt-1">or click to browse from files (Max 40 files, JPEG/PNG/WebP)</p>
            
            {uploading && (
              <div className="mt-4 flex flex-col items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand mb-2"></div>
                <p className="text-xs text-brand font-medium">{uploadProgress}</p>
              </div>
            )}
            {!uploading && uploadProgress && (
              <p className="text-xs text-green-600 font-semibold mt-3">{uploadProgress}</p>
            )}
          </div>

          {/* Current Gallery */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Uploaded Gallery ({currentCount} photos)</h2>
            {currentCount === 0 ? (
              <p className="text-xs text-gray-400 italic py-4">No images uploaded yet. Dump files inside the upload zone to populate.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {car.images.map((img: string, i: number) => (
                  <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-gray-150 shadow-sm bg-gray-50 group">
                    <img src={img} alt={`Angle ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-[10px] font-bold">Angle {i + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Verification Checksheet Column */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-fit">
          <h2 className="text-sm font-bold text-gray-900 mb-2">Encar Photography Guide</h2>
          <p className="text-xs text-gray-500 mb-4">Ensure your professional shoot matches the required 26 standardization angles.</p>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {['Exterior', 'Details', 'Engine', 'Instruments', 'Interior'].map((cat) => {
              const slots = PHOTO_GUIDE_SLOTS.filter((s) => s.cat === cat)
              return (
                <div key={cat} className="space-y-1.5">
                  <h3 className="text-xs font-bold text-gray-700 border-b border-gray-100 pb-1 uppercase tracking-wide">{cat}</h3>
                  <ul className="space-y-1">
                    {slots.map((s, idx) => {
                      // Check if we have at least this number of photos uploaded
                      const itemIndex = PHOTO_GUIDE_SLOTS.findIndex((x) => x.id === s.id)
                      const isMatched = currentCount > itemIndex

                      return (
                        <li key={s.id} className="flex items-center gap-2 text-xs py-0.5">
                          <span className={isMatched ? 'text-green-600 font-bold' : 'text-gray-300'}>
                            {isMatched ? '✓' : '○'}
                          </span>
                          <span className={isMatched ? 'text-gray-800 font-medium' : 'text-gray-400'}>
                            {s.label}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
