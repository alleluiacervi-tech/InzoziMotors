'use client'

import { useCallback, useEffect, useState } from 'react'
import { api, type ApiError, type CenterRow } from '@/lib/api'
import {
  Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader, Pill,
} from '@/components/ui'

// ─────────────────────────────────────────────────────────────────────────────
// Inspection centers.
//
// This table drives the booking capacity the scheduler enforces, and it had no
// interface at all — so adding a centre, changing a capacity, or closing one for
// a public holiday meant a hand-written UPDATE against production.
//
// The load figures are the reason this is a page rather than a form: "capacity 8"
// means nothing without "6 booked today". They are counted the same way
// submissions.js counts them, so what is shown here is what will gate the next
// booking.
// ─────────────────────────────────────────────────────────────────────────────

type Draft = { name: string; area: string; address: string; daily_capacity: string }

const EMPTY: Draft = { name: '', area: '', address: '', daily_capacity: '8' }

/** How full is today? Used for the bar and its colour. */
function loadTone(booked: number, cap: number) {
  if (cap === 0) return { pct: 100, cls: 'bg-content-muted', label: 'Closed to bookings' }
  const pct = Math.min(100, Math.round((booked / cap) * 100))
  if (booked >= cap) return { pct, cls: 'bg-danger-strong', label: 'Full today' }
  if (pct >= 75) return { pct, cls: 'bg-warning', label: 'Nearly full' }
  return { pct, cls: 'bg-success', label: 'Space today' }
}

