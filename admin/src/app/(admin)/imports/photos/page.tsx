'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Import catalogue images.
//
// What a buyer sees for a brand-new import model, best first:
//
//   1. An OFFICIAL PHOTO — from the exporter, the distributor or the
//      manufacturer's dealer media kit — uploaded here with where it came from
//      and on what permission. That note stays internal.
//   2. A licensed STUDIO IMAGE (white background, the exact current model),
//      once somebody here has confirmed it is the right car. The library
//      answers "found" for an unknown model of a known brand and returns a
//      different car of that brand, so nothing it sends goes public unchecked.
//   3. Otherwise the brand's logo, which every client already draws.
//
// Wikimedia Commons used to fill this page. Its photographs were of used cars
// in the street, and at least 78 of 232 showed the wrong vehicle, so they were
// withdrawn (backend migration 0050) and the source retired.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, type CatalogImageryRow } from '@/lib/api'
import { Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader, StatCard } from '@/components/ui'
import { useConfirm, useToast } from '@/components/feedback'

type Tab = 'review' | 'none' | 'live' | 'all'
const TABS: { key: Tab; label: string }[] = [
  { key: 'review', label: 'Check studio images' },
  { key: 'none', label: 'No image yet' },
  { key: 'live', label: 'Showing an image' },
  { key: 'all', label: 'All models' },
]

function initials(make: string) {
  const words = make.trim().split(/[\s-]+/).filter(Boolean)
  return (words.length >= 2 ? words[0][0] + words[1][0] : make.slice(0, 2)).toUpperCase()
}

function ModelCard({ row, busy, onReview, onUpload, onRemove }: {
  row: CatalogImageryRow
  busy: boolean
  onReview: (row: CatalogImageryRow, decision: 'approved' | 'rejected') => void
  onUpload: (row: CatalogImageryRow, file: File, source: string) => Promise<boolean>
  onRemove: (row: CatalogImageryRow) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [source, setSource] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const input = useRef<HTMLInputElement | null>(null)
  const official = row.images?.[0] || null
  const picture = official || (row.render_status === 'found' ? row.render_url : null)

  const badge = official
    ? { text: 'Official photo', tone: 'bg-success-tint text-success-text' }
    : row.state === 'render'
      ? { text: 'Studio image · live', tone: 'bg-success-tint text-success-text' }
      : row.state === 'review'
        ? { text: 'Studio image · check it', tone: 'bg-warning-tint text-warning-text' }
        : row.render_review === 'rejected'
          ? { text: 'Studio image rejected', tone: 'bg-surface-alt text-content-muted' }
          : { text: 'Brand logo shown', tone: 'bg-surface-alt text-content-muted' }

  async function save() {
    if (!file || source.trim().length < 4) return
    const ok = await onUpload(row, file, source.trim())
    if (ok) { setUploading(false); setSource(''); setFile(null) }
  }

  return (
    <li>
      <Card className="flex h-full flex-col overflow-hidden">
        {/* White, always: official cut-outs and studio images are shot on
            white, and this is exactly how the app and website draw them. */}
        <div className="relative flex aspect-[16/10] items-center justify-center bg-white">
          {picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={picture} alt={`${row.make} ${row.model}`} className="h-full w-full object-contain p-2" loading="lazy" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-alt text-title-sm font-extrabold text-content-secondary">
              {initials(row.make)}
            </span>
          )}
          <span className={`absolute left-2 top-2 rounded-pill px-2 py-0.5 text-micro font-bold ${badge.tone}`}>{badge.text}</span>
        </div>

        <div className="flex flex-1 flex-col p-3">
          <p className="font-bold text-content">{row.make} {row.model}</p>
          <p className="text-caption text-content-muted">{row.body_type} · {row.origin_country}</p>
          {official && row.image_source ? (
            <p className="mt-1 line-clamp-2 text-micro text-content-muted" title={row.image_source}>
              Source: {row.image_source}
            </p>
          ) : null}

          <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
            {row.state === 'review' ? (
              <>
                <button type="button" disabled={busy} onClick={() => onReview(row, 'approved')}
                  className="rounded-lg bg-ink-900 px-2.5 py-1.5 text-caption font-bold text-white disabled:opacity-50">
                  Right car — show it
                </button>
                <button type="button" disabled={busy} onClick={() => onReview(row, 'rejected')}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-caption font-bold text-content disabled:opacity-50">
                  Wrong car
                </button>
              </>
            ) : null}
            {row.state === 'render' ? (
              <button type="button" disabled={busy} onClick={() => onReview(row, 'rejected')}
                className="rounded-lg border border-line px-2.5 py-1.5 text-caption font-bold text-content disabled:opacity-50">
                Hide studio image
              </button>
            ) : null}
            {!official && row.render_status === 'found' && row.render_review === 'rejected' ? (
              <button type="button" disabled={busy} onClick={() => onReview(row, 'approved')}
                className="rounded-lg border border-line px-2.5 py-1.5 text-caption font-bold text-content disabled:opacity-50">
                Show studio image
              </button>
            ) : null}
            <button type="button" disabled={busy} onClick={() => setUploading((v) => !v)}
              className="rounded-lg border border-line px-2.5 py-1.5 text-caption font-bold text-content disabled:opacity-50">
              {official ? 'Replace photo' : 'Upload official photo'}
            </button>
            {official ? (
              <button type="button" disabled={busy} onClick={() => onRemove(row)}
                className="rounded-lg px-2.5 py-1.5 text-caption font-bold text-content-muted hover:bg-surface-alt disabled:opacity-50">
                Remove
              </button>
            ) : null}
          </div>

          {uploading ? (
            <div className="mt-3 space-y-2 rounded-xl border border-line-soft bg-surface-alt p-2.5">
              <input ref={input} type="file" accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-caption text-content file:mr-2 file:rounded-lg file:border file:border-line file:bg-surface file:px-2 file:py-1 file:text-caption file:font-bold" />
              <label className="block text-micro font-bold text-content-secondary">
                Where is it from, and on what permission?
                <input value={source} onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g. Toyota Tsusho dealer kit — permission by email 30 Sep"
                  className="mt-1 h-9 w-full rounded-lg border border-line bg-surface px-2 text-caption font-normal text-content" />
              </label>
              <button type="button" onClick={save} disabled={busy || !file || source.trim().length < 4}
                className="w-full rounded-lg bg-ink-900 px-3 py-2 text-caption font-bold text-white disabled:opacity-50">
                {busy ? 'Saving…' : 'Save official photo'}
              </button>
            </div>
          ) : null}
        </div>
      </Card>
    </li>
  )
}

