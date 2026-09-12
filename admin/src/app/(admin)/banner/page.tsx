'use client'

// ─────────────────────────────────────────────────────────────────────────────
// The home-screen banner.
//
// This is the most valuable space the company owns, and until now it showed
// three hardcoded marketing slides over stock studio photography — not one car
// anybody could buy. This page is where an operator decides what goes there.
//
// The design constraint that shapes everything below: Sawa's product is
// INDEPENDENT verification. A slot a seller paid for and a slot we chose on the
// merits are different claims, and if the interface lets an operator blur them
// then the app will too. So the kind is a required, visible, three-way choice
// rather than a checkbox, the money field only exists for the paid kind, and
// the page states what the buyer will be shown.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import {
  Card, PageHeader, EmptyState, ErrorState, LoadingState, Icon, fmtMoneyShort,
} from '@/components/ui'
import { useConfirm, useToast } from '@/components/feedback'

type Kind = 'editorial' | 'hot_deal' | 'sponsored'

const KINDS: { value: Kind; label: string; shown: string; blurb: string }[] = [
  {
    value: 'editorial', label: 'Editorial pick', shown: 'Featured',
    blurb: 'We chose this car on the merits. Our judgement, our reputation.',
  },
  {
    value: 'hot_deal', label: 'Hot deal', shown: 'Hot deal',
    blurb: 'We think the price is notable. Still our judgement, not the seller’s money.',
  },
  {
    value: 'sponsored', label: 'Paid placement', shown: 'Sponsored',
    blurb: 'The seller paid for this slot. The app labels it Sponsored to every buyer.',
  },
]

