'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createSubmissionAction } from '@/app/sell/submit/actions'
import { Alert } from '@/components/ui'
import { formatMoney } from '@/lib/business'
import { postUpload, prepareForUpload } from '@/lib/image-prep'
import { useT } from '@/lib/i18n/context'
import { PhotoSlot, type SlotValue } from './PhotoSlot'

// G5 in docs/WEB-PARITY-PLAN.md — the app's CarSubmissionScreen on the web:
// the same two steps, the same fields and options, the same required set.
// Option VALUES are sent in English exactly as the app sends them; only the
// labels are translated.

const OTHER = '__other__'
const FUELS = ['Petrol', 'Diesel', 'Hybrid', 'Electric'] as const
const TRANSMISSIONS = ['Automatic', 'Manual'] as const
const BODY_TYPES = ['Sedan', 'SUV', 'Hatchback', 'Pickup', 'Coupe', 'Van', 'Wagon', 'Minibus'] as const
const FALLBACK_MAKES = [
  'Toyota', 'Nissan', 'Mitsubishi', 'Suzuki', 'Isuzu', 'Honda', 'Mazda', 'Subaru', 'Daihatsu', 'Lexus',
  'Hyundai', 'Kia', 'Volkswagen', 'Mercedes-Benz', 'BMW', 'Audi', 'Land Rover', 'Ford', 'Jeep',
]
// The app's YEARS: this year back sixteen.
const YEARS = Array.from({ length: 16 }, (_, i) => new Date().getFullYear() - i)
const PHOTO_SLOTS = [
  { key: 'front', label: 'onboarding.submit.photoFront' },
  { key: 'side', label: 'onboarding.submit.photoSide' },
] as const
const REFERENCE_LIMIT = 10 * 1024 * 1024

const inputClass =
  'mt-1.5 h-12 w-full rounded-xl border border-line bg-surface px-4 text-body text-content placeholder:text-content-muted focus:border-brand focus:outline-none'

function Chips({
  name,
  options,
  value,
  onChange,
  label,
  withOther,
}: {
  name: string
  options: readonly string[]
  value: string
  onChange: (value: string) => void
  label: (option: string) => string
  withOther?: boolean
}) {
  const all = withOther ? [...options, OTHER] : options
  return (
    <div role="radiogroup" className="mt-2 flex flex-wrap gap-2">
      {all.map((option) => (
        <label
          key={option}
          className="cursor-pointer rounded-pill border border-line px-3.5 py-2 text-caption font-bold text-content-secondary has-[:checked]:border-brand has-[:checked]:bg-brand/10 has-[:checked]:text-brand"
        >
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            className="sr-only"
          />
          {label(option)}
        </label>
      ))}
    </div>
  )
}