export default function CentersPage() {
  const [rows, setRows] = useState<CenterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await api.centers())
    } catch (e) {
      setError(e as ApiError)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function say(msg: string) { setNotice(msg); setProblem(null) }
  function fail(e: unknown) {
    setProblem(e instanceof Error ? e.message : 'That did not work.')
    setNotice(null)
  }

  async function add() {
    setBusy('new')
    setProblem(null)
    try {
      const c = await api.createCenter({
        name: draft.name.trim(),
        area: draft.area.trim() || null,
        address: draft.address.trim() || null,
        daily_capacity: Number(draft.daily_capacity),
      })
      setAdding(false)
      setDraft(EMPTY)
      say(`${c.name} added.`)
      load()
    } catch (e) { fail(e) } finally { setBusy(null) }
  }

  async function saveEdit(id: string) {
    setBusy(id)
    setProblem(null)
    try {
      await api.updateCenter(id, {
        name: editDraft.name.trim(),
        area: editDraft.area.trim() || null,
        address: editDraft.address.trim() || null,
        daily_capacity: Number(editDraft.daily_capacity),
      })
      setEditId(null)
      say('Saved.')
      load()
    } catch (e) { fail(e) } finally { setBusy(null) }
  }

  async function setActive(c: CenterRow, active: boolean) {
    setBusy(c.id)
    setProblem(null)
    try {
      if (active) {
        await api.updateCenter(c.id, { active: true })
        say(`${c.name} is taking bookings again.`)
      } else {
        const res = await api.deactivateCenter(c.id)
        say(
          res.pending_inspections > 0
            ? `${c.name} closed to new bookings. ${res.pending_inspections} existing booking${res.pending_inspections === 1 ? '' : 's'} still need working through.`
            : `${c.name} closed to new bookings.`
        )
      }
      load()
    } catch (e) { fail(e) } finally { setBusy(null) }
  }

  const field =
    'h-10 w-full rounded-lg border border-line bg-surface px-3 text-label text-content placeholder:text-content-muted focus:border-content-muted focus:outline-none'

  return (
    <>
      <PageHeader
        title="Inspection centers"
        description="Capacity here is enforced on every booking — a full day is refused at the point of scheduling."
        action={
          <button
            type="button"
            onClick={() => { setAdding((v) => !v); setProblem(null) }}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-label font-bold text-brand-on transition-colors hover:bg-brand-bright"
          >
            <Icon name={adding ? 'close' : 'plus'} size={16} />
            {adding ? 'Cancel' : 'Add a center'}
          </button>
        }
      />

      {notice ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-success/30 bg-success-tint px-4 py-3 text-label font-semibold text-success-text">
          <Icon name="check-circle" size={16} />
          {notice}
        </div>
      ) : null}
      {problem ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-tint px-4 py-3 text-label font-semibold text-danger-strong">
          <span className="mt-0.5 shrink-0"><Icon name="alert" size={16} /></span>
          <span>{problem}</span>
        </div>
      ) : null}

      {adding ? (
        <Card className="mb-4 p-5">
          <h2 className="text-section font-extrabold text-content">New center</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 block text-caption font-semibold text-content-secondary">Name</span>
              <input className={field} value={draft.name} placeholder="Remera Center"
                onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-caption font-semibold text-content-secondary">Area</span>
              <input className={field} value={draft.area} placeholder="Remera, Gasabo"
                onChange={(e) => setDraft({ ...draft, area: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-caption font-semibold text-content-secondary">Address</span>
              <input className={field} value={draft.address} placeholder="KG 11 Ave"
                onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-caption font-semibold text-content-secondary">
                Inspections per day
              </span>
              <input className={field} type="number" min={0} max={200} value={draft.daily_capacity}
                onChange={(e) => setDraft({ ...draft, daily_capacity: e.target.value })} />
            </label>
          </div>
          <button
            type="button"
            disabled={busy === 'new' || !draft.name.trim()}
            onClick={add}
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-ink-900 px-5 text-label font-bold text-white transition-colors hover:bg-ink-800 disabled:opacity-50"
          >
            {busy === 'new' ? 'Adding…' : 'Add center'}
          </button>
        </Card>
      ) : null}

      {loading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="location"
          title="No centers yet"
          description="Add one before sellers can book an inspection — scheduling has nowhere to send them."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((c) => {
            const load = loadTone(c.booked_today, c.daily_capacity)
            const editing = editId === c.id
            return (
              <Card key={c.id} className={`p-5 ${c.active ? '' : 'opacity-70'}`}>
                {editing ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="block">
                        <span className="mb-1.5 block text-caption font-semibold text-content-secondary">Name</span>
                        <input className={field} value={editDraft.name}
                          onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-caption font-semibold text-content-secondary">Area</span>
                        <input className={field} value={editDraft.area}
                          onChange={(e) => setEditDraft({ ...editDraft, area: e.target.value })} />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-caption font-semibold text-content-secondary">Address</span>
                        <input className={field} value={editDraft.address}
                          onChange={(e) => setEditDraft({ ...editDraft, address: e.target.value })} />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-caption font-semibold text-content-secondary">
                          Inspections per day
                        </span>
                        <input className={field} type="number" min={0} max={200} value={editDraft.daily_capacity}
                          onChange={(e) => setEditDraft({ ...editDraft, daily_capacity: e.target.value })} />
                      </label>
                    </div>
                    {/* Said before they try it, not after it is refused: renaming
                        is the one edit here that can break capacity enforcement,
                        because inspections reference a centre by name. */}
                    {c.upcoming > 0 ? (
                      <p className="mt-3 text-caption leading-relaxed text-content-muted">
                        {c.upcoming} booking{c.upcoming === 1 ? '' : 's'} reference this center by name, so the
                        name cannot change until they are worked through. Capacity and address can.
                      </p>
                    ) : null}
                    <div className="mt-4 flex gap-2">
                      <button type="button" disabled={busy === c.id} onClick={() => saveEdit(c.id)}
                        className="inline-flex h-10 items-center rounded-xl bg-ink-900 px-4 text-label font-bold text-white hover:bg-ink-800 disabled:opacity-50">
                        {busy === c.id ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" onClick={() => setEditId(null)}
                        className="inline-flex h-10 items-center rounded-xl border border-line px-4 text-label font-semibold text-content hover:bg-surface-alt">
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-section font-extrabold text-content">{c.name}</h2>
                        {c.active ? <Pill status="live" label="Open" /> : <Pill status="sold" label="Closed" />}
                      </div>
                      <p className="mt-1 text-caption text-content-muted">
                        {[c.area, c.address].filter(Boolean).join(' · ') || 'No address recorded'}
                      </p>

                      <div className="mt-3 max-w-sm">
                        <div className="flex items-baseline justify-between">
                          <span className="text-caption font-semibold text-content-secondary">
                            {c.booked_today} of {c.daily_capacity} booked today
                          </span>
                          <span className="text-caption text-content-muted">{load.label}</span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-pill bg-surface-alt">
                          <div className={`h-full rounded-pill ${load.cls}`} style={{ width: `${load.pct}%` }} />
                        </div>
                        <p className="mt-1.5 text-caption text-content-muted">
                          {c.upcoming} upcoming · {c.all_time} all time
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(c.id)
                          setProblem(null)
                          setEditDraft({
                            name: c.name, area: c.area || '', address: c.address || '',
                            daily_capacity: String(c.daily_capacity),
                          })
                        }}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-4 text-label font-semibold text-content hover:bg-surface-alt"
                      >
                        <Icon name="settings" size={15} />
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy === c.id}
                        onClick={() => setActive(c, !c.active)}
                        className="inline-flex h-10 items-center rounded-xl border border-line px-4 text-label font-semibold text-content-secondary hover:bg-surface-alt disabled:opacity-50"
                      >
                        {c.active ? 'Close' : 'Reopen'}
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
