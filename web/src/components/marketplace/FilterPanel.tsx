'use client'

import { useId, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Icon, Input, Select } from '@/components/ui'
import { useT } from '@/lib/i18n/context'
import { withSelected, type Facets } from './facets'
import {
  buildBrowseHref,
  DRIVE_SIDES,
  FILTER_FIELDS,
  type Filters,
  type SortValue,
} from './query'

// ─────────────────────────────────────────────────────────────────────────────
// The filter form.
//
// It is a real <form method="get" action="/cars">. With JavaScript switched off
// it still filters the marketplace, because the browser's own submission
// produces the same query string this app reads. The enhancement on top is
// narrow on purpose: selects navigate the moment they change, text and number
// fields wait for submit. Auto-navigating on every keystroke of a price box
// would fire a request per digit and fight the user's cursor.
// ─────────────────────────────────────────────────────────────────────────────

export function FilterPanel({
  facets,
  filters,
  sort,
  onApplied,
  className = '',
}: {
  facets: Facets
  filters: Filters
  sort: SortValue
  /** Lets the mobile sheet close itself once a filter has been applied. */
  onApplied?: () => void
  className?: string
}) {
  const t = useT()
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, startTransition] = useTransition()
  const uid = useId()

  const driveSideLabel = (value: string) =>
    value === 'RHD' ? t('cars.driveSide.rhd.label') : t('cars.driveSide.lhd.label')
  const driveSideHintFor = (value: string) =>
    value === 'RHD' ? t('cars.driveSide.rhd.hint') : t('cars.driveSide.lhd.hint')

  const fieldId = (name: string) => `${uid}-${name}`

  const apply = () => {
    const form = formRef.current
    if (!form) return

    const data = new FormData(form)
    const next: Filters = {}
    for (const field of FILTER_FIELDS) {
      const value = String(data.get(field) ?? '').trim()
      if (value) next[field] = value
    }

    // Filters changed ⇒ back to the first page. buildBrowseHref drops empty
    // values, so the enhanced path produces a clean URL where the browser's
    // native submit would leave `?make=&model=` behind.
    startTransition(() => {
      router.push(buildBrowseHref(next, { sort }))
      onApplied?.()
    })
  }

  return (
    <form
      // Remounting on every URL change is what keeps these uncontrolled inputs
      // honest: remove a filter chip and the matching field clears with it.
      key={buildBrowseHref(filters, { sort })}
      ref={formRef}
      method="get"
      action="/cars"
      onSubmit={(event) => {
        event.preventDefault()
        apply()
      }}
      onChange={(event) => {
        // Selects commit immediately; everything else waits for Apply.
        if ((event.target as HTMLElement).tagName === 'SELECT') apply()
      }}
      className={`space-y-6 ${className}`}
      aria-label={t('cars.filter.ariaLabel')}
    >
      {/* Sort lives in the toolbar, but it has to survive a filter submit. */}
      <input type="hidden" name="sort" value={sort} />

      <div>
        <label htmlFor={fieldId('q')} className={LABEL}>
          {t('cars.filter.keyword')}
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted">
            <Icon name="search" size={17} />
          </span>
          <Input
            id={fieldId('q')}
            name="q"
            type="search"
            defaultValue={filters.q ?? ''}
            placeholder={t('cars.filter.keywordPlaceholder')}
            className="pl-10"
          />
        </div>
      </div>

      <SelectField
        id={fieldId('make')}
        name="make"
        label={t('cars.filter.make')}
        value={filters.make}
        options={withSelected(facets.makes, filters.make)}
        anyLabel={t('cars.filter.anyMake')}
      />

      <div>
        <label htmlFor={fieldId('model')} className={LABEL}>
          {t('cars.filter.model')}
        </label>
        <Input
          id={fieldId('model')}
          name="model"
          defaultValue={filters.model ?? ''}
          placeholder={t('cars.filter.anyModel')}
        />
      </div>

      <SelectField
        id={fieldId('body_type')}
        name="body_type"
        label={t('cars.filter.bodyType')}
        value={filters.body_type}
        options={withSelected(facets.bodyTypes, filters.body_type)}
        anyLabel={t('cars.filter.anyBodyType')}
      />

      <fieldset>
        <legend className={LABEL}>{t('cars.filter.priceRwf')}</legend>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={fieldId('min_price')}>
            {t('cars.filter.minPriceSr')}
          </label>
          <Input
            id={fieldId('min_price')}
            name="min_price"
            type="number"
            inputMode="numeric"
            min={0}
            step={500}
            defaultValue={filters.min_price ?? ''}
            placeholder={t('cars.filter.min')}
          />
          <span aria-hidden className="text-content-muted">
            –
          </span>
          <label className="sr-only" htmlFor={fieldId('max_price')}>
            {t('cars.filter.maxPriceSr')}
          </label>
          <Input
            id={fieldId('max_price')}
            name="max_price"
            type="number"
            inputMode="numeric"
            min={0}
            step={500}
            defaultValue={filters.max_price ?? ''}
            placeholder={t('cars.filter.max')}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className={LABEL}>{t('cars.filter.year')}</legend>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={fieldId('min_year')}>
            {t('cars.filter.minYearSr')}
          </label>
          <Input
            id={fieldId('min_year')}
            name="min_year"
            type="number"
            inputMode="numeric"
            min={1980}
            max={2100}
            defaultValue={filters.min_year ?? ''}
            placeholder={t('cars.filter.from')}
          />
          <span aria-hidden className="text-content-muted">
            –
          </span>
          <label className="sr-only" htmlFor={fieldId('max_year')}>
            {t('cars.filter.maxYearSr')}
          </label>
          <Input
            id={fieldId('max_year')}
            name="max_year"
            type="number"
            inputMode="numeric"
            min={1980}
            max={2100}
            defaultValue={filters.max_year ?? ''}
            placeholder={t('cars.filter.to')}
          />
        </div>
      </fieldset>

      <div>
        <label htmlFor={fieldId('drive_side')} className={LABEL}>
          {t('cars.filter.driveSide')}
        </label>
        <Select
          id={fieldId('drive_side')}
          name="drive_side"
          defaultValue={filters.drive_side ?? ''}
          aria-describedby={fieldId('drive_side-hint')}
        >
          <option value="">{t('cars.filter.either')}</option>
          {DRIVE_SIDES.map((side) => (
            <option key={side.value} value={side.value}>
              {driveSideLabel(side.value)} — {driveSideHintFor(side.value)}
            </option>
          ))}
        </Select>
        <p id={fieldId('drive_side-hint')} className="mt-2 text-micro leading-relaxed text-content-muted">
          {t('cars.filter.driveSideHint')}
        </p>
      </div>

      <SelectField
        id={fieldId('fuel_type')}
        name="fuel_type"
        label={t('cars.filter.fuel')}
        value={filters.fuel_type}
        options={withSelected(facets.fuelTypes, filters.fuel_type)}
        anyLabel={t('cars.filter.anyFuel')}
      />

      <SelectField
        id={fieldId('transmission')}
        name="transmission"
        label={t('cars.filter.gearbox')}
        value={filters.transmission}
        options={withSelected(facets.transmissions, filters.transmission)}
        anyLabel={t('cars.filter.anyGearbox')}
      />

      <div className="flex flex-col gap-2 border-t border-line-soft pt-5">
        <Button type="submit" fullWidth disabled={pending}>
          {pending ? t('cars.filter.applying') : t('cars.filter.apply')}
        </Button>
        <Button href="/cars" variant="ghost" size="sm" fullWidth>
          {t('cars.filter.clearAll')}
        </Button>
      </div>
    </form>
  )
}

const LABEL = 'mb-2 block text-caption font-bold uppercase tracking-wide text-content-muted'

/** A select is only offered when the catalogue has something to put in it —
 *  an empty dropdown is a dead end dressed up as a control. */
function SelectField({
  id,
  name,
  label,
  value,
  options,
  anyLabel,
}: {
  id: string
  name: string
  label: string
  value?: string
  options: string[]
  anyLabel: string
}) {
  if (!options.length) return null
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <Select id={id} name={name} defaultValue={value ?? ''}>
        <option value="">{anyLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    </div>
  )
}

export default FilterPanel