export function SubmitCarForm({ makes }: { makes: string[] }) {
  const t = useT()
  const router = useRouter()
  const makeOptions = makes.length ? makes : FALLBACK_MAKES

  const [step, setStep] = useState<0 | 1>(0)
  const [make, setMake] = useState('')
  const [otherMake, setOtherMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [mileage, setMileage] = useState('')
  const [fuel, setFuel] = useState('')
  const [otherFuel, setOtherFuel] = useState('')
  const [transmission, setTransmission] = useState('')
  const [bodyType, setBodyType] = useState('')
  const [otherBody, setOtherBody] = useState('')
  const [color, setColor] = useState('')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<Record<string, SlotValue | null>>({ front: null, side: null })

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Set once the submission exists, so a failed photo upload can be retried
  // or skipped without creating the submission twice.
  const [createdId, setCreatedId] = useState<string | null>(null)

  const chosenMake = (make === OTHER ? otherMake : make).trim()
  const chosenFuel = (fuel === OTHER ? otherFuel : fuel).trim()
  const chosenBody = (bodyType === OTHER ? otherBody : bodyType).trim()
  const stepOneDone = Boolean(chosenMake && model.trim() && year && mileage.trim() && chosenFuel && transmission)
  const title = [year, chosenMake, model.trim()].filter(Boolean).join(' ')

  const chipLabel = (group: string) => (option: string) =>
    option === OTHER ? t('onboarding.submit.other') : t(`onboarding.options.${group}.${option}`)

  async function uploadPhotos(id: string) {
    const chosen = PHOTO_SLOTS.map((slot) => photos[slot.key]).filter(Boolean) as SlotValue[]
    if (!chosen.length) return
    const body = new FormData()
    for (const photo of chosen) {
      const prepared = await prepareForUpload(photo.file, REFERENCE_LIMIT)
      body.append('photos', prepared, prepared.name)
    }
    await postUpload(`/api/upload/reference?submission=${encodeURIComponent(id)}`, body)
  }

  async function submit() {
    if (busy) return
    setBusy(true)
    setError(null)
    let id = createdId
    try {
      if (!id) {
        const result = await createSubmissionAction({
          make: chosenMake,
          model,
          year: Number(year),
          mileage: Number(mileage),
          fuel_type: chosenFuel,
          transmission,
          body_type: chosenBody,
          color,
          asking_price: price.trim() ? Number(price) : null,
          notes,
        })
        if (!result.ok) {
          setError(result.error)
          setBusy(false)
          return
        }
        id = result.id
        setCreatedId(id)
      }
      await uploadPhotos(id)
      router.push(`/dashboard/selling/${id}/schedule?new=1`)
    } catch {
      setError(t('onboarding.submit.photosFailed'))
      setBusy(false)
    }
  }

  if (step === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-title-sm font-extrabold text-content">{t('onboarding.submit.step1Title')}</h2>
          <p className="mt-1 text-caption text-content-secondary">{t('onboarding.submit.step1Body')}</p>
        </div>

        <label className="block text-caption font-bold text-content">
          {t('onboarding.submit.make')} *
          <select value={make} onChange={(e) => setMake(e.target.value)} className={inputClass}>
            <option value="">{t('onboarding.submit.choose')}</option>
            {makeOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            <option value={OTHER}>{t('onboarding.submit.otherBrand')}</option>
          </select>
        </label>
        {make === OTHER ? (
          <input
            aria-label={t('onboarding.submit.otherBrand')}
            value={otherMake}
            onChange={(e) => setOtherMake(e.target.value)}
            placeholder={t('onboarding.submit.otherBrandPlaceholder')}
            className={inputClass}
          />
        ) : null}

        <label className="block text-caption font-bold text-content">
          {t('onboarding.submit.model')} *
          <input value={model} onChange={(e) => setModel(e.target.value)} placeholder={t('onboarding.submit.modelPlaceholder')} className={inputClass} />
        </label>

        <div className="grid gap-6 sm:grid-cols-2">
          <label className="block text-caption font-bold text-content">
            {t('onboarding.submit.year')} *
            <select value={year} onChange={(e) => setYear(e.target.value)} className={inputClass}>
              <option value="">{t('onboarding.submit.choose')}</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label className="block text-caption font-bold text-content">
            {t('onboarding.submit.mileage')} *
            <input
              value={mileage}
              onChange={(e) => setMileage(e.target.value.replace(/[^\d]/g, ''))}
              inputMode="numeric"
              placeholder="45000"
              className={inputClass}
            />
          </label>
        </div>

        <fieldset>
          <legend className="text-caption font-bold text-content">{t('onboarding.submit.fuel')} *</legend>
          <Chips name="fuel" options={FUELS} value={fuel} onChange={setFuel} label={chipLabel('fuel')} withOther />
          {fuel === OTHER ? (
            <input aria-label={t('onboarding.submit.fuel')} value={otherFuel} onChange={(e) => setOtherFuel(e.target.value)} placeholder={t('onboarding.submit.otherFuelPlaceholder')} className={inputClass} />
          ) : null}
        </fieldset>

        <fieldset>
          <legend className="text-caption font-bold text-content">{t('onboarding.submit.transmission')} *</legend>
          <Chips name="transmission" options={TRANSMISSIONS} value={transmission} onChange={setTransmission} label={chipLabel('transmission')} />
        </fieldset>

        <fieldset>
          <legend className="text-caption font-bold text-content">{t('onboarding.submit.bodyType')}</legend>
          <Chips name="body" options={BODY_TYPES} value={bodyType} onChange={setBodyType} label={chipLabel('body')} withOther />
          {bodyType === OTHER ? (
            <input aria-label={t('onboarding.submit.bodyType')} value={otherBody} onChange={(e) => setOtherBody(e.target.value)} placeholder={t('onboarding.submit.otherBodyPlaceholder')} className={inputClass} />
          ) : null}
        </fieldset>

        <label className="block text-caption font-bold text-content">
          {t('onboarding.submit.color')}
          <input value={color} onChange={(e) => setColor(e.target.value)} placeholder={t('onboarding.submit.colorPlaceholder')} className={inputClass} />
        </label>

        <button
          type="button"
          disabled={!stepOneDone}
          onClick={() => {
            setStep(1)
            window.scrollTo({ top: 0 })
          }}
          className="h-12 w-full rounded-xl bg-brand px-6 text-body font-bold text-brand-on disabled:opacity-50"
        >
          {stepOneDone ? t('onboarding.submit.continue') : t('onboarding.submit.fillRequired')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-title-sm font-extrabold text-content">{t('onboarding.submit.step2Title')}</h2>
        <p className="mt-1 text-caption text-content-secondary">{t('onboarding.submit.step2Body')}</p>
      </div>

      <label className="block text-caption font-bold text-content">
        {t('onboarding.submit.price')}
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))}
          inputMode="numeric"
          placeholder="24000000"
          disabled={Boolean(createdId)}
          className={inputClass}
        />
        <span className="mt-1 block text-micro font-normal text-content-muted">
          {price ? formatMoney(Number(price)) : t('onboarding.submit.priceHint')}
        </span>
      </label>

      <fieldset>
        <legend className="text-caption font-bold text-content">{t('onboarding.submit.photos')}</legend>
        <p className="mt-1 text-micro text-content-muted">{t('onboarding.submit.photosHint')}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {PHOTO_SLOTS.map((slot) => (
            <PhotoSlot
              key={slot.key}
              label={t(slot.label)}
              fileName={`reference-${slot.key}`}
              value={photos[slot.key]}
              onChange={(value) => setPhotos((prev) => ({ ...prev, [slot.key]: value }))}
            />
          ))}
        </div>
      </fieldset>

      <label className="block text-caption font-bold text-content">
        {t('onboarding.submit.notes')}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={2000}
          disabled={Boolean(createdId)}
          placeholder={t('onboarding.submit.notesPlaceholder')}
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-body text-content placeholder:text-content-muted focus:border-brand focus:outline-none"
        />
      </label>

      <div className="rounded-2xl border border-line-soft bg-surface-alt p-4 text-caption text-content-secondary">
        <p className="font-extrabold text-content">{title}</p>
        <p className="mt-1">
          {[chosenFuel, transmission, mileage ? `${Number(mileage).toLocaleString('en-US')} km` : ''].filter(Boolean).join(' · ')}
        </p>
      </div>

      {error ? (
        <Alert tone="danger">
          {error}
          {createdId ? (
            <button
              type="button"
              onClick={() => router.push(`/dashboard/selling/${createdId}/schedule?new=1`)}
              className="mt-2 block font-bold underline underline-offset-2"
            >
              {t('onboarding.submit.skipPhotos')}
            </button>
          ) : null}
        </Alert>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        {!createdId ? (
          <button
            type="button"
            onClick={() => setStep(0)}
            className="h-12 rounded-xl border border-line px-6 text-body font-bold text-content hover:bg-surface-alt"
          >
            {t('onboarding.submit.back')}
          </button>
        ) : null}
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="h-12 flex-1 rounded-xl bg-brand px-6 text-body font-bold text-brand-on disabled:opacity-50"
        >
          {busy ? t('onboarding.submit.submitting') : createdId ? t('onboarding.submit.retryPhotos') : t('onboarding.submit.submit')}
        </button>
      </div>
    </div>
  )
}

export default SubmitCarForm
