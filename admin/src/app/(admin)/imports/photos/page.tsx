'use client'

// ─────────────────────────────────────────────────────────────────────────────
// The photo review queue: propose, then approve.
//
// The import catalogue carries no photographs by default, on purpose -- the
// version before it drew 33 image references from 7 recycled stock photos, so
// a Hilux and a BYD Atto 3 showed the same car. A Commons search on this
// catalogue's own 233 models put the right car in the top result 38 times out
// of 44 sampled -- good, not perfect, and "not perfect" is exactly the failure
// this catalogue was rebuilt to remove. So nothing here publishes on its own:
// this screen is the one point a human looks at each candidate before it can
// ever reach a buyer's phone.
//
// One model at a time, at a size where a wrong photo is obvious -- the six
// genuine misses found during research (a Mazda CX-80 offered for a CX-3) look
// wrong instantly at this scale. The five that were actually correct cars
// under a different market name (Isuzu Elf for Isuzu NPR) look right just as
// fast. At roughly four seconds a model, that is the whole queue in minutes,
// not a research project.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/ui'
import { useToast } from '@/components/feedback'

type Candidate = {
  id: string; image_url: string; thumb_url: string; page_url: string
  title: string; author: string | null; license_name: string | null; license_url: string | null
}
type QueueItem = {
  id: string; make: string; model: string; body_type: string; origin_country: string
  candidates: Candidate[]
}

