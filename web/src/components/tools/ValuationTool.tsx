'use client'

import { useActionState, useState } from 'react'
import { estimateValuationAction, type ValuationState } from '@/app/sell/actions'
import { Alert, Button, Field, Icon, Input, LiveRegion } from '@/components/ui'
import { formatKm, formatUSD } from '@/lib/business'
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
        <h3 className="text-caption font-bold uppercase tracking-wide text-content-muted">
          Your car
        </h3>

        <div className="mt-4 space-y-5">
          <Field
            label="Make"
            htmlFor="valuation-make"
            error={fieldErrors.make}
            hint={makes.length ? 'Start typing — we suggest makes we already have on the site.' : undefined}
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
            label="Year"
            placeholder={String(currentYear - 6)}
            value={year}
            onChange={setYear}
            error={fieldErrors.year}
            required
          />

          <NumberField
            id="valuation-mileage"
            name="mileage"
            label="Mileage"
            suffix="km"
            placeholder="80000"
            value={mileage}
            onChange={setMileage}
            error={fieldErrors.mileage}
            hint={`Optional. Left blank, we value at ${formatKm(MILEAGE_REFERENCE)}.`}
          />

          <Button type="submit" fullWidth disabled={pending}>
            {pending ? 'Checking the market…' : 'Get my valuation'}
          </Button>

          <p className="text-micro leading-relaxed text-content-muted">
            No account, no phone number. We do not call you afterwards.
          </p>
        </div>
      </form>

      {/* ─── Result ───────────────────────────────────────────────────────── */}
      <div className="lg:col-span-3">
        <ResultPanel title="What it is worth" className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          {state.status === 'ok' ? <ValuationResult state={state} /> : null}

          {state.status === 'empty' ? (
            <div className="space-y-5">
              <Alert tone="info" title="Not enough comparable cars yet">
                {state.message}. We price from cars actually listed or sold on Sawa Cars, so a make
                and year we have not handled yet gets no number rather than a guess.
              </Alert>
              <p className="text-caption leading-relaxed text-content-secondary">
                An inspection still tells you where your {state.make} stands. Our team prices it
                against the market on the day it is certified, and you keep the final say.
              </p>
              <NextSteps />
            </div>
          ) : null}

          {state.status === 'error' ? (
            <Alert tone="danger" title="We could not run that estimate">
              {state.message}
            </Alert>
          ) : null}

          {state.status === 'idle' || state.status === 'invalid' ? (
            <ResultPlaceholder>
              Enter a make and year to see what comparable cars on Sawa Cars are selling for.
            </ResultPlaceholder>
          ) : null}
        </ResultPanel>

        <LiveRegion>
          {state.status === 'ok'
            ? `Estimated range ${formatUSD(state.low)} to ${formatUSD(state.high)}, based on ${state.comparables} comparable cars.`
            : state.status === 'empty'
              ? 'Not enough comparable cars for that make and year.'
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
  // The backend compares against ±2 years around the one entered; saying so is
  // what turns a number into evidence.
  const from = state.year - 2
  const to = state.year + 2

  return (
    <div className="space-y-5">
      <Headline
        label={`${state.year} ${state.make}${state.mileage ? ` · ${formatKm(state.mileage)}` : ''}`}
        value={`${formatUSD(state.low)} – ${formatUSD(state.high)}`}
        note={
          state.mileage
            ? 'Adjusted for the mileage you entered.'
            : `Valued at our ${formatKm(MILEAGE_REFERENCE)} reference — add your mileage for a closer range.`
        }
      />

      <div>
        {state.market_avg !== null ? (
          <ResultRow
            label="Average price of those cars"
            hint={`${state.make}, ${from}–${to}`}
            value={formatUSD(state.market_avg)}
          />
        ) : null}
        {state.range_seen ? (
          <ResultRow
            label="Prices actually seen"
            hint="Lowest and highest of the same group"
            value={`${formatUSD(state.range_seen.low)} – ${formatUSD(state.range_seen.high)}`}
          />
        ) : null}
        <ResultRow
          label="Comparable cars used"
          hint="Listed or sold on Sawa Cars"
          value={String(state.comparables)}
        />
      </div>

      <p className="rounded-xl bg-surface-alt px-4 py-3 text-micro leading-relaxed text-content-secondary">
        This is a market estimate, not an offer. The final asking price is yours — we confirm it
        with you after the 150-point inspection, when we know the car&apos;s real condition.
      </p>

      <NextSteps />
    </div>
  )
}

function NextSteps() {
  return (
    <div className="space-y-3 border-t border-line-soft pt-5">
      <Button
        href="/download"
        fullWidth
        className={WRAPPING_LABEL}
        trailingIcon={<Icon name="arrow-right" size={18} />}
      >
        Submit this car for inspection
      </Button>
      <p className="text-center text-micro leading-relaxed text-content-muted">
        Submission starts with a one-time ID check, which happens in the app.{' '}
        <a
          href={`https://wa.me/${CONTACT.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-brand hover:underline"
        >
          Or message us on WhatsApp
        </a>
        .
      </p>
    </div>
  )
}

export default ValuationTool
