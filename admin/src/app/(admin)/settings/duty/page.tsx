'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Import duty rates.
//
// The rates are data so a correction is data entry rather than a release. The
// BASES they apply to are not editable here and deliberately so: choosing the
// wrong base is a modelling error, and it should cost a review and a deploy.
//
// The review date is a first-class field, not a footnote. What is genuinely
// uncertain is whether excise is assessed on CIF or on CIF plus customs — so
// the calculator states when a person last checked, and an unverified schedule
// reads as unverified instead of as confident.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Card, ErrorState, LoadingState, PageHeader } from '@/components/ui'
import { useToast } from '@/components/feedback'

const KEY = 'import_duty_rates'

const PERCENTS: [string, string, string][] = [
  ['freight_insurance_pct', 'Freight and insurance', 'Added to the assessed value to reach CIF'],
  ['customs_pct', 'Customs duty', 'Of CIF'],
  ['vat_pct', 'VAT', 'Of CIF plus customs and excise'],
  ['withholding_pct', 'Withholding tax', 'Of CIF'],
  ['infrastructure_pct', 'Infrastructure levy', 'Of CIF'],
]

export default function DutyRatesPage() {
  const toast = useToast()
  const [rates, setRates] = useState<any>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [problems, setProblems] = useState<string[]>([])

  async function load() {
    setLoading(true); setError(null)
    try {
      const rows = await api.settings()
      const row = rows.find((entry: any) => entry.key === KEY)
      setRates(row ? structuredClone(row.value) : null)
    } catch (e) { setError(e) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function save() {
    setSaving(true); setProblems([])
    try {
      await api.updateSetting(KEY, rates)
      toast('Rates saved. The public calculator picks them up immediately.', 'success')
      load()
    } catch (e: any) {
      // The server names the offending field; a form of twenty numbers cannot
      // be corrected from "Invalid value for import_duty_rates".
      setProblems(Array.isArray(e?.problems) ? e.problems : [e?.message || 'Could not save the rates.'])
      toast(e?.message || 'Could not save the rates.', 'error')
    } finally { setSaving(false) }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={load} />
  if (!rates) {
    return (
      <Card className="p-6">
        <p className="font-bold text-content">No duty rate schedule stored</p>
        <p className="mt-1 text-label text-content-muted">Migration 0024 has not been applied to this database.</p>
      </Card>
    )
  }

  const field = (value: number, onChange: (n: number) => void, key: string) => (
    <input
      type="number" step="0.1" min="0" max="100" value={value} id={key}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-11 w-28 rounded-xl border border-line bg-surface px-3 text-body tabular-nums focus:border-content-muted focus:outline-none"
    />
  )

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Import duty rates"
        description="What the public duty calculator charges. Rates are editable here; the bases they apply to live in code and change only with a review."
      />

      {problems.length ? (
        <Card className="mb-5 border-danger p-4">
          <p className="text-label font-bold text-danger-strong">Not saved</p>
          <ul className="mt-1.5 grid gap-1 text-label text-content">
            {problems.map((problem) => <li key={problem}>· {problem}</li>)}
          </ul>
        </Card>
      ) : null}

      <Card className="mb-5 p-5">
        <h2 className="mb-3 text-caption font-bold uppercase tracking-widest text-content-muted">Flat rates</h2>
        <div className="grid gap-3">
          {PERCENTS.map(([key, label, hint]) => (
            <div key={key} className="flex flex-wrap items-center gap-3 border-b border-line-soft pb-3 last:border-0 last:pb-0">
              <label htmlFor={key} className="min-w-[12rem] flex-1">
                <span className="block text-label font-semibold text-content">{label}</span>
                <span className="block text-caption text-content-muted">{hint}</span>
              </label>
              {field(rates[key], (n) => setRates({ ...rates, [key]: n }), key)}
              <span className="text-label text-content-muted">%</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-5 p-5">
        <h2 className="mb-1 text-caption font-bold uppercase tracking-widest text-content-muted">Excise by engine size</h2>
        <p className="mb-3 text-caption text-content-muted">
          Ascending, and the last bracket must be open-ended so a very large engine still lands somewhere.
        </p>
        <div className="grid gap-3">
          {rates.excise_brackets.map((bracket: any, index: number) => (
            <div key={index} className="flex flex-wrap items-center gap-3 border-b border-line-soft pb-3 last:border-0 last:pb-0">
              <input
                value={bracket.label}
                onChange={(e) => {
                  const next = structuredClone(rates)
                  next.excise_brackets[index].label = e.target.value
                  setRates(next)
                }}
                className="h-11 min-w-[10rem] flex-1 rounded-xl border border-line bg-surface px-3 text-body focus:border-content-muted focus:outline-none"
              />
              <span className="text-caption text-content-muted">up to</span>
              <input
                type="number" min="1" placeholder="no limit"
                value={bracket.max_cc ?? ''}
                onChange={(e) => {
                  const next = structuredClone(rates)
                  next.excise_brackets[index].max_cc = e.target.value === '' ? null : Number(e.target.value)
                  setRates(next)
                }}
                className="h-11 w-28 rounded-xl border border-line bg-surface px-3 text-body tabular-nums focus:border-content-muted focus:outline-none"
              />
              <span className="text-caption text-content-muted">cc</span>
              {field(bracket.rate_pct, (n) => {
                const next = structuredClone(rates)
                next.excise_brackets[index].rate_pct = n
                setRates(next)
              }, `excise-${index}`)}
              <span className="text-label text-content-muted">%</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-5 p-5">
        <h2 className="mb-1 text-caption font-bold uppercase tracking-widest text-content-muted">
          Depreciation allowance by age
        </h2>
        <p className="mb-3 text-caption text-content-muted">
          The EAC schedule. An older vehicle is assessed on a reduced value, which the previous
          calculator ignored entirely.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {rates.depreciation.map((band: any, index: number) => (
            <div key={index} className="flex items-center gap-3">
              <span className="min-w-[7rem] text-label text-content">From {band.min_age_years} years</span>
              {field(band.allowance_pct, (n) => {
                const next = structuredClone(rates)
                next.depreciation[index].allowance_pct = n
                setRates(next)
              }, `dep-${index}`)}
              <span className="text-label text-content-muted">%</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-5 p-5">
        <h2 className="mb-1 text-caption font-bold uppercase tracking-widest text-content-muted">Last reviewed</h2>
        <p className="mb-3 text-caption text-content-muted">
          Shown to the public beside the estimate. Set it to today when you have checked these
          figures against the current RRA schedule — that is what stops an old number reading as a
          confident one.
        </p>
        <input
          type="date" value={rates.reviewed_on || ''}
          onChange={(e) => setRates({ ...rates, reviewed_on: e.target.value })}
          className="h-11 rounded-xl border border-line bg-surface px-3 text-body focus:border-content-muted focus:outline-none"
        />
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={saving}
          className="rounded-xl bg-brand px-5 py-3 text-label font-bold text-brand-on hover:bg-brand-bright disabled:opacity-50">
          {saving ? 'Saving…' : 'Save rates'}
        </button>
        <Link href="/settings" className="text-label font-semibold text-content-muted hover:text-content">
          Back to settings
        </Link>
      </div>
    </div>
  )
}