export default function CatalogPhotosPage() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [tally, setTally] = useState({ awaiting_review: 0, not_yet_searched: 0, approved: 0, skipped: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const [searching, setSearching] = useState(false)
  const [cursor, setCursor] = useState(0)
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await api.imageQueue()
      setItems(data.items)
      setTally({ awaiting_review: data.awaiting_review, not_yet_searched: data.not_yet_searched, approved: data.approved, skipped: data.skipped, total: data.total })
      setCursor(0)
    } catch (e) { setError(e) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const current = items[cursor]

  async function findMore() {
    setSearching(true)
    try {
      const r = await api.findImageCandidates(25)
      toast(`Checked ${r.checked} models — ${r.with_candidates} found photos, ${r.with_none} found none`, 'success')
      await load()
    } catch (e: any) { toast(e.message, 'error') } finally { setSearching(false) }
  }

  function advance() {
    // The item just decided drops out of `items` on the next load, but that
    // round-trip takes a moment -- stepping the cursor locally keeps the queue
    // feeling instant instead of freezing on the same photo between calls.
    setCursor((c) => Math.min(c + 1, items.length - 1))
  }

  async function approve(candidate: Candidate) {
    if (!current) return
    setBusy(true)
    try {
      await api.approveImage(current.id, candidate.id)
      toast(`${current.make} ${current.model} approved`, 'success')
      setItems((prev) => prev.filter((i) => i.id !== current.id))
      setCursor((c) => Math.min(c, Math.max(items.length - 2, 0)))
      setTally((t) => ({ ...t, awaiting_review: t.awaiting_review - 1, approved: t.approved + 1 }))
    } catch (e: any) { toast(e.message, 'error') } finally { setBusy(false) }
  }

  async function skip() {
    if (!current) return
    setBusy(true)
    try {
      await api.skipImage(current.id)
      toast(`${current.make} ${current.model} skipped — lettermark stays until a photo is approved`, 'success')
      setItems((prev) => prev.filter((i) => i.id !== current.id))
      setCursor((c) => Math.min(c, Math.max(items.length - 2, 0)))
      setTally((t) => ({ ...t, awaiting_review: t.awaiting_review - 1, skipped: t.skipped + 1 }))
    } catch (e: any) { toast(e.message, 'error') } finally { setBusy(false) }
  }

  const progress = useMemo(() => {
    const decided = tally.approved + tally.skipped
    return tally.total ? Math.round((decided / tally.total) * 100) : 0
  }, [tally])

  return <div>
    <PageHeader
      title="Catalogue photography"
      description="Propose candidates from Wikimedia Commons, then approve or skip each one by hand. Nothing an algorithm found reaches a buyer until you confirm it."
      action={
        <button onClick={findMore} disabled={searching} className="rounded-xl border border-line bg-surface px-4 py-2.5 text-label font-bold text-content disabled:opacity-50">
          {searching ? 'Searching…' : `Find photos for ${tally.not_yet_searched} more models`}
        </button>
      }
    />

    <Card className="mb-5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-6 text-label">
          <span><b className="font-extrabold text-content">{tally.awaiting_review}</b> <span className="text-content-muted">awaiting review</span></span>
          <span><b className="font-extrabold text-content">{tally.approved}</b> <span className="text-content-muted">approved</span></span>
          <span><b className="font-extrabold text-content">{tally.skipped}</b> <span className="text-content-muted">skipped</span></span>
          <span><b className="font-extrabold text-content">{tally.not_yet_searched}</b> <span className="text-content-muted">not yet searched</span></span>
        </div>
        <span className="text-caption font-bold text-content-muted">{progress}% of the catalogue decided</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-line-soft">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
      </div>
    </Card>

    {error ? <ErrorState error={error} onRetry={load} />
      : loading ? <LoadingState />
      : !items.length ? (
        tally.not_yet_searched > 0 ? (
          <EmptyState icon="camera" title="No candidates waiting"
            description={`${tally.not_yet_searched} models have not been searched yet. Click "Find photos" above to propose some.`} />
        ) : (
          <EmptyState icon="check" title="Every model has a decision"
            description="Approved models show their photo everywhere in the app. Skipped ones show the brand mark until you approve something later." />
        )
      ) : !current ? (
        <EmptyState icon="check" title="Queue cleared" description="Reload to check for anything new." />
      ) : (
        <Card className="p-6">
          <div className="mb-5 flex items-baseline justify-between">
            <div>
              <p className="text-caption font-bold uppercase tracking-wide text-content-muted">{current.origin_country} · {current.body_type}</p>
              <h2 className="text-xl font-extrabold text-content">{current.make} {current.model}</h2>
            </div>
            <p className="text-label text-content-muted">{cursor + 1} of {items.length} in this batch</p>
          </div>

          {!current.candidates.length ? (
            <div className="rounded-xl border border-line bg-canvas p-8 text-center">
              <p className="font-bold text-content">No Commons photo found for this model.</p>
              <p className="mt-1 text-label text-content-muted">Upload the operator&apos;s own photo elsewhere, or skip for now.</p>
              <button onClick={skip} disabled={busy} className="mt-4 rounded-xl border border-line px-5 py-2.5 text-label font-bold text-content disabled:opacity-50">Skip this model</button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {current.candidates.map((c) => (
                <div key={c.id} className="flex flex-col overflow-hidden rounded-xl border border-line">
                  <div className="flex aspect-[16/10] items-center justify-center bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element -- external Commons CDN, not a local upload */}
                    <img src={c.thumb_url} alt={`${current.make} ${current.model} candidate`} className="h-full w-full object-contain" />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <p className="text-caption text-content-muted">
                      {c.author ? <>© {c.author}</> : 'Unattributed'}{c.license_name ? ` · ${c.license_name}` : ''}
                    </p>
                    <a href={c.page_url} target="_blank" rel="noreferrer" className="text-caption text-brand underline">View on Commons ↗</a>
                    <button onClick={() => approve(c)} disabled={busy} className="mt-auto rounded-xl bg-brand px-4 py-2.5 text-label font-bold text-brand-on disabled:opacity-50">Approve this photo</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {current.candidates.length ? (
            <div className="mt-5 flex justify-between border-t border-line-soft pt-4">
              <button onClick={skip} disabled={busy} className="rounded-xl border border-line px-5 py-2.5 text-label font-bold text-content disabled:opacity-50">None of these — skip</button>
              <button onClick={advance} disabled={busy || cursor >= items.length - 1} className="text-label font-bold text-content-muted disabled:opacity-30">Come back to this later →</button>
            </div>
          ) : null}
        </Card>
      )}
  </div>
}