export default function BannerPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [placements, setPlacements] = useState<any[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const [draft, setDraft] = useState<{
    car_id: string; kind: Kind; days: number; slot: number; headline: string; amount: string
  }>({ car_id: '', kind: 'editorial', days: 7, slot: 1, headline: '', amount: '' })

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [banner, live] = await Promise.all([
        api.featuredBanner(12),
        api.carsPage({ status: 'live', limit: '100' }),
      ])
      setPlacements(banner)
      setCandidates(live.items || [])
    } catch (e) { setError(e) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const place = async () => {
    if (!draft.car_id) { toast('Choose a car first', 'error'); return }
    setBusy('place')
    try {
      await api.featureCar(draft.car_id, {
        kind: draft.kind,
        days: draft.days,
        slot: draft.slot,
        headline: draft.headline.trim() || undefined,
        amount_rwf: draft.kind === 'sponsored' ? Number(draft.amount) : undefined,
      })
      toast('Placed in the banner', 'success')
      setDraft({ car_id: '', kind: 'editorial', days: 7, slot: 1, headline: '', amount: '' })
      await load()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Could not place this car', 'error')
    } finally { setBusy(null) }
  }

  const end = async (row: any) => {
    const ok = await confirm({
      title: `Take ${row.title} out of the banner?`,
      message: row.sponsored
        ? 'This is a paid placement. Ending it early is a conversation with the seller — the reason is kept on the record.'
        : 'It stops appearing immediately. The placement stays on the record.',
      confirmLabel: 'End placement',
    })
    if (!ok) return
    setBusy(row.placement_id)
    try {
      await api.cancelFeature(row.placement_id, row.sponsored ? 'Ended early by an operator' : 'Rotated out')
      toast('Removed from the banner', 'success')
      await load()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Could not end this placement', 'error')
    } finally { setBusy(null) }
  }

  const chosen = KINDS.find((k) => k.value === draft.kind)!
  const alreadyPlaced = new Set(placements.map((p) => p.id))

  if (loading) return <LoadingState rows={6} />
  if (error) return <ErrorState error={error} title="Couldn’t load the banner" onRetry={load} />

  return (
    <div>
      <PageHeader
        title="Home banner"
        description="What the app shows at the top of the home screen, in slot order. A car leaves the banner the moment it leaves the marketplace — sold, paused, or its seller’s identity revoked — with nothing to remember to clean up."
      />

      {/* ── What is running now ───────────────────────────────────────────── */}
      <Card className="p-5">
        <h2 className="font-extrabold text-content">Running now</h2>
        {placements.length === 0 ? (
          <EmptyState
            icon="car"
            title="Nothing is placed"
            description="The app falls back to its three service slides — true statements about Sawa, but not a car anybody can buy."
          />
        ) : (
          <ul className="mt-4 space-y-2">
            {placements.map((row) => (
              <li key={row.placement_id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-line-soft p-3">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-surface-alt text-label font-extrabold text-content-secondary">
                  {row.slot}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-content">{row.headline || row.title}</p>
                  <p className="text-caption text-content-muted">
                    {row.seller_name} · runs to {String(row.ends_at).slice(0, 10)}
                    {row.inspection_score ? ` · ${row.inspection_score}/150` : ''}
                  </p>
                </div>
                <span className={`rounded-md px-2 py-1 text-caption font-bold ${
                  row.sponsored
                    ? 'bg-warning-tint text-warning-text'
                    : 'bg-surface-alt text-content-secondary'
                }`}>
                  {row.label}
                </span>
                <Link href={`/listings/${row.id}/edit`} className="text-label font-bold text-brand">
                  Open
                </Link>
                <button
                  onClick={() => end(row)}
                  disabled={busy === row.placement_id}
                  className="rounded-lg border border-line px-3 py-1.5 text-label font-bold text-content-secondary disabled:opacity-40"
                >
                  {busy === row.placement_id ? 'Ending…' : 'End'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ── Place a car ───────────────────────────────────────────────────── */}
      <Card className="mt-5 p-5">
        <h2 className="font-extrabold text-content">Place a car</h2>
        <p className="mt-1 text-caption text-content-muted">
          Only live listings can be placed — a banner slot pointing at a car nobody can open is
          worse than an empty one.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-label font-semibold text-content md:col-span-2">
            Car
            <select
              value={draft.car_id}
              onChange={(e) => setDraft({ ...draft, car_id: e.target.value })}
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:outline-none"
            >
              <option value="">Choose a live listing…</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id} disabled={alreadyPlaced.has(c.id)}>
                  {c.title}{alreadyPlaced.has(c.id) ? ' — already in the banner' : ''}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="md:col-span-2">
            <legend className="text-label font-semibold text-content">Why is it here?</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {KINDS.map((k) => (
                <label
                  key={k.value}
                  className={`cursor-pointer rounded-xl border p-3 ${
                    draft.kind === k.value ? 'border-brand bg-brand-tint' : 'border-line-soft'
                  }`}
                >
                  <input
                    type="radio" name="kind" value={k.value}
                    checked={draft.kind === k.value}
                    onChange={() => setDraft({ ...draft, kind: k.value, amount: '' })}
                    className="sr-only"
                  />
                  <span className="block text-label font-bold text-content">{k.label}</span>
                  <span className="mt-1 block text-caption leading-relaxed text-content-muted">{k.blurb}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 flex items-center gap-2 text-caption text-content-secondary">
              <Icon name="eye" size={14} />
              Buyers will see this labelled <strong className="font-bold">{chosen.shown}</strong>.
            </p>
          </fieldset>

          <label className="text-label font-semibold text-content">
            Slot
            <input
              type="number" min={1} max={999} value={draft.slot}
              onChange={(e) => setDraft({ ...draft, slot: Number(e.target.value) })}
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:outline-none"
            />
            <span className="mt-1 block text-caption font-normal text-content-muted">Lower shows first.</span>
          </label>

          <label className="text-label font-semibold text-content">
            Days
            <input
              type="number" min={1} max={30} value={draft.days}
              onChange={(e) => setDraft({ ...draft, days: Number(e.target.value) })}
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:outline-none"
            />
          </label>

          <label className="text-label font-semibold text-content md:col-span-2">
            Headline (optional)
            <input
              value={draft.headline} maxLength={120}
              onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
              placeholder="Shown instead of the car’s title — e.g. “Ex-embassy, one owner”"
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:outline-none"
            />
          </label>

          {/* Money exists only on the paid kind. Not disabled — absent, so
              there is nothing to fill in by accident on an editorial pick. */}
          {draft.kind === 'sponsored' ? (
            <label className="text-label font-semibold text-content md:col-span-2">
              Agreed amount (RWF)
              <input
                type="number" min={0} value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:outline-none"
              />
              <span className="mt-1 block text-caption font-normal text-content-muted">
                Recorded here, not collected here. Take the money the way you always do
                {draft.amount && Number(draft.amount) > 0
                  ? ` — ${fmtMoneyShort(Number(draft.amount), 'RWF')}.`
                  : '.'}
              </span>
            </label>
          ) : null}
        </div>

        <button
          onClick={place}
          disabled={busy === 'place' || !draft.car_id}
          className="mt-5 rounded-xl bg-brand px-5 py-3 text-label font-bold text-brand-on disabled:opacity-40"
        >
          {busy === 'place' ? 'Placing…' : `Place as ${chosen.shown}`}
        </button>
      </Card>
    </div>
  )
}
