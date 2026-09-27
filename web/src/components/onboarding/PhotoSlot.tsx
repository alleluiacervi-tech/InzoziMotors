'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/ui'
import { IMAGE_ACCEPT } from '@/lib/image-prep'
import { useT } from '@/lib/i18n/context'
import { WebcamCapture } from './WebcamCapture'

export interface SlotValue {
  file: File
  preview: string
  /** 'live' only when the frames came from WebcamCapture (P2-D2). */
  source: 'live' | 'file'
}

// One photo, the web version of the app's capture cards. A file input without
// the `capture` attribute lets a phone offer both its camera and its library,
// the same two choices as the app's "Take a photo / Choose from library"
// sheet. A desktop with a mouse also gets the in-page webcam.
export function PhotoSlot({
  label,
  hint,
  value,
  onChange,
  facing = 'environment',
  fileName,
}: {
  label: string
  hint?: string
  value: SlotValue | null
  onChange: (value: SlotValue | null) => void
  facing?: 'user' | 'environment'
  fileName: string
}) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const [webcamOpen, setWebcamOpen] = useState(false)
  const [canWebcam, setCanWebcam] = useState(false)

  useEffect(() => {
    setCanWebcam(Boolean(navigator.mediaDevices?.getUserMedia) && window.matchMedia('(pointer: fine)').matches)
  }, [])

  // Each preview URL is released when it's replaced or the slot goes away.
  useEffect(() => {
    if (!value) return
    return () => URL.revokeObjectURL(value.preview)
  }, [value])

  function take(file: File, source: SlotValue['source']) {
    onChange({ file, preview: URL.createObjectURL(file), source })
  }

  return (
    <div className="rounded-2xl border border-line-soft bg-surface p-4">
      <div className="flex items-start gap-4">
        <div className="relative flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-alt text-content-muted">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local object URL, not a remote image
            <img src={value.preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <Icon name="camera" size={26} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-caption font-extrabold text-content">{label}</p>
          {hint ? <p className="mt-0.5 text-micro leading-relaxed text-content-muted">{hint}</p> : null}
          {value ? (
            <p className="mt-1.5 flex items-center gap-1 text-micro font-bold text-success-text">
              <Icon name="check-circle" size={13} /> {t('onboarding.photo.ready')}
            </p>
          ) : null}
        </div>
      </div>

      {webcamOpen ? (
        <div className="mt-4">
          <WebcamCapture
            facing={facing}
            fileName={fileName}
            onCapture={(file) => {
              take(file, 'live')
              setWebcamOpen(false)
            }}
            onCancel={() => setWebcamOpen(false)}
          />
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-caption font-bold text-content hover:bg-surface-alt"
          >
            <Icon name="camera" size={15} />
            {value ? t('onboarding.photo.replace') : t('onboarding.photo.choose')}
          </button>
          {canWebcam ? (
            <button
              type="button"
              onClick={() => setWebcamOpen(true)}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-caption font-bold text-content hover:bg-surface-alt"
            >
              <Icon name="eye" size={15} />
              {t('onboarding.photo.webcam')}
            </button>
          ) : null}
          {value ? (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex h-11 items-center rounded-xl px-3 text-caption font-bold text-content-secondary hover:bg-surface-alt"
            >
              {t('onboarding.photo.remove')}
            </button>
          ) : null}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        aria-label={label}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) take(file, 'file')
          event.target.value = ''
        }}
      />
    </div>
  )
}

export default PhotoSlot
