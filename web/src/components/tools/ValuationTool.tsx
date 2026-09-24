'use client'

import { useActionState, useState } from 'react'
import { estimateValuationAction, type ValuationState } from '@/app/sell/actions'
import { Alert, Button, Field, Icon, Input, LiveRegion } from '@/components/ui'
import { formatKm, formatMoney } from '@/lib/business'
import { useT } from '@/lib/i18n/context'
import { CONTACT } from '@/lib/site'
import {
  Headline,
  NumberField,
  ResultPanel,
  ResultPlaceholder,
  ResultRow,
  WRAPPING_LABEL,
} from './ToolPrimitives'

// ─────────────────────────────────────────────────────────────────────────────
// Free valuation — no account, no phone number, no callback.
//
// Everything on the results side is a number the API returned. Where the
// catalogue is too thin to price a car, this says so and offers the inspection
// anyway; it never falls back to a guess dressed up as an estimate.
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL: ValuationState = { status: 'idle' }

/** The API's own reference point when mileage is left blank
 *  (backend/src/routes/cars.js). Stated on screen so the estimate is legible. */
const MILEAGE_REFERENCE = 60000

export function ValuationTool({
  makes,
  currentYear,
}: {
  /** Makes actually present in the live catalogue — the makes the estimate can
   *  find comparables for. Empty when the API is unreachable. */
  makes: string[]
  /** Passed from the server so the year hint cannot drift between render passes. */
  currentYear: number
}) {
  const t = useT()
  const [state, formAction, pending] = useActionState(estimateValuationAction, INITIAL)

  const [make, setMake] = useState('')
  const [year, setYear] = useState('')
  const [mileage, setMileage] = useState('')

  const fieldErrors = state.status === 'invalid' ? state.fieldErrors : {}

  return (
    <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
      {/* ─── Form ─────────────────────────────────────────────────────────── */}
      <form
        action={formAction}
        className="rounded-2xl border border-line-soft bg-surface p-5 shadow-card sm:p-6 lg:col-span-2"
      >
        <h3 className="text-caption font-bold text-content-muted">
          {t('tools.valuationTool.yourCar')}
        </h3>

        <div className="mt-4 space-y-5">
          <Field
            label={t('tools.valuationTool.make')}
            htmlFor="valuation-make"
            error={fieldErrors.make}
            hint={makes.length ? t('tools.valuationTool.makeHint') : undefined}
            required
          >
            <Input
              id="valuation-make"
              name="make"
              type="text"
              autoComplete="off"
              autoCapitalize="words"
              list={makes.length ? 'valuation-makes' : undefined}
              placeholder="Toyota"
              value={make}
              error={Boolean(fieldErrors.make)}
              aria-describedby={makes.length && !fieldErrors.make ? 'valuation-make-hint' : undefined}
              onChange={(event) => setMake(event.target.value)}
            />
            {makes.length ? (
              <datalist id="valuation-makes">
                {makes.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            ) : null}
          </Field>

          <NumberField
            id="valuation-year"
            name="year"
            label={t('tools.valuationTool.year')}
            placeholder={String(currentYear - 6)}
            value={year}
            onChange={setYear}
            error={fieldErrors.year}
            required
          />

          <NumberField
            id="valuation-mileage"
            name="mileage"
            label={t('tools.valuationTool.mileage')}
            suffix="km"
            placeholder="80000"
            value={mileage}
            onChange={setMileage}
            error={fieldErrors.mileage}
            hint={t('tools.valuationTool.mileageHint', { km: formatKm(MILEAGE_REFERENCE) })}
          />

          <Button type="submit" fullWidth disabled={pending}>
            {pending ? t('tools.valuationTool.checking') : t('tools.valuationTool.getValuation')}
          </Button>

          <p className="text-micro leading-relaxed text-content-muted">
            {t('tools.valuationTool.noAccount')}
          </p>
        </div>
      </form>

      {/* ─── Result ───────────────────────────────────────────────────────── */}
      <div className="lg:col-span-3">
        <ResultPanel title={t('tools.valuationTool.whatWorth')} className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          {state.status === 'ok' ? <ValuationResult state={state} /> : null}

          {state.status === 'empty' ? (
            <div className="space-y-5">
              <Alert tone="info" title={t('tools.valuationTool.notEnoughTitle')}>
                {t('tools.valuationTool.notEnoughBody', { message: state.message })}
              </Alert>
              <p className="text-caption leading-relaxed text-content-secondary">
                {t('tools.valuationTool.inspectionStill', { make: state.make })}
              </p>
              <NextSteps />
            </div>
          ) : null}

          {state.status === 'error' ? (
            <Alert tone="danger" title={t('tools.valuationTool.errorTitle')}>
              {state.message}
            </Alert>
          ) : null}

          {state.status === 'idle' || state.status === 'invalid' ? (
            <ResultPlaceholder>
              {t('tools.valuationTool.placeholder')}
            </ResultPlaceholder>
          ) : null}
        </ResultPanel>

        <LiveRegion>
          {state.status === 'ok'
            ? t('tools.valuationTool.liveOk', { low: formatMoney(state.low), high: formatMoney(state.high), comparables: state.comparables })
            : state.status === 'empty'
              ? t('tools.valuationTool.liveEmpty')
              : state.status === 'error'
                ? state.message
                : ''}
        </LiveRegion>
      </div>
    </div>
  )
}

// ─── Result body ─────────────────────────────────────────────────────────────

function ValuationResult({ state }: { state: Extract<ValuationState, { status: 'ok' }> }) {
  const t = useT()
  // The backend compares against ±2 years around the one entered; saying so is
  // what turns a number into evidence.
  const from = state.year - 2
  const to = state.year + 2

  return (
    <div className="space-y-5">
      <Headline
        label={`${t('tools.valuationTool.carLabel', { year: state.year, make: state.make })}${state.mileage ? ` · ${formatKm(state.mileage)}` : ''}`}
        value={`${ formatMoney(state.low) } – ${ formatMoney(state.high) }`}
        note={
          state.mileage
            ? t('tools.valuationTool.adjusted')
            : t('tools.valuationTool.valuedAt', { km: formatKm(MILEAGE_REFERENCE) })
        }
      />

      <div>
        {state.market_avg !== null ? (
          <ResultRow
            label={t('tools.valuationTool.avgPrice')}
            hint={t('tools.valuationTool.avgHint', { make: state.make, from, to })}
            value={ formatMoney(state.market_avg) }
          />
        ) : null}
        {state.range_seen ? (
          <ResultRow
            label={t('tools.valuationTool.pricesSeen')}
            hint={t('tools.valuationTool.pricesSeenHint')}
            value={`${ formatMoney(state.range_seen.low) } – ${ formatMoney(state.range_seen.high) }`}
          />
        ) : null}
        <ResultRow
          label={t('tools.valuationTool.comparablesUsed')}
          hint={t('tools.valuationTool.comparablesHint')}
          value={String(state.comparables)}
        />
      </div>

      <p className="rounded-xl bg-surface-alt px-4 py-3 text-micro leading-relaxed text-content-secondary">
        {t('tools.valuationTool.estimateNote')}
      </p>

      <NextSteps />
    </div>
  )
}

function NextSteps() {
  const t = useT()
  return (
    <div className="space-y-3 border-t border-line-soft pt-5">
      <Button
        href="/download"
        fullWidth
        className={WRAPPING_LABEL}
        trailingIcon={<Icon name="arrow-right" size={18} />}
      >
        {t('tools.valuationTool.submitBtn')}
      </Button>
      <p className="text-center text-micro leading-relaxed text-content-muted">
        {t('tools.valuationTool.submissionHint')}{' '}
        <a
          href={`https://wa.me/${CONTACT.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-brand hover:underline"
        >
          {t('tools.valuationTool.orWhatsApp')}
        </a>
        .
      </p>
    </div>
  )
}

export default ValuationTool
