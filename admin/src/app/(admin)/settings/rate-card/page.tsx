'use client'

// ─────────────────────────────────────────────────────────────────────────────
// The rate card — what Sawa actually charges.
//
// The business-model reassessment found three lines already built (a walk-in
// inspection, a resold report, a rental listing subscription) and not one of
// them had a price. Every amount was typed by hand per transaction. This is
// the form that turns each into a number a customer can be quoted before
// they show up, and that fee-recording forms elsewhere in the console
// prefill from.
//
// Same discipline as the duty calculator: `reviewed_on` is a first-class
// field, not a footnote, so a starting number that has never been checked
// against the market reads as unreviewed rather than as confident.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Card, ErrorState, LoadingState, PageHeader } from '@/components/ui'
import { useToast } from '@/components/feedback'

const KEY = 'service_rates'

const AMOUNTS: [string, string, string][] = [
  ['inspection_fee_rwf', 'Walk-in inspection', 'Charged at the office for a standalone 150-point inspection'],
  ['report_resale_fee_rwf', 'Report resale', 'A second reader buying access to a report already paid for once'],
  ['rental_subscription_monthly_rwf', 'Rental listing subscription', 'Per vehicle, per month, to stay visible in the rental fleet'],
]

export default function ServiceRatesPage() {
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
      toast('Rates saved. The public pricing page and fee forms pick them up immediately.', 'success')
      load()
    } catch (e: any) {
      // The server names the offending field; a form of three amounts cannot
      // be corrected from "Invalid value for service_rates".
      setProblems(Array.isArray(e?.problems) ? e.problems : [e?.message || 'Could not save the rates.'])
      toast(e?.message || 'Could not save the rates.', 'error')
    } finally { setSaving(false) }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={load} />
  if (!rates) {
    return (
      <Card className="p-6">
        <p className="font-bold text-content">No rate card stored</p>
        <p className="mt-1 text-label text-content-muted">Migration 0038 has not been applied to this database.</p>
      </Card>
    )
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Rate card"
        description="Prices for the lines Sawa already charges for. Editable here; the public pricing page and the inspection/subscription forms read the same numbers."
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
          {AMOUNTS.map(([key, label, hint]) => (
            <div key={key} className="flex flex-wrap items-center gap-3 border-b border-line-soft pb-3 last:border-0 last:pb-0">
              <label htmlFor={key} className="min-w-[14rem] flex-1">
                <span className="block text-label font-semibold text-content">{label}</span>
                <span className="block text-caption text-content-muted">{hint}</span>
              </label>
              <input
                type="number" step="1" min="0" value={rates[key]} id={key}
                onChange={(e) => setRates({ ...rates, [key]: Number(e.target.value) })}
                className="h-11 w-32 rounded-xl border border-line bg-surface px-3 text-body tabular-nums focus:border-content-muted focus:outline-none"
              />
              <span className="text-label text-content-muted">RWF</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-5 p-5">
        <h2 className="mb-1 text-caption font-bold uppercase tracking-widest text-content-muted">Last reviewed</h2>
        <p className="mb-3 text-caption text-content-muted">
          Shown on the public pricing page. Set it to today when you have deliberately checked
          these figures — that is what stops a starting number reading as a researched one.
        </p>
        <input
          type="date" value={rates.reviewed_on || ''}
          onChange={(e) => setRates({ ...rates, reviewed_on: e.target.value })}
          className="h-11 rounded-xl border border-line bg-surface px-3 text-body focus:border-content-muted focus:outline-none"
        />
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={saving}
          className="rounded-xl bg-brand px-5 py-3 text-label font-bold text-white hover:bg-brand-bright disabled:opacity-50">
          {saving ? 'Saving…' : 'Save rates'}
        </button>
        <Link href="/settings" className="text-label font-semibold text-content-muted hover:text-content">
          Back to settings
        </Link>
      </div>
    </div>
  )
}
