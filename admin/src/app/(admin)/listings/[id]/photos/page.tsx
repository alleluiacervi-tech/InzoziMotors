'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Icon } from '@/components/ui'
import { useToast } from '@/components/feedback'

// Same canonical slot ids as mobile and backend (28 required + 8 defects).
const PHOTO_GUIDE_SLOTS = [
  // Exterior
  { id: 'ext_front',       label: 'Front Full View',      cat: 'Exterior' },
  { id: 'ext_fl45',        label: 'Front-Left 45° Angle',  cat: 'Exterior' },
  { id: 'ext_left',        label: 'Left Side Profile',    cat: 'Exterior' },
  { id: 'ext_rl45',        label: 'Rear-Left 45° Angle',   cat: 'Exterior' },
  { id: 'ext_rear',        label: 'Rear Full View',       cat: 'Exterior' },
  { id: 'ext_rr45',        label: 'Rear-Right 45° Angle',  cat: 'Exterior' },
  { id: 'ext_right',       label: 'Right Side Profile',   cat: 'Exterior' },
  { id: 'ext_fr45',        label: 'Front-Right 45° Angle', cat: 'Exterior' },
  
  // Details
  { id: 'det_roof',        label: 'Roof Panel',           cat: 'Details' },
  { id: 'det_under',       label: 'Underbody / Chassis',  cat: 'Details' },
  { id: 'det_wfl',         label: 'Front-Left Wheel',     cat: 'Details' },
  { id: 'det_wfr',         label: 'Front-Right Wheel',    cat: 'Details' },
  { id: 'det_wrl',         label: 'Rear-Left Wheel',      cat: 'Details' },
  { id: 'det_wrr',         label: 'Rear-Right Wheel',     cat: 'Details' },
  { id: 'det_tfl',         label: 'Front-Left Tyre Tread',cat: 'Details' },
  { id: 'det_tfr',         label: 'Front-Right Tyre Tread',cat: 'Details' },
  { id: 'det_trl',         label: 'Rear-Left Tyre Tread', cat: 'Details' },
  { id: 'det_trr',         label: 'Rear-Right Tyre Tread',cat: 'Details' },

  // Under Hood
  { id: 'hood_bay',        label: 'Engine Bay Overall',   cat: 'Engine' },
  { id: 'hood_serial',     label: 'Engine Block Serial',  cat: 'Engine' },

  // Instruments
  { id: 'inst_odo',        label: 'Odometer Reading',     cat: 'Instruments' },
  { id: 'inst_vin',        label: 'VIN Plate / Stamp',    cat: 'Instruments' },

  // Interior
  { id: 'int_dash',        label: 'Dashboard Overview',   cat: 'Interior' },
  { id: 'int_info',        label: 'Infotainment Console', cat: 'Interior' },
  { id: 'int_driver',      label: 'Driver Seat Bolster',  cat: 'Interior' },
  { id: 'int_rear',        label: 'Rear Passenger Bench', cat: 'Interior' },
  { id: 'int_boot',        label: 'Boot / Trunk Space',   cat: 'Interior' },
  { id: 'int_head',        label: 'Ceiling Headliner',    cat: 'Interior' },
  { id: 'def1', label: 'Defect Close-up #1', cat: 'Defects', optional: true },
  { id: 'def2', label: 'Defect Close-up #2', cat: 'Defects', optional: true },
  { id: 'def3', label: 'Defect Close-up #3', cat: 'Defects', optional: true },
  { id: 'def4', label: 'Defect Close-up #4', cat: 'Defects', optional: true },
  { id: 'def5', label: 'Defect Close-up #5', cat: 'Defects', optional: true },
  { id: 'def6', label: 'Defect Close-up #6', cat: 'Defects', optional: true },
  { id: 'def7', label: 'Defect Close-up #7', cat: 'Defects', optional: true },
  { id: 'def8', label: 'Defect Close-up #8', cat: 'Defects', optional: true },
]

export default function CarPhotosPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [car, setCar] = useState<any>(null)
  const [gallery, setGallery] = useState<any>({ photos: [], missing_required: PHOTO_GUIDE_SLOTS.map((s) => s.id), complete: false })
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const toast = useToast()

  async function loadCar() {
    try {
      const [data, photos] = await Promise.all([api.getCar(id), api.getCarPhotos(id)])
      setCar(data); setGallery(photos)
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
      const present = new Set(gallery.photos.map((photo: any) => photo.angle_key))
      const available = PHOTO_GUIDE_SLOTS.filter((slot) => !present.has(slot.id))
      if (files.length > available.length) throw new Error(`Only ${available.length} empty slot(s) remain. Upload fewer files so every photo has an unambiguous angle.`)
      for (let i = 0; i < files.length; i++) {
        formData.append('photos', files[i])
        formData.append('angle_keys', available[i].id)
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

  async function makeCover(photoId: string) {
    try {
      setGallery(await api.setCarPhotoCover(id, photoId))
      toast('Cover photo updated.', 'success')
    } catch (e: any) { toast(e.message || 'Could not update the cover photo.', 'error') }
  }

  async function removePhoto(photoId: string) {
    if (!window.confirm('Remove this photo from the listing?')) return
    try {
      setGallery(await api.deleteCarPhoto(id, photoId))
      toast('Photo removed.', 'success')
    } catch (e: any) { toast(e.message || 'Could not remove the photo.', 'error') }
  }

  if (loading) return <div className="text-gray-400 text-sm">Loading vehicle details…</div>
  if (!car) return <div className="text-red-600 text-sm">Listing not found.</div>

  const currentCount = gallery.photos.length
  const presentAngles = new Set(gallery.photos.map((p: any) => p.angle_key))

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
                {gallery.photos.map((photo: any) => (
                  <div key={photo.id} className="relative aspect-video rounded-lg overflow-hidden border border-gray-150 shadow-sm bg-gray-50 group">
                    <img src={photo.url} alt={photo.angle_key} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-white text-[10px] font-bold">{photo.angle_key}{photo.is_cover ? ' · cover' : ''}</span>
                        <div className="flex gap-2">
                          {!photo.is_cover && <button type="button" onClick={() => makeCover(photo.id)} className="rounded bg-white px-2 py-1 text-[10px] font-bold text-gray-800">Make cover</button>}
                          <button type="button" onClick={() => removePhoto(photo.id)} className="rounded bg-red-600 px-2 py-1 text-[10px] font-bold text-white">Remove</button>
                        </div>
                      </div>
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
          <p className="text-xs text-gray-500 mb-4">Files are assigned to the next empty slot in this guide. Upload them in guide order; all 28 required angles must be present.</p>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {['Exterior', 'Details', 'Engine', 'Instruments', 'Interior', 'Defects'].map((cat) => {
              const slots = PHOTO_GUIDE_SLOTS.filter((s) => s.cat === cat)
              return (
                <div key={cat} className="space-y-1.5">
                  <h3 className="text-xs font-bold text-gray-700 border-b border-gray-100 pb-1 uppercase tracking-wide">{cat}</h3>
                  <ul className="space-y-1">
                    {slots.map((s, idx) => {
                      // Check if we have at least this number of photos uploaded
                      const isMatched = presentAngles.has(s.id)

                      return (
                        <li key={s.id} className="flex items-center gap-2 text-xs py-0.5">
                          <span className={isMatched ? 'text-green-600 font-bold' : 'text-gray-300'}>
                            {isMatched ? '✓' : '○'}
                          </span>
                          <span className={isMatched ? 'text-gray-800 font-medium' : 'text-gray-400'}>
                            {s.label}{'optional' in s && s.optional ? ' · optional' : ''}
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
