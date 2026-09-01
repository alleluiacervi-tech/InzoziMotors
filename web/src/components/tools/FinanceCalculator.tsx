'use client'

import { useMemo, useState } from 'react'
import { Button, Icon, LiveRegion } from '@/components/ui'
import { FINANCE_TERMS, formatUSD, monthlyEstimate } from '@/lib/business'
import { useT } from '@/lib/i18n/context'
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
  const t = useT()
  const [mode, setMode] = useState<'price' | 'budget'>('price')
  const [price, setPrice] = useState('')
  const [budget, setBudget] = useState('')
  const [deposit, setDeposit] = useState(String(FINANCE_TERMS.downPaymentPct))
  const [term, setTerm] = useState(String(FINANCE_TERMS.termMonths))

  const TERM_OPTIONS: readonly ChipOption<string>[] = [12, 24, 36, 48, 60].map((months) => ({
    value: String(months),
    label: t('tools.financeCalc.months', { months }),
    hint: months === FINANCE_TERMS.termMonths ? t('tools.financeCalc.standard') : undefined,
  }))

  const MODE_OPTIONS: readonly ChipOption<'price' | 'budget'>[] = [
    { value: 'price', label: t('tools.financeCalc.fromPrice') },
    { value: 'budget', label: t('tools.financeCalc.fromBudget') },
  ]

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
          {t('tools.financeCalc.yourNumbers')}
        </h3>

        <div className="mt-4 space-y-6">
          <ChipGroup
            name="finance-mode"
            legend={t('tools.financeCalc.startFrom')}
            options={MODE_OPTIONS}
            value={mode}
            onChange={setMode}
            columns={2}
          />

          {mode === 'price' ? (
            <NumberField
              id="finance-price"
              label={t('tools.financeCalc.carPrice')}
              prefix="RWF"
              placeholder="18000"
              value={price}
              onChange={setPrice}
              hint={t('tools.financeCalc.carPriceHint')}
            />
          ) : (
            <NumberField
              id="finance-budget"
              label={t('tools.financeCalc.monthlyBudget')}
              prefix="RWF"
              placeholder="400"
              value={budget}
              onChange={setBudget}
              hint={t('tools.financeCalc.monthlyBudgetHint')}
            />
          )}

          <NumberField
            id="finance-deposit"
            label={t('tools.financeCalc.deposit')}
            suffix="%"
            placeholder={String(FINANCE_TERMS.downPaymentPct)}
            value={deposit}
            onChange={setDeposit}
            hint={t('tools.financeCalc.depositHint', { pct: FINANCE_TERMS.downPaymentPct, max: MAX_DEPOSIT_PCT })}
          />

          <ChipGroup
            name="finance-term"
            legend={t('tools.financeCalc.repaymentTerm')}
            options={TERM_OPTIONS}
            value={term}
            onChange={setTerm}
          />
        </div>
      </div>

      {/* ─── Result ───────────────────────────────────────────────────────── */}
      <div className="lg:col-span-3">
        <ResultPanel
          title={mode === 'price' ? t('tools.financeCalc.estimatedRepayment') : t('tools.financeCalc.whatYouCanAfford')}
          className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]"
        >
          {!hasResult ? (
            <ResultPlaceholder>
              {mode === 'price'
                ? t('tools.financeCalc.placeholderPrice')
                : t('tools.financeCalc.placeholderBudget')}
            </ResultPlaceholder>
          ) : mode === 'price' ? (
            <div className="space-y-5">
              <Headline
                label={t('tools.financeCalc.overMonths', { months, rate: FINANCE_TERMS.annualRatePct })}
                value={t('tools.financeCalc.perMonth', { amount: formatUSD(fromPrice.monthly) })}
                note={
                  onStandardTerms
                    ? undefined
                    : t('tools.financeCalc.standardNote', {
                        deposit: FINANCE_TERMS.downPaymentPct,
                        months: FINANCE_TERMS.termMonths,
                        amount: formatUSD(monthlyEstimate(fromPrice.carPrice)),
                      })
                }
              />

              <div>
                <ResultRow
                  label={t('tools.financeCalc.depositRow')}
                  hint={t('tools.financeCalc.depositRowHint', { pct: depositPct })}
                  value={formatUSD(fromPrice.depositAmount)}
                />
                <ResultRow
                  label={t('tools.financeCalc.amountFinanced')}
                  value={formatUSD(fromPrice.financed)}
                />
                <ResultRow
                  label={t('tools.financeCalc.interestRow')}
                  hint={t('tools.financeCalc.interestHint')}
                  value={formatUSD(fromPrice.totalInterest)}
                />
                <ResultRow
                  label={t('tools.financeCalc.totalYouPay')}
                  hint={t('tools.financeCalc.totalHint')}
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
                  {t('tools.financeCalc.browseUpTo', { amount: formatUSD(fromPrice.carPrice) })}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <Headline
                label={t('tools.financeCalc.payingMonth', { amount: formatUSD(fromBudget.monthly), months })}
                value={t('tools.financeCalc.upTo', { amount: formatUSD(fromBudget.maxPrice) })}
                note={t('tools.financeCalc.budgetNote', { deposit: depositPct, rate: FINANCE_TERMS.annualRatePct })}
              />

              <div>
                <ResultRow
                  label={t('tools.financeCalc.depositNeeded')}
                  hint={t('tools.financeCalc.depositNeededHint', { pct: depositPct })}
                  value={formatUSD(fromBudget.depositNeeded)}
                />
                <ResultRow
                  label={t('tools.financeCalc.amountFinanced')}
                  value={formatUSD(fromBudget.financed)}
                />
                <ResultRow
                  label={t('tools.financeCalc.totalYouPay')}
                  hint={t('tools.financeCalc.totalHint')}
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
                  {t('tools.financeCalc.browseUpTo', { amount: formatUSD(fromBudget.maxPrice) })}
                </Button>
              </div>
            </div>
          )}
        </ResultPanel>

        <LiveRegion>
          {!hasResult
            ? ''
            : mode === 'price'
              ? t('tools.financeCalc.liveResultPrice', { amount: formatUSD(fromPrice.monthly), months })
              : t('tools.financeCalc.liveResultBudget', { amount: formatUSD(fromBudget.monthly), max: formatUSD(fromBudget.maxPrice) })}
        </LiveRegion>
      </div>
    </div>
  )
}

function Disclaimer() {
  const t = useT()
  return (
    <p className="rounded-xl bg-surface-alt px-4 py-3 text-micro leading-relaxed text-content-secondary">
      {t('tools.financeCalc.disclaimer', { rate: FINANCE_TERMS.annualRatePct })}
    </p>
  )
}

export default FinanceCalculator
