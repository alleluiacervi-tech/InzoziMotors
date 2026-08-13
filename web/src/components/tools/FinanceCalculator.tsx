'use client'

import { useMemo, useState } from 'react'
import { Button, Icon, LiveRegion } from '@/components/ui'
import { FINANCE_TERMS, formatUSD, monthlyEstimate } from '@/lib/business'
import {
  ChipGroup,
  Headline,
  NumberField,
  ResultPanel,
  ResultPlaceholder,
  ResultRow,
  WRAPPING_LABEL,
  type ChipOption,
} from './ToolPrimitives'

// ─────────────────────────────────────────────────────────────────────────────
// Monthly payment estimator.
//
// monthlyEstimate() in lib/business is this same PMT formula frozen at Sawa's
// standard terms (20% deposit, 60 months). Letting the visitor move the deposit
// and the term means running the formula again, so it is written once here and
// seeded from FINANCE_TERMS — at 20% / 60 months the two agree by construction,
// which is what keeps the listing cards and this page telling one story.
//
// Sawa Cars does not lend. The rate is a representative Kigali market rate; the
// bank quotes its own.
// ─────────────────────────────────────────────────────────────────────────────

const MONTHLY_RATE = FINANCE_TERMS.annualRatePct / 100 / 12

const TERM_OPTIONS: readonly ChipOption<string>[] = [12, 24, 36, 48, 60].map((months) => ({
  value: String(months),
  label: `${months} mo`,
  hint: months === FINANCE_TERMS.termMonths ? 'standard' : undefined,
}))

const MODE_OPTIONS: readonly ChipOption<'price' | 'budget'>[] = [
  { value: 'price', label: 'From a price' },
  { value: 'budget', label: 'From a budget' },
]

/** Maximum deposit the form accepts — above this the loan stops being a loan. */
const MAX_DEPOSIT_PCT = 90

function pmt(principal: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0
  if (MONTHLY_RATE === 0) return Math.round(principal / months)
  return Math.round((principal * MONTHLY_RATE) / (1 - Math.pow(1 + MONTHLY_RATE, -months)))
}

/** Inverse PMT — the most that can be borrowed at a given monthly payment. */
function principalFor(monthly: number, months: number): number {
  if (monthly <= 0 || months <= 0) return 0
  if (MONTHLY_RATE === 0) return monthly * months
  return (monthly * (1 - Math.pow(1 + MONTHLY_RATE, -months))) / MONTHLY_RATE
}

