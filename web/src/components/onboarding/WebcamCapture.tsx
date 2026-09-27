'use client'

import { useEffect, useRef, useState } from 'react'
import { canvasToJpeg } from '@/lib/image-prep'
import { useT } from '@/lib/i18n/context'

// A live camera view in the page (D4 in docs/WEB-PARITY-PLAN.md). Its frames
// come straight from the device camera, which is why a photo taken here is the
// only kind the website reports to reviewers as a live capture.
//
// Camera access is only allowed on the routes next.config.ts opens it for
// (/dashboard/verify, /sell/submit). The stream is stopped the moment this
// unmounts, so the camera light never stays on after a photo is taken.
export function WebcamCapture({
  facing,
  fileName,
  onCapture,
  onCancel,
}: {
  facing: 'user' | 'environment'
  fileName: string
  onCapture: (file: File) => void
  onCancel: () => void
}) {
  const t = useT()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((track) => track.stop())
          return
        }
        stream = s
        const video = videoRef.current
        if (video) {
          video.srcObject = s
          video.play().then(() => setReady(true)).catch(() => setReady(true))
        }
      })
      .catch(() => setError(t('onboarding.webcam.denied')))
    return () => {
      cancelled = true
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [facing, t])

  async function snap() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    const blob = await canvasToJpeg(canvas)
    onCapture(new File([blob], `${fileName}.jpg`, { type: 'image/jpeg' }))
  }

  return (
    <div className="rounded-xl border border-line-soft bg-surface-alt p-3">
      {error ? (
        <p role="alert" className="p-3 text-caption text-danger">{error}</p>
      ) : (
        <video
          ref={videoRef}
          muted
          playsInline
          className={`aspect-video w-full rounded-lg bg-ink-900 object-cover ${facing === 'user' ? '-scale-x-100' : ''}`}
        />
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {!error ? (
          <button
            type="button"
            onClick={snap}
            disabled={!ready}
            className="h-11 rounded-xl bg-brand px-4 text-caption font-bold text-brand-on disabled:opacity-50"
          >
            {t('onboarding.webcam.snap')}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onCancel}
          className="h-11 rounded-xl px-4 text-caption font-bold text-content-secondary hover:bg-surface"
        >
          {t('onboarding.webcam.cancel')}
        </button>
      </div>
    </div>
  )
}

export default WebcamCapture
