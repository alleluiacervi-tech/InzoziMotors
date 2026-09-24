'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { InspectionFee } from '@/components/InspectionFee'
import { ReportAccess } from '@/components/ReportAccess'
import { JourneyRail } from '@/components/JourneyRail'
import { api } from '@/lib/api'
import { useToast } from '@/components/feedback'
import { fmtDateTime } from '@/lib/format'

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
  // So a category's provenance line can say "you" instead of a bare uuid.
  const [meId, setMeId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.getInspection(id), api.inspectionChecklist()])
      .then(([inspection, checklist]) => {
        setInsp(inspection)
        setDefinition(checklist)
        if (inspection.checklist_results) {
          setResults(inspection.checklist_results)
          // Already on the server — not a pending change.
          savedRef.current = { ...inspection.checklist_results }
        }
        if (inspection.notes) setNotes(inspection.notes)
      })
      .catch((error) => toast(error.message, 'error'))
      .finally(() => setLoading(false))
  }, [id, toast])

  useEffect(() => {
    api.me().then((me: any) => setMeId(me?.id ?? null)).catch(() => {})
  }, [])

  // ─── Autosave ──────────────────────────────────────────────────────────────
  // A 150-item checklist is forty minutes of work. Losing it to a dropped
  // connection once teaches an inspector to hurry, and hurrying is the one
  // thing this checklist cannot survive. So verdicts are pushed to the server
  // as they are entered.
  //
  // Only the DELTA is sent — the server merges, so a smaller payload can never
  // erase what is already recorded. Debounced, because an inspector working
  // quickly through a category would otherwise fire one request per tap.
  const savedRef = useRef<Record<string, string>>({})
  const [draftState, setDraftState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    if (!insp || insp.status !== 'in_progress') return
    const pending = Object.fromEntries(
      Object.entries(results).filter(([id, verdict]) => savedRef.current[id] !== verdict),
    )
    if (!Object.keys(pending).length) return

    const timer = window.setTimeout(() => {
      setDraftState('saving')
      api.saveChecklistDraft(String(id), pending)
        .then(() => {
          savedRef.current = { ...savedRef.current, ...pending }
          setDraftState('saved')
        })
        // Deliberately quiet: the inspector keeps working and the next save
        // retries the same delta. A toast per hiccup would train them to
        // ignore toasts.
        .catch(() => setDraftState('error'))
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [results, insp, id])

  /** Re-read just the inspection after a fee is recorded or voided. The
   *  checklist definition is static, and refetching the whole page would
   *  discard verdicts the inspector has entered but not yet submitted. */
  const reload = useCallback(() => {
    api.getInspection(id)
      .then((inspection) => setInsp((current: any) => ({ ...current, ...inspection })))
      .catch((error) => toast(error.message, 'error'))
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

  // ─── Critical-first ordering ────────────────────────────────────────────────
  // The checklist is rendered — and keyboard-navigated — critical items
  // first, in category order, then everything else. This is also the order
  // the "1/2/3" shortcuts walk, so an inspector who just sits and presses
  // keys ends up doing exactly the thing the checklist most needs: the
  // safety-relevant items get a deliberate look before anything is attested
  // away in bulk.
  const orderedItems = useMemo(() => {
    if (!definition) return [] as ChecklistItem[]
    const critical = definition.categories.flatMap((category) => category.items.filter((item) => item.critical))
    const rest = definition.categories.flatMap((category) => category.items.filter((item) => !item.critical))
    return [...critical, ...rest]
  }, [definition])
  const criticalItems = useMemo(() => allItems.filter((item) => item.critical), [allItems])
  const criticalAnswered = criticalItems.filter((item) => results[item.id]).length

  // The keyboard cursor. Always kept pointed at some unrated item so 1/2/3
  // has somewhere to land; a click on any row can also move it.
  const [activeId, setActiveId] = useState<string | null>(null)
  useEffect(() => {
    if (!orderedItems.length) return
    if (activeId && !results[activeId]) return // still pointing at an unrated item
    const next = orderedItems.find((item) => !results[item.id])
    setActiveId(next ? next.id : null)
  }, [orderedItems, results, activeId])

  const readOnly = insp?.status === 'complete'

  /** Record one verdict and move the cursor to the next unrated item,
   *  wrapping around so fixing something near the end doesn't strand it. */
  function answer(itemId: string, value: Result) {
    if (readOnly) return
    const next = { ...results, [itemId]: value }
    setResults(next)
    const idx = orderedItems.findIndex((item) => item.id === itemId)
    for (let offset = 1; offset <= orderedItems.length; offset++) {
      const candidate = orderedItems[(idx + offset) % orderedItems.length]
      if (!next[candidate.id]) { setActiveId(candidate.id); return }
    }
    setActiveId(null) // everything rated
  }

  useEffect(() => {
    if (readOnly) return
    function handleKeyDown(event: KeyboardEvent) {
      if (!activeId) return
      const target = event.target as HTMLElement | null
      // Don't hijack 1/2/3 while the inspector is typing in notes or a field.
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return
      if (event.key === '1') { event.preventDefault(); answer(activeId, 'pass') }
      else if (event.key === '2') { event.preventDefault(); answer(activeId, 'flag') }
      else if (event.key === '3') { event.preventDefault(); answer(activeId, 'fail') }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, results, readOnly, orderedItems])

  const [attesting, setAttesting] = useState<string | null>(null)

  /** Bulk-fill the non-critical items still unrated in one category. The
   *  server decides which items that is — never a critical one — and
   *  records who did it and how many; this mirrors that fill locally so the
   *  screen doesn't wait on a refetch to show it. */
  async function attestCategory(category: ChecklistCategory) {
    if (readOnly) return
    setAttesting(category.id)
    try {
      // Flush any tap the inspector made that autosave hasn't sent yet —
      // otherwise the server's idea of "already answered" could be a few
      // seconds stale and the attestation could stomp a flag entered only
      // locally.
      const pending = Object.fromEntries(
        Object.entries(results).filter(([itemId, verdict]) => savedRef.current[itemId] !== verdict),
      )
      if (Object.keys(pending).length) {
        await api.saveChecklistDraft(String(id), pending)
        savedRef.current = { ...savedRef.current, ...pending }
      }
      const attestable = category.items.filter((item) => !item.critical).map((item) => item.id)
      const filledCount = attestable.filter((itemId) => !results[itemId]).length
      const response = await api.attestChecklistCategory(String(id), category.id)
      setResults((previous) => {
        const next = { ...previous }
        for (const itemId of attestable) if (!next[itemId]) next[itemId] = 'pass'
        return next
      })
      const updatedSaved = { ...savedRef.current }
      for (const itemId of attestable) if (!updatedSaved[itemId]) updatedSaved[itemId] = 'pass'
      savedRef.current = updatedSaved
      setInsp((current: any) => ({ ...current, checklist_attestations: response.checklist_attestations }))
      toast(filledCount ? `${category.name}: marked ${filledCount} item(s) pass.` : `${category.name}: nothing left to attest.`, 'success')
    } catch (error: any) {
      toast(error.message, 'error')
    } finally {
      setAttesting(null)
    }
  }

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
        ? `Inspection passed at ${completed.score}/150. Ready for publication.`
        : `Inspection recorded at ${completed.score}/150 with defect disclosures. Ready for transparent publication.`,
      'success')
      router.push('/inspections')
    } catch (error: any) { toast(error.message, 'error') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="text-sm text-gray-400">Loading inspection…</div>
  if (!insp || !definition) return <div className="text-sm text-red-600">Inspection not found.</div>

  function renderItemRow(item: ChecklistItem) {
    const value = results[item.id]
    const isActive = activeId === item.id
    return (
      <div
        key={item.id}
        onClick={() => !readOnly && setActiveId(item.id)}
        className={`flex flex-col gap-3 px-5 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between ${isActive ? 'bg-brand/5 ring-1 ring-inset ring-brand/30' : ''}`}
      >
        <span className="flex-1 text-sm text-gray-700">
          {item.label}
          {item.critical && <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-700">Critical</span>}
          {isActive && !readOnly && <span className="ml-2 text-[10px] font-semibold uppercase text-brand">1 pass · 2 flag · 3 fail</span>}
        </span>
        <div className="grid grid-cols-3 gap-1">
          {(['pass', 'flag', 'fail'] as const).map((option) => (
            <button
              type="button"
              key={option}
              disabled={readOnly}
              onClick={() => answer(item.id, option)}
              aria-pressed={value === option}
              className={`min-h-10 min-w-16 rounded-lg px-2 text-xs font-bold capitalize transition-colors disabled:cursor-not-allowed ${value === option ? option === 'pass' ? 'bg-green-600 text-white' : option === 'flag' ? 'bg-amber-500 text-white' : 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >{option}</button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* A walk-in has no publication pipeline, so the rail hides itself there
          rather than drawing seven stages that can never complete. */}
      <JourneyRail subjectType="inspection" id={String(id)} className="mb-5" />

      {/* Bookkeeping for a walk-in, and a deliberate non-gate: the report can
          be issued and collected whether or not this has been filled in. */}
      {insp.kind === 'standalone' ? (
        <>
          <InspectionFee inspectionId={String(id)} fee={insp.fee ?? null} onChange={reload} />
          {/* The second sale. A report is an asset, and until now it could only
              ever be sold to the person who commissioned it. */}
          <ReportAccess inspectionId={String(id)} complete={insp.status === 'complete'} />
        </>
      ) : null}

      <div className="mb-6 rounded-xl border border-gray-100 bg-surface p-5 shadow-sm">
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
            <span>
              {counts.answered} / {definition.item_count} checks recorded
              <span className="ml-2 text-gray-400">({criticalAnswered}/{criticalItems.length} critical)</span>
              {insp.status === 'in_progress' ? (
                <span className={`ml-2 font-semibold ${draftState === 'error' ? 'text-red-600' : 'text-gray-400'}`}>
                  {draftState === 'saving' ? '· saving…'
                    : draftState === 'saved' ? '· saved'
                    : draftState === 'error' ? '· not saved — check your connection'
                    : ''}
                </span>
              ) : null}
            </span>
            <span className={`font-semibold ${predictedPass ? 'text-green-600' : 'text-gray-700'}`}>Score: {score}/{definition.max_score}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-brand transition-all" style={{ width: `${(counts.answered / definition.item_count) * 100}%` }} /></div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs">
            <span className="text-green-600">✓ {counts.pass} Pass</span>
            <span className="text-amber-600">⚠ {counts.flag} Flag</span>
            <span className="text-red-600">✗ {counts.fail} Fail</span>
            {criticalFailures.length > 0 && <span className="font-semibold text-amber-700">{criticalFailures.length} critical defect(s) disclosed for price negotiation</span>}
          </div>
        </div>
        {insp.status === 'scheduled' && <button onClick={startInspection} disabled={saving} className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Starting…' : 'Start Physical Inspection'}</button>}
      </div>

      {/* ─── Phase 1 — critical items, one at a time, always ────────────────── */}
      <div className="mb-6">
        <div className="mb-2 flex flex-wrap items-baseline gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-red-700">Phase 1 · Critical checks</h2>
          <span className="text-xs text-gray-500">The checks that could hurt a buyer — engine, brakes, structure. Never bulk-filled; rate each one.</span>
        </div>
        <div className="space-y-4">
          {definition.categories.map((category) => {
            const items = category.items.filter((item) => item.critical)
            if (!items.length) return null
            const answered = items.filter((item) => results[item.id]).length
            return (
              <section key={category.id} className="overflow-hidden rounded-xl border border-red-100 bg-surface shadow-sm">
                <div className="flex items-center justify-between border-b border-red-100 bg-red-50 px-5 py-3">
                  <h3 className="text-sm font-semibold text-red-800">{category.name}</h3>
                  <span className="text-xs text-red-700">{answered}/{items.length} critical</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {items.map((item) => renderItemRow(item))}
                </div>
              </section>
            )
          })}
        </div>
      </div>

      {/* ─── Phase 2 — everything else, one category at a time ──────────────── */}
      <div className="space-y-4">
        <div className="mb-2 flex flex-wrap items-baseline gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Phase 2 · Remaining checks</h2>
          <span className="text-xs text-gray-500">On a clean car these are a foregone pass — attest a whole category at once, or still check any item yourself.</span>
        </div>
        {definition.categories.map((category) => {
          const items = category.items.filter((item) => !item.critical)
          if (!items.length) return null
          const remaining = items.filter((item) => !results[item.id]).length
          const attestation = insp.checklist_attestations?.[category.id]
          return (
            <section key={category.id} className="overflow-hidden rounded-xl border border-gray-100 bg-surface shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-5 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700">{category.name}</h3>
                  {attestation ? (
                    <p className="text-xs text-gray-400">
                      Attested {attestation.count} item(s) pass · {attestation.by === meId ? 'you' : `admin ${String(attestation.by).slice(0, 8)}`} · {fmtDateTime(attestation.at)}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{items.length - remaining}/{items.length}</span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => attestCategory(category)}
                      disabled={!remaining || attesting === category.id}
                      className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {attesting === category.id ? 'Attesting…' : remaining ? `Attest remaining ${remaining} as pass` : 'Nothing left to attest'}
                    </button>
                  )}
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {items.map((item) => renderItemRow(item))}
              </div>
            </section>
          )
        })}
      </div>

      <div className="mt-6 rounded-xl border border-gray-100 bg-surface p-5 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-gray-700">Inspector notes (optional)</label>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={readOnly} rows={4} className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-50" placeholder="Record observations and recommendations for the report…" />
        {!readOnly && <button onClick={submit} disabled={saving || insp.status !== 'in_progress' || counts.answered !== definition.item_count} className="mt-4 w-full rounded-xl bg-brand py-3 font-semibold text-brand-on transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Submitting…' : 'Complete Inspection for Admin Review'}</button>}
        <p className="mt-2 text-center text-xs text-gray-500">Completion records evidence only. Publication is a separate, audited admin decision.</p>
      </div>
    </div>
  )
}