export default function CatalogImagesPage() {
  const [items, setItems] = useState<CatalogImageryRow[]>([])
  const [summary, setSummary] = useState({ total: 0, official: 0, render: 0, review: 0, none: 0, renders_not_found: 0, renders_not_checked: 0 })
  const [rendersEnabled, setRendersEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const [tab, setTab] = useState<Tab>('review')
  const [query, setQuery] = useState('')
  const toast = useToast()
  const confirm = useConfirm()

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await api.catalogImagery()
      setItems(data.items)
      setSummary(data.summary)
      setRendersEnabled(data.renders_enabled)
      // Open on the work there is: nothing to check means the gaps are next.
      setTab((current) => (current === 'review' && data.summary.review === 0 ? 'none' : current))
    } catch (e) { setError(e) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items.filter((row) => {
      if (tab === 'review' && row.state !== 'review') return false
      if (tab === 'none' && row.state !== 'none') return false
      if (tab === 'live' && !['official', 'render'].includes(row.state)) return false
      return !needle || `${row.make} ${row.model} ${row.body_type}`.toLowerCase().includes(needle)
    })
  }, [items, tab, query])

  async function review(row: CatalogImageryRow, decision: 'approved' | 'rejected') {
    setBusyId(row.id)
    try {
      await api.reviewRender(row.id, decision)
      toast(decision === 'approved' ? `${row.make} ${row.model}: studio image is live` : `${row.make} ${row.model}: studio image hidden`, 'success')
      await load()
    } catch (e: any) { toast(e.message, 'error') } finally { setBusyId(null) }
  }

  async function upload(row: CatalogImageryRow, file: File, source: string) {
    setBusyId(row.id)
    try {
      const form = new FormData()
      form.append('source', source)
      form.append('photo', file)
      await api.uploadCatalogPhoto(row.id, form)
      toast(`${row.make} ${row.model}: official photo saved`, 'success')
      await load()
      return true
    } catch (e: any) { toast(e.message, 'error'); return false } finally { setBusyId(null) }
  }

  async function remove(row: CatalogImageryRow) {
    const ok = await confirm({
      title: `Remove the ${row.make} ${row.model} photo?`,
      message: 'Its approved studio image, or the brand mark, shows in its place. The photo can be uploaded again.',
      confirmLabel: 'Remove photo',
      tone: 'danger',
    })
    if (!ok) return
    setBusyId(row.id)
    try {
      await api.removeCatalogPhoto(row.id)
      toast(`${row.make} ${row.model}: photo removed`, 'success')
      await load()
    } catch (e: any) { toast(e.message, 'error') } finally { setBusyId(null) }
  }

  async function findStudioImages() {
    setResolving(true)
    try {
      const r = await api.resolveRenders(60)
      toast(`Checked ${r.checked} models: ${r.found} studio images to check, ${r.no_match} not in the library${r.remaining ? `, ${r.remaining} still to check — run it again` : ''}.`, 'success')
      setTab('review')
      await load()
    } catch (e: any) { toast(e.message, 'error') } finally { setResolving(false) }
  }

  const counts: Record<Tab, number> = {
    review: summary.review,
    none: summary.none,
    live: summary.official + summary.render,
    all: summary.total,
  }

  return (
    <div>
      <PageHeader
        title="Catalogue images"
        description="Official photos and checked studio images of every brand-new model buyers can import. Anything without one shows the brand's logo."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="camera" label="Official photos" value={summary.official} sub="uploaded with their source" tone="success" />
        <StatCard icon="images" label="Studio images live" value={summary.render} sub="checked by the team" tone="success" />
        <StatCard icon="eye" label="Waiting for your check" value={summary.review} sub="not shown until approved" tone={summary.review ? 'warning' : 'neutral'} />
        <StatCard icon="grid" label="Brand logo only" value={summary.none} sub={`of ${summary.total} models`} tone="neutral" />
      </div>

      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl text-label text-content-secondary">
            <p className="font-bold text-content">Where good images come from</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5">
              <li><b className="text-content">Official photos</b> from your exporter, the brand&apos;s distributor or its dealer media kit — with written permission. Upload them per model below.</li>
              <li><b className="text-content">Studio images</b> from the licensed render library: the exact current model on white. Each one waits here until someone confirms it is the right car.</li>
              <li>Never photos copied from manufacturer or press websites — they are copyrighted, and press images are licensed for news, not for selling cars.</li>
            </ol>
          </div>
          <div className="shrink-0 text-right">
            <button type="button" onClick={findStudioImages} disabled={!rendersEnabled || resolving}
              className="rounded-xl bg-brand px-4 py-2.5 text-label font-bold text-brand-on disabled:opacity-50">
              {resolving ? 'Checking the library…' : `Find studio images${summary.renders_not_checked ? ` (${summary.renders_not_checked} to check)` : ''}`}
            </button>
            {!rendersEnabled ? (
              <p className="mt-1.5 max-w-xs text-caption text-content-muted">
                Needs the studio image licence. Once the commercial key is set on the server
                (<code className="font-mono">VEHICLE_RENDER_CUSTOMER</code>), this button fills the queue.
              </p>
            ) : summary.renders_not_found ? (
              <p className="mt-1.5 text-caption text-content-muted">{summary.renders_not_found} models are not in the library — upload official photos for those.</p>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className={`rounded-lg px-3 py-1.5 text-caption font-bold transition-colors ${tab === t.key ? 'bg-ink-900 text-white' : 'border border-line bg-surface text-content-secondary hover:bg-surface-alt'}`}>
              {t.label} <span className="tabular-nums opacity-80">{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <label className="relative sm:ml-auto sm:w-72">
          <span className="sr-only">Find a model</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted"><Icon name="search" size={15} /></span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a make or model"
            className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-label text-content focus:border-content-muted focus:outline-none" />
        </label>
      </div>

      {error ? <ErrorState error={error} onRetry={load} />
        : loading ? <LoadingState />
        : visible.length === 0 ? (
          <EmptyState icon={tab === 'review' ? 'check' : 'images'}
            title={tab === 'review' ? 'No studio images waiting' : 'Nothing here'}
            description={tab === 'review'
              ? (rendersEnabled ? 'Use "Find studio images" to check more models against the library.' : 'Studio images arrive here once the licence is set up. Meanwhile, upload official photos.')
              : 'Try another tab or search.'} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((row) => (
              <ModelCard key={row.id} row={row} busy={busyId === row.id}
                onReview={review} onUpload={upload} onRemove={remove} />
            ))}
          </ul>
        )}
    </div>
  )
}
