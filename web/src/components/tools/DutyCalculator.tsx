'use client'

import { useMemo, useState } from 'react'
import { Button, Icon, LiveRegion } from '@/components/ui'
import { calcRwandaDuty, formatUSD, getDutyRates } from '@/lib/business'
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

const AGE_OPTIONS: readonly ChipOption<number>[] = [
  { value: 0, label: 'Under 2 years', hint: 'No allowance' },
  { value: 3, label: '2 – 4 years' },
  { value: 5, label: '4 – 6 years' },
  { value: 7, label: '6 – 8 years' },
  { value: 9, label: '8 – 10 years' },
  { value: 11, label: 'Over 10 years' },
]

export function DutyCalculator() {
  const rates = getDutyRates()
  const bracketOptions: readonly ChipOption<number>[] = useMemo(
    () =>
      rates.excise_brackets.map((bracket) => ({
        value: bracket.max_cc ?? Number.MAX_SAFE_INTEGER,
        label: bracket.label,
        hint: `${bracket.rate_pct}% excise`,
      })),
    [rates]
  )

  const [value, setValue] = useState('')
  const [cc, setCc] = useState<number>(() => rates.excise_brackets[0]?.max_cc ?? 1500)
  const [ageYears, setAgeYears] = useState<number>(0)

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
        <h3 className="text-caption font-bold uppercase tracking-wide text-content-muted">
          The vehicle
        </h3>

        <div className="mt-4 space-y-6">
          <NumberField
            id="duty-value"
            label="Purchase price"
            prefix="RWF"
            placeholder="15000"
            value={value}
            onChange={setValue}
            hint="What you pay for the vehicle before shipping, entered in RWF."
          />

          <ChipGroup
            name="duty-bracket"
            legend="Engine size"
            options={bracketOptions}
            value={cc}
            onChange={setCc}
            columns={2}
          />

          <ChipGroup
            name="duty-age"
            legend="Vehicle age"
            options={AGE_OPTIONS}
            value={ageYears}
            onChange={setAgeYears}
            columns={2}
          />

          <p className="text-micro leading-relaxed text-content-muted">
            Excise moves with engine size, and an older vehicle is assessed on a reduced value
            under the EAC depreciation schedule. Everything else is charged the same way on every
            imported car.
          </p>
        </div>
      </div>

      {/* ─── Breakdown ────────────────────────────────────────────────────── */}
      <div className="lg:col-span-3">
        <ResultPanel
          title="Estimated landed cost"
          className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]"
        >
          {hasValue ? (
            <div className="space-y-5">
              <Headline
                label="Purchase price plus duties and taxes"
                value={formatUSD(duty.grandTotal)}
                note={`Duties add ${duty.effectiveRate}% on top of what you pay the exporter.`}
              />

              <div>
                {duty.depreciationPct > 0 ? (
                  <ResultRow
                    label="Value assessed for duty"
                    hint={`${duty.depreciationPct}% depreciation allowance for the vehicle's age`}
                    value={formatUSD(duty.dutiableValue)}
                  />
                ) : null}
                <ResultRow
                  label="CIF value"
                  hint={`Assessed value plus ${share(duty.cif - duty.dutiableValue, duty.dutiableValue)} freight and insurance`}
                  value={formatUSD(duty.cif)}
                />
                <ResultRow
                  label="Customs duty"
                  hint={`${share(duty.customs, duty.cif)} of CIF`}
                  value={formatUSD(duty.customs)}
                />
                <ResultRow
                  label="Excise duty"
                  hint={`${duty.exciseRatePct}% of CIF plus customs — set by engine size`}
                  value={formatUSD(duty.excise)}
                />
                <ResultRow
                  label="VAT"
                  hint={`${share(duty.vat, duty.cif + duty.customs + duty.excise)} of CIF plus customs and excise`}
                  value={formatUSD(duty.vat)}
                />
                <ResultRow
                  label="Withholding tax"
                  hint={`${share(duty.withholding, duty.cif)} of CIF`}
                  value={formatUSD(duty.withholding)}
                />
                <ResultRow
                  label="Infrastructure levy"
                  hint={`${share(duty.infra, duty.cif)} of CIF`}
                  value={formatUSD(duty.infra)}
                />
                <ResultRow
                  label="Total duties and taxes"
                  value={formatUSD(duty.totalDuties)}
                  emphasis
                />
              </div>

              <p className="rounded-xl bg-surface-alt px-4 py-3 text-micro leading-relaxed text-content-secondary">
                An estimate for planning. RRA assesses duty against its own valuation of the
                vehicle, which can differ from your invoice — age, body type and condition all
                move the figure. The assessment at clearing is the one that counts.
                {duty.reviewedOn ? ` Rates last reviewed ${duty.reviewedOn}.` : ''}
              </p>

              <div className="border-t border-line-soft pt-5">
                <Button
                  href="/cars"
                  variant="outline"
                  fullWidth
                  className={WRAPPING_LABEL}
                  trailingIcon={<Icon name="arrow-right" size={18} />}
                >
                  Compare against cars already in Rwanda
                </Button>
              </div>
            </div>
          ) : (
            <ResultPlaceholder>
              Enter a purchase price to see the full breakdown — CIF, customs, excise, VAT and the
              withholding tax and the infrastructure levy.
            </ResultPlaceholder>
          )}
        </ResultPanel>

        <LiveRegion>
          {hasValue
            ? `Estimated landed cost ${formatUSD(duty.grandTotal)}, of which ${formatUSD(duty.totalDuties)} is duties and taxes.`
            : ''}
        </LiveRegion>
      </div>
    </div>
  )
}

export default DutyCalculator
