'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Brands.
//
// The list a seller picks from used to be twenty names in a mobile screen,
// copied into a second screen. Widening it needed an App Store release, and it
// contained no Chinese marque while the catalogue already held Dongfeng, BYD
// and Denza — so a seller with a BYD picked the nearest wrong answer. One did:
// there is a BYD Qin Plus recorded as a Hyundai, in a banner slot, whose own
// description opens "The 2023 BYD Qin Plus".
//
// So the most important thing on this page is not the grid of brands. It is the
// UNRECOGNISED list at the top: makes that appear on real listings but match no
// brand row. That is where a misfiled car announces itself, and it is why that
// panel comes first and is styled to be noticed rather than tucked at the end.
//
// Logos are uploaded here, never committed to the repository. They are
// third-party trademarks, and a build bundling sixty of them ships somebody
// else's assets to two app stores. A brand with no logo is not broken — every
// client draws a lettermark — so this page says so plainly rather than showing
// sixty empty boxes that read as a loading failure.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react'
import { api, type MakeRow } from '@/lib/api'
import { Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader } from '@/components/ui'
import { useToast } from '@/components/feedback'

/** Same two-letter rule the app uses, so a brand looks identical in both. */
function initials(name: string) {
  const words = name.trim().split(/[\s-]+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return (words[0] || '?').slice(0, 2).toUpperCase()
}

function Mark({ make, size = 40 }: { make: MakeRow; size?: number }) {
  const box = { width: size, height: size }
  if (make.logo_url) {
    return (
      <span className="flex flex-none items-center justify-center rounded-lg border border-line-soft bg-surface p-1" style={box}>
        {/* Plain <img>: these are operator uploads on an arbitrary host, and
            next/image would need every one of them in remotePatterns. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={make.logo_url} alt="" className="max-h-full max-w-full object-contain" />
      </span>
    )
  }
  return (
    <span
      className="flex flex-none items-center justify-center rounded-lg bg-surface-alt text-label font-extrabold text-content-secondary"
      style={box}
    >
      {initials(make.name)}
    </span>
  )
}

export default function BrandsPage() {
  const toast = useToast()
  const [makes, setMakes] = useState<MakeRow[]>([])
  const [unrecognised, setUnrecognised] = useState<{ make: string; listings: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await api.makes()
      setMakes(data.makes || [])
      setUnrecognised(data.unrecognised || [])
    } catch (e) { setError(e) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const patch = async (make: MakeRow, body: Parameters<typeof api.updateMake>[1]) => {
    setBusy(make.id)
    try {
      const updated = await api.updateMake(make.id, body)
      setMakes((rows) => rows.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)))
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Could not save that change', 'error')
    } finally { setBusy(null) }
  }

  const upload = async (make: MakeRow, file: File) => {
    setBusy(make.id)
    try {
      const form = new FormData()
      form.append('logo', file)
      const updated = await api.uploadMakeLogo(make.id, form)
      setMakes((rows) => rows.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)))
      toast(`${make.name} logo saved`, 'success')
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Could not upload that logo', 'error')
    } finally { setBusy(null) }
  }

  const add = async () => {
    const name = newName.trim()
    if (!name) return
    setBusy('new')
    try {
      await api.createMake(name)
      setNewName('')
      toast(`${name} added`, 'success')
      await load()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Could not add that brand', 'error')
    } finally { setBusy(null) }
  }

  if (loading) return <LoadingState rows={8} />
  if (error) return <ErrorState error={error} title="Couldn’t load the brands" onRetry={load} />

  const visible = showInactive ? makes : makes.filter((m) => m.active)
  const withLogo = makes.filter((m) => m.logo_url).length

  return (
    <div>
      <PageHeader
        title="Brands"
        description="What a seller can choose from, and the mark each brand shows. Served to the app and the website, so adding one takes effect within minutes — no release."
      />

      {/* ── Where a misfiled car shows up ──────────────────────────────────── */}
      {unrecognised.length ? (
        <Card className="border-warning/40 bg-warning-tint p-5">
          <h2 className="flex items-center gap-2 font-extrabold text-warning-text">
            <Icon name="alert" size={16} />
            {unrecognised.length} make{unrecognised.length === 1 ? '' : 's'} on listings that match no brand
          </h2>
          <p className="mt-1 max-w-3xl text-caption leading-relaxed text-content-secondary">
            Either the brand belongs on the list — add it below and the spelling starts matching —
            or the listing is filed wrongly and should be corrected on the car itself. A car under
            the wrong brand cannot be found by anyone filtering for the right one.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {unrecognised.map((row) => (
              <li key={row.make} className="rounded-lg border border-warning/40 bg-surface px-3 py-1.5 text-label">
                <strong className="font-bold text-content">{row.make}</strong>
                <span className="ml-2 text-content-muted">{row.listings} listing{row.listings === 1 ? '' : 's'}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* ── Add ────────────────────────────────────────────────────────────── */}
      <Card className="mt-5 p-5">
        <h2 className="font-extrabold text-content">Add a brand</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-label font-semibold text-content">
            Name
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') add() }}
              placeholder="e.g. Jetour"
              className="mt-1.5 h-11 w-64 rounded-xl border border-line bg-surface px-3 font-normal focus:outline-none"
            />
          </label>
          <button
            onClick={add}
            disabled={busy === 'new' || !newName.trim()}
            className="h-11 rounded-xl bg-brand px-5 text-label font-bold text-brand-on disabled:opacity-40"
          >
            {busy === 'new' ? 'Adding…' : 'Add'}
          </button>
          <p className="text-caption text-content-muted">
            Alternative spellings can be added afterwards, on the brand itself.
          </p>
        </div>
      </Card>

      {/* ── The list ───────────────────────────────────────────────────────── */}
      <Card className="mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-content">{visible.length} brands</h2>
            <p className="mt-1 text-caption text-content-muted">
              {withLogo} have a logo. The rest show their initials — which is a finished look, not a
              missing one, so there is no hurry.
            </p>
          </div>
          <label className="flex items-center gap-2 text-label font-semibold text-content-secondary">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show switched-off brands
          </label>
        </div>

        {visible.length === 0 ? (
          <EmptyState icon="car" title="No brands" description="Migration 0035 has not been applied." />
        ) : (
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {visible.map((make) => (
              <li
                key={make.id}
                // flex-wrap plus a full-width action group below sm: a mark,
                // a name and three buttons cannot share one line at 390px, and
                // the row was pushing the whole page 113px wide — the only
                // horizontal overflow left in the console.
                className={`flex flex-wrap items-center gap-3 rounded-xl border border-line-soft p-3 ${
                  make.active ? '' : 'opacity-55'
                }`}
              >
                <Mark make={make} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-content">{make.name}</p>
                  <p className="truncate text-caption text-content-muted">
                    {make.listings ? `${make.listings} listing${make.listings === 1 ? '' : 's'}` : 'No listings'}
                    {make.aliases?.length ? ` · also ${make.aliases.join(', ')}` : ''}
                  </p>
                </div>

                <input
                  ref={(el) => { fileInputs.current[make.id] = el }}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) upload(make, file)
                    e.target.value = ''
                  }}
                />
                {/* The actions take their own full-width line below sm and sit
                    inline from there up. h-9 rather than py-1.5: these were
                    ~30px targets on the one page you operate with a thumb. */}
                <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
                  <button
                    onClick={() => fileInputs.current[make.id]?.click()}
                    disabled={busy === make.id}
                    className="flex h-9 items-center rounded-lg border border-line px-3 text-label font-bold text-content-secondary disabled:opacity-40"
                  >
                    {busy === make.id ? '…' : make.logo_url ? 'Replace' : 'Logo'}
                  </button>
                  {make.logo_url ? (
                    <button
                      onClick={() => patch(make, { logo_url: null })}
                      disabled={busy === make.id}
                      title="Remove the logo — the brand falls back to its initials"
                      aria-label={`Remove the ${make.name} logo`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-content-muted disabled:opacity-40"
                    >
                      {/* Icon, not a ✕ character: the glyph rendered at the
                          font's whim and carried no accessible name. */}
                      <Icon name="close" size={15} />
                    </button>
                  ) : null}
                  <button
                    onClick={() => patch(make, { active: !make.active })}
                    disabled={busy === make.id}
                    title={make.active
                      ? 'Stop offering this brand to new sellers. Existing listings are untouched.'
                      : 'Offer this brand again'}
                    className={`flex h-9 items-center rounded-lg px-3 text-label font-bold disabled:opacity-40 ${
                      make.active ? 'bg-surface-alt text-content-secondary' : 'bg-success text-white'
                    }`}
                  >
                    {make.active ? 'On' : 'Off'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
