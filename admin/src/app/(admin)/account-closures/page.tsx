'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Account closures.
//
// The one thing this page deliberately does NOT have is an approve or deny
// button. Apple's Guideline 5.1.1(v) requires deletion to be initiated AND
// completed from inside the app, so a request that waits for somebody here to
// agree would be a rejection risk and, more to the point, would put this
// company between a person and their own account.
//
// What the business actually wanted from an approval step was visibility — who
// left, and why. That is what this is. Every closure has already happened; the
// only action available is finishing the job thirty days later, and even that
// picks nobody: the predicate decides who is due.
//
// The tally is the part worth looking at. Reasons were made a fixed vocabulary
// so they could be counted, and a count of why people leave is the most useful
// thing on this page — more useful than any individual row.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { api, type ClosedAccount } from '@/lib/api'
import { Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader } from '@/components/ui'
import { useConfirm, useToast } from '@/components/feedback'

const dayOf = (value: string) => String(value).slice(0, 10)

export default function AccountClosuresPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [closures, setClosures] = useState<ClosedAccount[]>([])
  const [tally, setTally] = useState<{ closure_reason: string; label: string; n: number }[]>([])
  const [recoveryDays, setRecoveryDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [purging, setPurging] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await api.accountClosures()
      setClosures(data.closures || [])
      setTally(data.tally || [])
      setRecoveryDays(data.recovery_days ?? 30)
    } catch (e) { setError(e) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const due = closures.filter((row) => row.due_for_purge)
  const totalClosures = tally.reduce((sum, row) => sum + row.n, 0)

  const purge = async () => {
    const ok = await confirm({
      title: `Erase ${due.length} closed account${due.length === 1 ? '' : 's'}?`,
      message:
        `Their ${recoveryDays} days have passed. This deletes each profile, its contact details, `
        + 'identity documents, saved cars and saved searches, and archives any remaining listings. '
        + 'It cannot be undone, and it is what these people were told would happen.',
      confirmLabel: 'Erase them',
    })
    if (!ok) return
    setPurging(true)
    try {
      const result = await api.purgeClosedAccounts()
      toast(`${result.purged} account${result.purged === 1 ? '' : 's'} erased`, 'success')
      await load()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Could not erase these accounts', 'error')
    } finally { setPurging(false) }
  }

  if (loading) return <LoadingState rows={6} />
  if (error) return <ErrorState error={error} title="Couldn’t load account closures" onRetry={load} />

  return (
    <div>
      <PageHeader
        title="Account closures"
        description={`Who closed their account and why. A closure is immediate and needs nobody’s approval — the app stores require that — so nothing here is waiting on a decision. Data is erased ${recoveryDays} days later.`}
      />

      {/* ── The work, when there is any ────────────────────────────────────── */}
      {due.length ? (
        <Card className="border-warning/40 bg-warning-tint p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 font-extrabold text-warning-text">
                <Icon name="alert" size={16} />
                {due.length} account{due.length === 1 ? '' : 's'} ready to be erased
              </h2>
              <p className="mt-1 max-w-2xl text-caption leading-relaxed text-content-secondary">
                The {recoveryDays}-day window has passed. Nothing does this automatically — this
                backend has no scheduler, deliberately — so it waits here until somebody presses
                the button. Erasing is what these people were promised.
              </p>
            </div>
            <button
              onClick={purge}
              disabled={purging}
              className="flex-none rounded-xl bg-danger px-5 py-3 text-label font-bold text-white disabled:opacity-40"
            >
              {purging ? 'Erasing…' : `Erase ${due.length}`}
            </button>
          </div>
        </Card>
      ) : null}

      {/* ── Why people leave ───────────────────────────────────────────────── */}
      {tally.length ? (
        <Card className="mt-5 p-5">
          <h2 className="font-extrabold text-content">Why people leave</h2>
          <p className="mt-1 text-caption text-content-muted">
            Every closure ever recorded — {totalClosures} in total. Reasons survive the erasure
            because they carry no personal data, so this history stays answerable.
          </p>
          <ul className="mt-4 space-y-2">
            {tally.map((row) => (
              <li key={row.closure_reason} className="flex items-center gap-3">
                <span className="w-56 flex-none truncate text-label text-content-secondary">{row.label}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-alt">
                  <span
                    className="block h-full rounded-full bg-brand"
                    style={{ width: `${totalClosures ? Math.max(3, (row.n / totalClosures) * 100) : 0}%` }}
                  />
                </span>
                <span className="w-10 flex-none text-right text-label font-bold text-content">{row.n}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* ── The individual closures ────────────────────────────────────────── */}
      <Card className="mt-5 p-5">
        <h2 className="font-extrabold text-content">Closed accounts</h2>
        {closures.length === 0 ? (
          <EmptyState
            icon="user"
            title="Nobody has closed their account"
            description="When somebody does, it appears here with their reason — already done, not waiting on you."
          />
        ) : (
          <ul className="mt-4 space-y-2">
            {closures.map((row) => (
              <li
                key={row.id}
                className={`rounded-xl border p-3 ${
                  row.due_for_purge ? 'border-warning/40 bg-warning-tint' : 'border-line-soft'
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-content">{row.name}</p>
                    <p className="truncate text-caption text-content-muted">
                      {row.email} · {row.role} · closed {dayOf(row.closed_at)}
                    </p>
                  </div>
                  <span className="rounded-md bg-surface-alt px-2 py-1 text-caption font-bold text-content-secondary">
                    {row.reason_label}
                  </span>
                  <span className={`text-caption font-bold ${row.due_for_purge ? 'text-warning-text' : 'text-content-muted'}`}>
                    {row.due_for_purge ? 'Ready to erase' : `Erases ${dayOf(row.purge_after)}`}
                  </span>
                </div>
                {row.closure_note ? (
                  <p className="mt-2 border-l-2 border-line pl-3 text-caption leading-relaxed text-content-secondary">
                    “{row.closure_note}”
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
