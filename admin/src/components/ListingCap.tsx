'use client'

// ─────────────────────────────────────────────────────────────────────────────
// How many cars this seller may hold on the marketplace.
//
// The number is the easy part. The thing this component exists to get right is
// what happens when an operator types a SMALLER number than the seller's
// current count — because the obvious implementation of "cap of 20" is to pull
// 14 cars down, and that would delete a paying customer's shopfront in bulk,
// from a form field, with no confirmation.
//
// The server refuses to do that. So the interface has to say so plainly, at
// the moment it happens, or the operator will go looking for cars they believe
// they just removed and find them all still live.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { api } from '@/lib/api'

interface Props {
  userId: string
  name: string
  /** Current cap, or null when the seller has none. */
  cap: number | null
  note: string | null
  /** How many of their cars are live or paused right now. */
  occupied?: number
  onSaved: () => void
  toast: (message: string, tone?: 'success' | 'error' | 'info') => void
}

export default function ListingCap({ userId, name, cap, note, occupied, onSaved, toast }: Props) {
  const [value, setValue] = useState(cap == null ? '' : String(cap))
  const [reason, setReason] = useState(note || '')
  const [busy, setBusy] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)

  const save = async (next: number | null) => {
    setBusy(true)
    setWarning(null)
    try {
      const result = await api.setListingCap(userId, next, reason.trim() || undefined)
      // The over-cap case is not an error and must not be a toast that
      // disappears — it stays on screen until the operator navigates away,
      // because it describes a state they created and may not expect.
      if (result.warning) setWarning(result.warning)
      toast(
        next === null
          ? `${name} can publish without a limit again.`
          : `${name} is capped at ${next} listing${next === 1 ? '' : 's'}.`,
        'success',
      )
      onSaved()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Could not set the listing cap', 'error')
    } finally {
      setBusy(false)
    }
  }

  const parsed = value.trim() === '' ? null : Number(value)
  const invalid = parsed !== null && (!Number.isInteger(parsed) || parsed < 1)
  const lowering = parsed !== null && typeof occupied === 'number' && occupied > parsed

  return (
    <div className="rounded-xl border border-line-soft p-4 sm:col-span-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-label font-bold text-content">Listings allowed on the marketplace</p>
        {typeof occupied === 'number' ? (
          <p className="text-caption text-content-muted">
            {occupied} live or paused right now
          </p>
        ) : null}
      </div>
      <p className="mt-1 text-caption leading-relaxed text-content-muted">
        Leave blank for no limit. Counted across live and paused listings — a paused car still
        holds its place. Enforced when a car is published, never when one is submitted, so an
        inspection you have already done is never wasted.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-label font-semibold text-content">
          Maximum
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="No limit"
            className="mt-1.5 h-11 w-32 rounded-xl border border-line bg-surface px-3 font-normal focus:outline-none"
          />
        </label>
        <label className="min-w-[12rem] flex-1 text-label font-semibold text-content">
          Why (optional)
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Bronze plan, agreed 12 Aug"
            className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:outline-none"
          />
        </label>
        <button
          type="button"
          disabled={busy || invalid}
          onClick={() => save(parsed)}
          className="h-11 rounded-xl bg-ink-900 px-4 text-label font-bold text-white disabled:opacity-40"
        >
          {busy ? 'Saving…' : 'Set limit'}
        </button>
        {cap !== null ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => { setValue(''); save(null) }}
            className="h-11 rounded-xl border border-line px-4 text-label font-bold text-content-secondary disabled:opacity-40"
          >
            Remove limit
          </button>
        ) : null}
      </div>

      {invalid ? (
        <p className="mt-2 text-caption font-semibold text-danger-strong">
          A limit must be a whole number of 1 or more. To stop this seller publishing at all,
          suspend the account instead — that says so where everyone can see it.
        </p>
      ) : null}

      {/* Said BEFORE they press the button, not only after. */}
      {lowering && !invalid ? (
        <p className="mt-2 rounded-lg bg-warning-tint px-3 py-2 text-caption font-semibold text-warning-text">
          {name} has {occupied} listings up. Setting {parsed} will not remove any of them — they
          will simply be unable to publish another until they are back under.
        </p>
      ) : null}

      {warning ? (
        <p className="mt-2 rounded-lg bg-warning-tint px-3 py-2 text-caption font-semibold text-warning-text">
          {warning}
        </p>
      ) : null}
    </div>
  )
}
