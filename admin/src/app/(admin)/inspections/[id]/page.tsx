'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useToast } from '@/components/feedback'

type Result = 'pass' | 'flag' | 'fail'
type ChecklistItem = { id: string; label: string; critical: boolean }
type ChecklistCategory = { id: string; name: string; max_points: number; items: ChecklistItem[] }
type ChecklistDefinition = {
  version: string; max_score: number; passing_score: number; item_count: number
  categories: ChecklistCategory[]
}

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const [insp, setInsp] = useState<any>(null)
  const [definition, setDefinition] = useState<ChecklistDefinition | null>(null)
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<Record<string, Result>>({})
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([api.getInspection(id), api.inspectionChecklist()])
      .then(([inspection, checklist]) => {
        setInsp(inspection)
        setDefinition(checklist)
        if (inspection.checklist_results) setResults(inspection.checklist_results)
        if (inspection.notes) setNotes(inspection.notes)
      })
      .catch((error) => toast(error.message, 'error'))
      .finally(() => setLoading(false))
  }, [id, toast])

  const allItems = useMemo(
    () => definition?.categories.flatMap((category) => category.items) || [],
    [definition],
  )
  const counts = useMemo(() => {
    const values = allItems.map((item) => results[item.id])
    return {
      pass: values.filter((value) => value === 'pass').length,
      flag: values.filter((value) => value === 'flag').length,
      fail: values.filter((value) => value === 'fail').length,
      answered: values.filter(Boolean).length,
    }
  }, [allItems, results])
  const score = Math.round(counts.pass + counts.flag * 0.5)
  const criticalFailures = allItems.filter((item) => item.critical && results[item.id] === 'fail')
  const predictedPass = Boolean(definition && counts.answered === definition.item_count && score >= definition.passing_score && !criticalFailures.length)

  async function startInspection() {
    setSaving(true)
    try {
      const started = await api.startInspection(id)
      setInsp((current: any) => ({ ...current, ...started }))
      toast('Inspection started. Every check must now be recorded.', 'success')
    } catch (error: any) { toast(error.message, 'error') }
    finally { setSaving(false) }
  }

  async function submit() {
    if (!definition) return
    const missing = allItems.filter((item) => !results[item.id])
    if (missing.length) {
      toast(`Rate every check before submitting — ${missing.length} still unrated.`, 'error')
      return
    }
    if (insp.status !== 'in_progress') {
      toast('Start the inspection before completing it.', 'error')
      return
    }
    setSaving(true)
    try {
      const completed = await api.completeInspection(id, { checklist_results: results, notes })
      toast(completed.passed
        ? `Inspection passed at ${completed.score}/150. An admin may now review the listing for publication.`
        : `Inspection recorded at ${completed.score}/150. The listing remains blocked.`,
      completed.passed ? 'success' : 'error')
      router.push('/inspections')
    } catch (error: any) { toast(error.message, 'error') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="text-sm text-gray-400">Loading inspection…</div>
  if (!insp || !definition) return <div className="text-sm text-red-600">Inspection not found.</div>
  const readOnly = insp.status === 'complete'

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">150-Point Inspection</h1>
            <p className="text-sm text-gray-500">
              {[insp.display_year ?? insp.year ?? insp.sub_year,
                insp.display_make ?? insp.make ?? insp.sub_make,
                insp.display_model ?? insp.model ?? insp.sub_model].filter(Boolean).join(' ') || 'Vehicle not recorded'} · {insp.center}
            </p>
            {/* A walk-in has a customer and no seller; the header must not
                assume one, and should say plainly that no listing follows. */}
            <p className="mt-0.5 text-xs text-gray-400">
              {insp.scheduled_date} at {insp.scheduled_time} · {insp.kind === 'standalone' ? 'Customer' : 'Seller'}: {insp.party_name ?? insp.seller_name ?? '—'}
            </p>
            {insp.kind === 'standalone' ? (
              <p className="mt-1 text-xs font-semibold text-gray-500">
                Walk-in inspection — Sawa is not selling this vehicle and this check cannot publish a listing.
              </p>
            ) : null}
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-700">{String(insp.status).replace('_', ' ')}</span>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>{counts.answered} / {definition.item_count} checks recorded</span>
            <span className={`font-semibold ${predictedPass ? 'text-green-600' : 'text-gray-700'}`}>Score: {score}/{definition.max_score}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-brand transition-all" style={{ width: `${(counts.answered / definition.item_count) * 100}%` }} /></div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs">
            <span className="text-green-600">✓ {counts.pass} Pass</span>
            <span className="text-amber-600">⚠ {counts.flag} Flag</span>
            <span className="text-red-600">✗ {counts.fail} Fail</span>
            {criticalFailures.length > 0 && <span className="font-semibold text-red-700">{criticalFailures.length} critical failure(s) block publication</span>}
          </div>
        </div>
        {insp.status === 'scheduled' && <button onClick={startInspection} disabled={saving} className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Starting…' : 'Start Physical Inspection'}</button>}
      </div>

      <div className="space-y-4">
        {definition.categories.map((category) => (
          <section key={category.id} className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-700">{category.name}</h2>
              <span className="text-xs text-gray-500">{category.max_points} points</span>
            </div>
            <div className="divide-y divide-gray-50">
              {category.items.map((item) => {
                const value = results[item.id]
                return <div key={item.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex-1 text-sm text-gray-700">{item.label}{item.critical && <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-700">Critical</span>}</span>
                  <div className="grid grid-cols-3 gap-1">
                    {(['pass', 'flag', 'fail'] as const).map((option) => <button type="button" key={option} disabled={readOnly} onClick={() => setResults((previous) => ({ ...previous, [item.id]: option }))} aria-pressed={value === option} className={`min-h-10 min-w-16 rounded-lg px-2 text-xs font-bold capitalize transition-colors disabled:cursor-not-allowed ${value === option ? option === 'pass' ? 'bg-green-600 text-white' : option === 'flag' ? 'bg-amber-500 text-white' : 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{option}</button>)}
                  </div>
                </div>
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-gray-700">Inspector notes (optional)</label>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={readOnly} rows={4} className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-50" placeholder="Record observations and recommendations for the report…" />
        {!readOnly && <button onClick={submit} disabled={saving || insp.status !== 'in_progress' || counts.answered !== definition.item_count} className="mt-4 w-full rounded-xl bg-brand py-3 font-semibold text-white transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Submitting…' : 'Complete Inspection for Admin Review'}</button>}
        <p className="mt-2 text-center text-xs text-gray-500">Completion records evidence only. Publication is a separate, audited admin decision.</p>
      </div>
    </div>
  )
}
