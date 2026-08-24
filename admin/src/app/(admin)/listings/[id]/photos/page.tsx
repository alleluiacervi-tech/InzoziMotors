'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Icon } from '@/components/ui'
import { useToast } from '@/components/feedback'

export default function CarPhotosPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [car, setCar] = useState<any>(null)
  const [gallery, setGallery] = useState<any>({ photos: [], missing_required: [], complete: false })
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
      if (gallery.photos.length + files.length > 40) {
        throw new Error(`A listing can contain up to 40 photos. Select no more than ${40 - gallery.photos.length} additional photo(s).`)
      }
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
          Back to listings
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
            <p className="text-xs text-gray-500 mt-1">or click to browse (up to 40 JPEG, PNG, or WebP images)</p>
            <p className="mt-2 text-xs font-medium text-brand">Aim for 6–10 clear photos. More are welcome when they help a buyer understand the vehicle.</p>
            
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
              <p className="text-xs text-gray-400 italic py-4">No images uploaded yet. Add at least one clear image before publishing.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {gallery.photos.map((photo: any) => (
                  <div key={photo.id} className="relative aspect-video rounded-lg overflow-hidden border border-gray-150 shadow-sm bg-gray-50 group">
                    <img src={photo.url} alt={`${car.make} ${car.model}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-white text-[10px] font-bold">{photo.is_cover ? 'Cover photo' : 'Gallery photo'}</span>
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

        {/* Publication guidance */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-fit">
          <h2 className="text-sm font-bold text-gray-900 mb-2">Photo quality checklist</h2>
          <p className="text-xs text-gray-500 mb-4">There is no fixed angle requirement. Use the images that best represent this vehicle.</p>
          <ul className="space-y-3 text-xs text-gray-600">
            <li className="flex gap-2"><span className="font-bold text-brand">1.</span><span>Choose a bright, sharp exterior image as the cover.</span></li>
            <li className="flex gap-2"><span className="font-bold text-brand">2.</span><span>Include exterior, cabin, dashboard, boot, engine and visible defects where relevant.</span></li>
            <li className="flex gap-2"><span className="font-bold text-brand">3.</span><span>Never hide damage, registration details that must be disclosed, or material differences.</span></li>
            <li className="flex gap-2"><span className="font-bold text-brand">4.</span><span>Publishing remains a separate admin action and will run all verification checks.</span></li>
          </ul>
          <div className={`mt-5 rounded-lg border p-3 ${currentCount > 0 ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
            <p className="text-xs font-bold">{currentCount > 0 ? `${currentCount} photo${currentCount === 1 ? '' : 's'} ready` : 'Photo required'}</p>
            <p className="mt-1 text-[11px]">{currentCount > 0 ? 'The gallery meets the minimum photo requirement.' : 'Upload at least one photo to make publication possible.'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
