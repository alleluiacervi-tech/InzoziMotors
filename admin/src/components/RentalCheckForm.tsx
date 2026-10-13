'use client'

import { useEffect, useMemo, useState } from 'react'
import { api, type RentalCheckDefinition } from '@/lib/api'
import { useToast } from '@/components/feedback'
import { fmtDate } from '@/lib/format'

// The Sawa Rental Check, recorded at the provider's yard on a phone.
//
// Ten points, each a big Pass / Fail pair. A fail asks for a reason on the spot,
// because the provider has to know what to fix and, for the as-advertised
// points, a renter is shown it. The two document dates and the odometer are
// the only typing. The server (lib/rental-check-policy.js) is the authority:
// this form only collects, and shows its refusal word for word.

type Verdict = 'pass' | 'fail'
type Entry = { verdict?: Verdict; note: string }

const input = 'h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-brand focus:outline-none'
const label = 'mb-1 block text-xs font-semibold text-gray-700'

export function RentalCheckForm({ car, onClose, onSaved }: {
  car: { id: string; title: string; mileage?: number | null; check_status?: string }
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [definition, setDefinition] = useState<RentalCheckDefinition | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [entries, setEntries] = useState<Record<string, Entry>>({})
  const [insurance, setInsurance] = useState('')
  const [technical, setTechnical] = useState('')
  const [odometer, setOdometer] = useState(car.mileage == null ? '' : String(car.mileage))
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([api.rentalCheckDefinition(), api.rentalChecks(car.id)])
      .then(([def, checks]) => {
        setDefinition(def)
        setHistory(checks)
        setEntries(Object.fromEntries(def.items.map((item) => [item.id, { note: '' }])))
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Could not load the check'))
  }, [car.id])

  const answered = useMemo(() => Object.values(entries).filter((e) => e.verdict).length, [entries])
  const blockingFails = useMemo(() => (definition?.items || [])
    .filter((item) => item.blocking && entries[item.id]?.verdict === 'fail'), [definition, entries])

  function set(id: string, patch: Partial<Entry>) {
    setEntries((old) => ({ ...old, [id]: { ...old[id], ...patch } }))
  }

  function allPass() {
    if (!definition) return
    setEntries((old) => Object.fromEntries(definition.items.map((item) => [item.id, { ...old[item.id], verdict: 'pass' as Verdict }])))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!definition) return
    setSaving(true); setErrors([])
    try {
      const result = await api.recordRentalCheck(car.id, {
        results: Object.fromEntries(definition.items.map((item) => {
          const entry = entries[item.id]
          return [item.id, entry?.note.trim() ? { verdict: entry.verdict as Verdict, note: entry.note.trim() } : { verdict: entry?.verdict as Verdict }]
        })),
        insurance_expires_on: insurance,
        technical_control_expires_on: technical,
        odometer_km: Number.parseInt(odometer.replace(/\D/g, ''), 10),
        notes: notes.trim() || undefined,
      })
      toast(result.passed ? `${car.title}: Rental Check passed (${result.passed_count}/10).` : `${car.title}: Rental Check failed. The provider has been told what to fix.`, result.passed ? 'success' : 'info')
      ;(result.warnings || []).forEach((line: string) => toast(line, 'info'))
      onSaved()
    } catch (e: any) {
      // The check route sends its refusals as plain sentences.
      const list = Array.isArray(e?.errors) && e.errors.every((x: unknown) => typeof x === 'string') ? e.errors : [e?.message || 'Could not record the check']
      setErrors(list)
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form onSubmit={submit} className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-xl sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Rental Check</h2>
            <p className="mt-0.5 text-sm text-gray-600">{car.title}</p>
            <p className="mt-1 text-xs text-gray-500">See the original documents. Record what they say; Sawa does not check them with any registry or insurer.</p>
          </div>
          <button type="button" onClick={onClose} className="min-h-[44px] px-2 text-sm font-semibold text-gray-500">Close</button>
        </div>

        {loadError ? <p className="rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-strong">{loadError}</p> : null}
        {!definition && !loadError ? <p className="py-8 text-center text-sm text-gray-500">Loading…</p> : null}

        {definition ? (
          <>
            {history.filter((c) => !c.voided_at).slice(0, 1).map((last) => (
              <p key={last.id} className="mb-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                Last check {fmtDate(last.checked_at)}: {last.passed ? 'passed' : 'failed'} ({last.passed_count}/10)
                {last.checked_by_name ? ` by ${last.checked_by_name}` : ''}.
              </p>
            ))}

            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500">{answered}/{definition.items.length} answered</p>
              <button type="button" onClick={allPass} className="min-h-[44px] rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:border-content-muted">Mark all pass</button>
            </div>

            {definition.groups.map((group) => (
              <fieldset key={group.id} className="mb-5">
                <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                  {group.name} <span className="font-medium normal-case tracking-normal">· {group.blocking ? 'a fail keeps the car off the catalogue' : 'a fail is shown to renters'}</span>
                </legend>
                <ul className="space-y-2">
                  {definition.items.filter((item) => item.group === group.id).map((item) => {
                    const entry = entries[item.id] || { note: '' }
                    return (
                      <li key={item.id} className={`rounded-xl border px-3 py-3 ${entry.verdict === 'fail' ? 'border-danger/40 bg-danger-tint/40' : 'border-gray-100'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                            <p className="mt-0.5 text-xs text-gray-500">{item.hint}</p>
                          </div>
                          <div className="flex shrink-0 overflow-hidden rounded-lg border border-gray-200" role="radiogroup" aria-label={item.label}>
                            {(['pass', 'fail'] as Verdict[]).map((verdict) => (
                              <button key={verdict} type="button" role="radio" aria-checked={entry.verdict === verdict}
                                onClick={() => set(item.id, { verdict })}
                                className={`h-11 w-14 text-xs font-bold ${entry.verdict === verdict
                                  ? verdict === 'pass' ? 'bg-success text-white' : 'bg-danger text-white'
                                  : 'bg-surface text-gray-600'}`}>
                                {verdict === 'pass' ? 'Pass' : 'Fail'}
                              </button>
                            ))}
                          </div>
                        </div>
                        {entry.verdict === 'fail' ? (
                          <input value={entry.note} onChange={(e) => set(item.id, { note: e.target.value })}
                            placeholder={group.blocking ? 'What must be fixed?' : 'What the renter should know'}
                            className={`${input} mt-2`} maxLength={500} required />
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              </fieldset>
            ))}

            <div className="grid gap-3 sm:grid-cols-2">
              <div><label htmlFor="rc-insurance" className={label}>Insurance valid until</label><input id="rc-insurance" type="date" value={insurance} onChange={(e) => setInsurance(e.target.value)} className={input} required /></div>
              <div><label htmlFor="rc-technical" className={label}>Technical control valid until</label><input id="rc-technical" type="date" value={technical} onChange={(e) => setTechnical(e.target.value)} className={input} required /></div>
              <div><label htmlFor="rc-odometer" className={label}>Odometer (km)</label><input id="rc-odometer" inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value)} className={`${input} tabular-nums`} required /></div>
              <div className="sm:col-span-2"><label htmlFor="rc-notes" className={label}>Staff notes (internal, not shown to the provider)</label><textarea id="rc-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" maxLength={1000} /></div>
            </div>

            {errors.length ? (
              <ul className="mt-4 space-y-1 rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-strong" role="alert">
                {errors.map((line) => <li key={line}>{line}</li>)}
              </ul>
            ) : null}

            <div className="sticky bottom-0 -mx-5 mt-5 border-t border-gray-100 bg-surface px-5 pt-3 sm:-mx-6 sm:px-6">
              <p className="mb-2 text-xs text-gray-600">
                {answered < definition.items.length ? 'Answer every point.'
                  : blockingFails.length ? `Will fail: ${blockingFails.map((i) => i.label).join('; ')}.`
                  : 'Will pass. The car is listed once its fee is paid and it is Active.'}
              </p>
              <button disabled={saving || answered < definition.items.length}
                className="h-12 w-full rounded-lg bg-brand text-sm font-bold text-brand-on disabled:opacity-50">
                {saving ? 'Recording…' : 'Record the check'}
              </button>
            </div>
          </>
        ) : null}
      </form>
    </div>
  )
}

export default RentalCheckForm
