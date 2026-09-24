'use client'

import { useMemo, useState } from 'react'
import { Button, Icon, LiveRegion } from '@/components/ui'
import { calcRwandaDuty, formatMoney, getDutyRates } from '@/lib/business'
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
// Rwanda import duty.
//
// The arithmetic is calcRwandaDuty() in lib/business — the same formula the app
// runs, so the two products never quote different landed costs. Nothing is
// recomputed here; the percentages shown against each line are derived from the
// figures the function returned, which means the labels cannot drift out of
// step with the maths behind them.
// ─────────────────────────────────────────────────────────────────────────────

// Brackets, their labels AND their percentages all come from the server-held
// schedule. The old version hardcoded "20% excise" in a hint beside a rate the
// function no longer used — a label that can disagree with the maths is worse
// than no label, because it is the one a reader believes.

/** "25%", "1.5%" — one decimal only when it earns its place. */
function share(part: number, whole: number): string {
  if (!whole) return ''
  return `${Math.round((part / whole) * 1000) / 10}%`
}

export function DutyCalculator({
  initialValueRwf,
  initialAgeYears,
}: {
  /** Prefill, e.g. from /imports?price_usd= converted at the live rate. */
  initialValueRwf?: number
  /** Prefill; snapped to the nearest age option below. */
  initialAgeYears?: number
} = {}) {
  const t = useT()
  const rates = getDutyRates()

  const AGE_OPTIONS: readonly ChipOption<number>[] = [
    { value: 0, label: t('tools.dutyCalc.ageUnder2'), hint: t('tools.dutyCalc.noAllowance') },
    { value: 3, label: t('tools.dutyCalc.age2to4') },
    { value: 5, label: t('tools.dutyCalc.age4to6') },
    { value: 7, label: t('tools.dutyCalc.age6to8') },
    { value: 9, label: t('tools.dutyCalc.age8to10') },
    { value: 11, label: t('tools.dutyCalc.ageOver10') },
  ]

  const bracketOptions: readonly ChipOption<number>[] = useMemo(
    () =>
      rates.excise_brackets.map((bracket) => ({
        value: bracket.max_cc ?? Number.MAX_SAFE_INTEGER,
        label: bracket.label,
        hint: t('tools.dutyCalc.exciseWord', { pct: bracket.rate_pct }),
      })),
    [rates, t]
  )

  const [value, setValue] = useState(initialValueRwf ? String(Math.round(initialValueRwf)) : '')
  const [cc, setCc] = useState<number>(() => rates.excise_brackets[0]?.max_cc ?? 1500)
  const [ageYears, setAgeYears] = useState<number>(() => {
    if (initialAgeYears == null) return 0
    // The option whose band holds this age: 0 (<2), 3 (2-4), 5, 7, 9, 11 (10+).
    const options = AGE_OPTIONS.map((o) => o.value)
    return options.reduce((best, v) => (Math.abs(v - initialAgeYears) < Math.abs(best - initialAgeYears) ? v : best), 0)
  })

  const vehicleValue = Number(value) || 0
  const duty = useMemo(
    () => calcRwandaDuty(vehicleValue, cc, ageYears, rates),
    [vehicleValue, cc, ageYears, rates]
  )
  const hasValue = vehicleValue > 0

  return (
    <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
      {/* ─── Inputs ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-line-soft bg-surface p-5 shadow-card sm:p-6 lg:col-span-2">
        <h3 className="text-caption font-bold text-content-muted">
          {t('tools.dutyCalc.theVehicle')}
        </h3>

        <div className="mt-4 space-y-6">
          <NumberField
            id="duty-value"
            label={t('tools.dutyCalc.purchasePrice')}
            prefix="RWF"
            placeholder="15000"
            value={value}
            onChange={setValue}
            hint={t('tools.dutyCalc.purchasePriceHint')}
          />

          <ChipGroup
            name="duty-bracket"
            legend={t('tools.dutyCalc.engineSize')}
            options={bracketOptions}
            value={cc}
            onChange={setCc}
            columns={2}
          />

          <ChipGroup
            name="duty-age"
            legend={t('tools.dutyCalc.vehicleAge')}
            options={AGE_OPTIONS}
            value={ageYears}
            onChange={setAgeYears}
            columns={2}
          />

          <p className="text-micro leading-relaxed text-content-muted">
            {t('tools.dutyCalc.note')}
          </p>
        </div>
      </div>

      {/* ─── Breakdown ────────────────────────────────────────────────────── */}
      <div className="lg:col-span-3">
        <ResultPanel
          title={t('tools.dutyCalc.estimatedLanded')}
          className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]"
        >
          {hasValue ? (
            <div className="space-y-5">
              <Headline
                label={t('tools.dutyCalc.landedLabel')}
                value={ formatMoney(duty.grandTotal) }
                note={t('tools.dutyCalc.landedNote', { pct: duty.effectiveRate })}
              />

              <div>
                {duty.depreciationPct > 0 ? (
                  <ResultRow
                    label={t('tools.dutyCalc.assessedValue')}
                    hint={t('tools.dutyCalc.assessedHint', { pct: duty.depreciationPct })}
                    value={ formatMoney(duty.dutiableValue) }
                  />
                ) : null}
                <ResultRow
                  label={t('tools.dutyCalc.cifValue')}
                  hint={t('tools.dutyCalc.cifHint', { pct: share(duty.cif - duty.dutiableValue, duty.dutiableValue) })}
                  value={ formatMoney(duty.cif) }
                />
                <ResultRow
                  label={t('tools.dutyCalc.customsDuty')}
                  hint={t('tools.dutyCalc.customsHint', { pct: share(duty.customs, duty.cif) })}
                  value={ formatMoney(duty.customs) }
                />
                <ResultRow
                  label={t('tools.dutyCalc.exciseDuty')}
                  hint={t('tools.dutyCalc.exciseHint', { pct: duty.exciseRatePct })}
                  value={ formatMoney(duty.excise) }
                />
                <ResultRow
                  label={t('tools.dutyCalc.vat')}
                  hint={t('tools.dutyCalc.vatHint', { pct: share(duty.vat, duty.cif + duty.customs + duty.excise) })}
                  value={ formatMoney(duty.vat) }
                />
                <ResultRow
                  label={t('tools.dutyCalc.withholding')}
                  hint={t('tools.dutyCalc.withholdingHint', { pct: share(duty.withholding, duty.cif) })}
                  value={ formatMoney(duty.withholding) }
                />
                <ResultRow
                  label={t('tools.dutyCalc.infra')}
                  hint={t('tools.dutyCalc.infraHint', { pct: share(duty.infra, duty.cif) })}
                  value={ formatMoney(duty.infra) }
                />
                <ResultRow
                  label={t('tools.dutyCalc.totalDuties')}
                  value={ formatMoney(duty.totalDuties) }
                  emphasis
                />
              </div>

              <p className="rounded-xl bg-surface-alt px-4 py-3 text-micro leading-relaxed text-content-secondary">
                {t('tools.dutyCalc.disclaimer')}
                {duty.reviewedOn ? ` ${t('tools.dutyCalc.ratesReviewed', { date: duty.reviewedOn })}` : ''}
              </p>

              <div className="border-t border-line-soft pt-5">
                <Button
                  href="/cars"
                  variant="outline"
                  fullWidth
                  className={WRAPPING_LABEL}
                  trailingIcon={<Icon name="arrow-right" size={18} />}
                >
                  {t('tools.dutyCalc.compareBtn')}
                </Button>
              </div>
            </div>
          ) : (
            <ResultPlaceholder>
              {t('tools.dutyCalc.placeholder')}
            </ResultPlaceholder>
          )}
        </ResultPanel>

        <LiveRegion>
          {hasValue
            ? t('tools.dutyCalc.liveResult', { total: formatMoney(duty.grandTotal), duties: formatMoney(duty.totalDuties) })
            : ''}
        </LiveRegion>
      </div>
    </div>
  )
}

export default DutyCalculator