export function FinanceCalculator() {
  const [mode, setMode] = useState<'price' | 'budget'>('price')
  const [price, setPrice] = useState('')
  const [budget, setBudget] = useState('')
  const [deposit, setDeposit] = useState(String(FINANCE_TERMS.downPaymentPct))
  const [term, setTerm] = useState(String(FINANCE_TERMS.termMonths))

  const months = Number(term) || FINANCE_TERMS.termMonths
  const depositPct = Math.min(Math.max(Number(deposit) || 0, 0), MAX_DEPOSIT_PCT)
  const onStandardTerms =
    depositPct === FINANCE_TERMS.downPaymentPct && months === FINANCE_TERMS.termMonths

  const fromPrice = useMemo(() => {
    const carPrice = Number(price) || 0
    const depositAmount = Math.round((carPrice * depositPct) / 100)
    const financed = carPrice - depositAmount
    const monthly = pmt(financed, months)
    return {
      carPrice,
      depositAmount,
      financed,
      monthly,
      totalRepaid: monthly * months + depositAmount,
      totalInterest: monthly * months - financed,
    }
  }, [price, depositPct, months])

  const fromBudget = useMemo(() => {
    const monthly = Number(budget) || 0
    const loan = principalFor(monthly, months)
    const rawPrice = depositPct >= 100 ? 0 : loan / (1 - depositPct / 100)
    // Rounded down to a clean figure — a max price of $23,417 reads like a
    // precision this estimate does not have.
    const maxPrice = Math.floor(rawPrice / 500) * 500
    return {
      monthly,
      maxPrice,
      depositNeeded: Math.round((maxPrice * depositPct) / 100),
      financed: maxPrice - Math.round((maxPrice * depositPct) / 100),
    }
  }, [budget, depositPct, months])

  const hasResult = mode === 'price' ? fromPrice.carPrice > 0 : fromBudget.maxPrice > 0

  return (
    <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
      {/* ─── Inputs ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-line-soft bg-surface p-5 shadow-card sm:p-6 lg:col-span-2">
        <h3 className="text-caption font-bold uppercase tracking-wide text-content-muted">
          Your numbers
        </h3>

        <div className="mt-4 space-y-6">
          <ChipGroup
            name="finance-mode"
            legend="Start from"
            options={MODE_OPTIONS}
            value={mode}
            onChange={setMode}
            columns={2}
          />

          {mode === 'price' ? (
            <NumberField
              id="finance-price"
              label="Car price"
              prefix="RWF"
              placeholder="18000"
              value={price}
              onChange={setPrice}
              hint="The asking price on the listing."
            />
          ) : (
            <NumberField
              id="finance-budget"
              label="Monthly budget"
              prefix="RWF"
              placeholder="400"
              value={budget}
              onChange={setBudget}
              hint="What you can comfortably pay each month."
            />
          )}

          <NumberField
            id="finance-deposit"
            label="Deposit"
            suffix="%"
            placeholder={String(FINANCE_TERMS.downPaymentPct)}
            value={deposit}
            onChange={setDeposit}
            hint={`Banks in Kigali typically want ${FINANCE_TERMS.downPaymentPct}% down. Up to ${MAX_DEPOSIT_PCT}%.`}
          />

          <ChipGroup
            name="finance-term"
            legend="Repayment term"
            options={TERM_OPTIONS}
            value={term}
            onChange={setTerm}
          />
        </div>
      </div>

      {/* ─── Result ───────────────────────────────────────────────────────── */}
      <div className="lg:col-span-3">
        <ResultPanel
          title={mode === 'price' ? 'Estimated repayment' : 'What you can afford'}
          className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]"
        >
          {!hasResult ? (
            <ResultPlaceholder>
              {mode === 'price'
                ? 'Enter a car price to see the monthly payment, the deposit and the total cost of the loan.'
                : 'Enter what you can pay each month to see the car price it supports.'}
            </ResultPlaceholder>
          ) : mode === 'price' ? (
            <div className="space-y-5">
              <Headline
                label={`Over ${months} months at ${FINANCE_TERMS.annualRatePct}% a year`}
                value={`${formatUSD(fromPrice.monthly)}/mo`}
                note={
                  onStandardTerms
                    ? undefined
                    : `At the standard ${FINANCE_TERMS.downPaymentPct}% over ${FINANCE_TERMS.termMonths} months it would be ${formatUSD(monthlyEstimate(fromPrice.carPrice))}/mo — the figure shown on listing cards.`
                }
              />

              <div>
                <ResultRow
                  label="Deposit"
                  hint={`${depositPct}% of the price, paid at the center`}
                  value={formatUSD(fromPrice.depositAmount)}
                />
                <ResultRow
                  label="Amount financed"
                  value={formatUSD(fromPrice.financed)}
                />
                <ResultRow
                  label="Interest over the term"
                  hint="At the representative rate below"
                  value={formatUSD(fromPrice.totalInterest)}
                />
                <ResultRow
                  label="Total you pay"
                  hint="Deposit plus every repayment"
                  value={formatUSD(fromPrice.totalRepaid)}
                  emphasis
                />
              </div>

              <Disclaimer />

              <div className="border-t border-line-soft pt-5">
                <Button
                  href={`/cars?max_price=${fromPrice.carPrice}`}
                  fullWidth
                  className={WRAPPING_LABEL}
                  trailingIcon={<Icon name="arrow-right" size={18} />}
                >
                  Browse certified cars up to {formatUSD(fromPrice.carPrice)}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <Headline
                label={`Paying ${formatUSD(fromBudget.monthly)} a month for ${months} months`}
                value={`Up to ${formatUSD(fromBudget.maxPrice)}`}
                note={`Assumes a ${depositPct}% deposit at ${FINANCE_TERMS.annualRatePct}% a year.`}
              />

              <div>
                <ResultRow
                  label="Deposit you would need"
                  hint={`${depositPct}% of the car price`}
                  value={formatUSD(fromBudget.depositNeeded)}
                />
                <ResultRow
                  label="Amount financed"
                  value={formatUSD(fromBudget.financed)}
                />
                <ResultRow
                  label="Total you pay"
                  hint="Deposit plus every repayment"
                  value={formatUSD(fromBudget.depositNeeded + fromBudget.monthly * months)}
                  emphasis
                />
              </div>

              <Disclaimer />

              <div className="border-t border-line-soft pt-5">
                <Button
                  href={`/cars?max_price=${fromBudget.maxPrice}`}
                  fullWidth
                  className={WRAPPING_LABEL}
                  trailingIcon={<Icon name="arrow-right" size={18} />}
                >
                  Browse certified cars up to {formatUSD(fromBudget.maxPrice)}
                </Button>
              </div>
            </div>
          )}
        </ResultPanel>

        <LiveRegion>
          {!hasResult
            ? ''
            : mode === 'price'
              ? `Estimated ${formatUSD(fromPrice.monthly)} a month over ${months} months.`
              : `A budget of ${formatUSD(fromBudget.monthly)} a month supports a car up to ${formatUSD(fromBudget.maxPrice)}.`}
        </LiveRegion>
      </div>
    </div>
  )
}

function Disclaimer() {
  return (
    <p className="rounded-xl bg-surface-alt px-4 py-3 text-micro leading-relaxed text-content-secondary">
      Sawa Cars does not lend and does not arrange finance. {FINANCE_TERMS.annualRatePct}% a year is a
      representative Kigali market rate — your bank sets its own based on your profile, and usually
      adds arrangement fees and required insurance on top. Treat this as a starting point for that
      conversation.
    </p>
  )
}

export default FinanceCalculator
