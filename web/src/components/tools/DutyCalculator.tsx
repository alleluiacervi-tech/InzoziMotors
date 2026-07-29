'use client'

import { useMemo, useState } from 'react'
import { Button, Icon, LiveRegion } from '@/components/ui'
import { CC_BRACKETS, calcRwandaDuty, formatRWF, formatUSD, type CcBracket } from '@/lib/business'
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

const BRACKET_OPTIONS: readonly ChipOption<CcBracket>[] = CC_BRACKETS.map((bracket) => ({
  value: bracket.key,
  label: bracket.label,
  hint: bracket.hint,
}))

/** "25%", "1.5%" — one decimal only when it earns its place. */
function share(part: number, whole: number): string {
  if (!whole) return ''
  return `${Math.round((part / whole) * 1000) / 10}%`
}

export function DutyCalculator() {
  const [value, setValue] = useState('')
  const [bracket, setBracket] = useState<CcBracket>('medium')

  const vehicleValue = Number(value) || 0
  const duty = useMemo(() => calcRwandaDuty(vehicleValue, bracket), [vehicleValue, bracket])
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
            prefix="$"
            placeholder="15000"
            value={value}
            onChange={setValue}
            hint="What you pay the exporter, in US dollars, before shipping."
          />

          <ChipGroup
            name="duty-bracket"
            legend="Engine size"
            options={BRACKET_OPTIONS}
            value={bracket}
            onChange={setBracket}
            columns={2}
          />

          <p className="text-micro leading-relaxed text-content-muted">
            Excise is the only rate that moves with engine size. Everything else is charged the
            same way on every imported car.
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
                sub={formatRWF(duty.grandTotal)}
                note={`Duties add ${duty.effectiveRate}% on top of what you pay the exporter.`}
              />

              <div>
                <ResultRow
                  label="CIF value"
                  hint={`Purchase price plus ${share(duty.cif - vehicleValue, vehicleValue)} freight and insurance`}
                  value={formatUSD(duty.cif)}
                  sub={formatRWF(duty.cif)}
                />
                <ResultRow
                  label="Customs duty"
                  hint={`${share(duty.customs, duty.cif)} of CIF`}
                  value={formatUSD(duty.customs)}
                  sub={formatRWF(duty.customs)}
                />
                <ResultRow
                  label="Excise duty"
                  hint={`${share(duty.excise, duty.cif)} of CIF — set by engine size`}
                  value={formatUSD(duty.excise)}
                  sub={formatRWF(duty.excise)}
                />
                <ResultRow
                  label="VAT"
                  hint={`${share(duty.vat, duty.cif + duty.customs + duty.excise)} of CIF plus customs and excise`}
                  value={formatUSD(duty.vat)}
                  sub={formatRWF(duty.vat)}
                />
                <ResultRow
                  label="Infrastructure levy"
                  hint={`${share(duty.infra, duty.cif)} of CIF`}
                  value={formatUSD(duty.infra)}
                  sub={formatRWF(duty.infra)}
                />
                <ResultRow
                  label="Total duties and taxes"
                  value={formatUSD(duty.totalDuties)}
                  sub={formatRWF(duty.totalDuties)}
                  emphasis
                />
              </div>

              <p className="rounded-xl bg-surface-alt px-4 py-3 text-micro leading-relaxed text-content-secondary">
                An estimate for planning. RRA assesses duty against its own valuation of the
                vehicle, which can differ from your invoice — age, body type and condition all
                move the figure. The assessment at clearing is the one that counts.
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
              infrastructure levy.
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
