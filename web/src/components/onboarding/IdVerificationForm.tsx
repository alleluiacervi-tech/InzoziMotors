'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Alert } from '@/components/ui'
import { postUpload, prepareForUpload } from '@/lib/image-prep'
import { useT } from '@/lib/i18n/context'
import { PhotoSlot, type SlotValue } from './PhotoSlot'

// G4 in docs/WEB-PARITY-PLAN.md — the same three photos, field names and
// limits as the app's IDVerificationScreen, sent through the website's upload
// proxy so the session token never reaches this page.

const ID_LIMIT = 5 * 1024 * 1024

const SLOTS = [
  { field: 'id_front', label: 'onboarding.verify.frontLabel', hint: 'onboarding.verify.frontHint', facing: 'environment' },
  { field: 'id_back', label: 'onboarding.verify.backLabel', hint: 'onboarding.verify.backHint', facing: 'environment' },
  { field: 'selfie', label: 'onboarding.verify.selfieLabel', hint: 'onboarding.verify.selfieHint', facing: 'user' },
] as const

type Field = (typeof SLOTS)[number]['field']

export function IdVerificationForm() {
  const t = useT()
  const router = useRouter()
  const [photos, setPhotos] = useState<Record<Field, SlotValue | null>>({ id_front: null, id_back: null, selfie: null })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const complete = SLOTS.every((slot) => photos[slot.field])

  async function submit() {
    if (!complete || sending) return
    setSending(true)
    setError(null)
    try {
      const body = new FormData()
      for (const slot of SLOTS) {
        const photo = photos[slot.field] as SlotValue
        const prepared = await prepareForUpload(photo.file, ID_LIMIT)
        body.append(slot.field, prepared, prepared.name)
      }
      const allLive = SLOTS.every((slot) => photos[slot.field]?.source === 'live')
      body.append('capture_source', allLive ? 'live' : 'file')
      await postUpload('/api/upload/id', body)
      router.refresh()
    } catch (err) {
      setError((err as Error).message || t('onboarding.verify.failed'))
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-caption font-extrabold text-content">{t('onboarding.verify.required')}</p>
      {SLOTS.map((slot) => (
        <PhotoSlot
          key={slot.field}
          label={t(slot.label)}
          hint={t(slot.hint)}
          facing={slot.facing}
          fileName={slot.field.replace('_', '-')}
          value={photos[slot.field]}
          onChange={(value) => setPhotos((prev) => ({ ...prev, [slot.field]: value }))}
        />
      ))}

      <p className="flex gap-2 rounded-xl bg-surface-alt p-3 text-micro leading-relaxed text-content-secondary">
        {t('onboarding.verify.privacy')}
      </p>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <button
        type="button"
        onClick={submit}
        disabled={!complete || sending}
        className="h-12 w-full rounded-xl bg-brand px-6 text-body font-bold text-brand-on disabled:opacity-50"
      >
        {sending ? t('onboarding.verify.sending') : t('onboarding.verify.submit')}
      </button>
      {!complete ? (
        <p className="text-center text-micro text-content-muted">{t('onboarding.verify.addAll')}</p>
      ) : null}
    </div>
  )
}

export default IdVerificationForm
