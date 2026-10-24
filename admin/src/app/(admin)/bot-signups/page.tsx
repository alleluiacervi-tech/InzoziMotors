'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { api, type SignupDecision, type SignupScreening, type SuspectedBot } from '@/lib/api'
import { reasonLabel } from '@/lib/account-protection'
import { fmtDateTime, fmtInt } from '@/lib/format'
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, Pill, StatCard } from '@/components/ui'
import { useReason, useToast } from '@/components/feedback'

// ─────────────────────────────────────────────────────────────────────────────
// Bot sign-ups (backend lib/signup-risk.js, routes/admin-security.js).
//
// Every sign-up is screened: refused when it proves itself a script, held when
// it only looks like one (it can do nothing until its email is confirmed),
// allowed otherwise. This page shows the last week's decisions, sweeps the held
// accounts that never did anything, and clears the rows earlier erases left.
// ─────────────────────────────────────────────────────────────────────────────

const DECISIONS: { key: SignupDecision | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'held', label: 'Held' },
  { key: 'allowed', label: 'Allowed' },
]

const decisionPill = (d: SignupDecision) => (
  <Pill status={d === 'allowed' ? 'approved' : d === 'held' ? 'pending' : 'rejected'}
    label={d === 'allowed' ? 'Allowed' : d === 'held' ? 'Held' : 'Blocked'} />
)

export default function BotSignupsPage() {
  const toast = useToast()
  const askReason = useReason()
  const [filter, setFilter] = useState<SignupDecision | 'all'>('all')
  const [summary, setSummary] = useState<Record<SignupDecision, number> | null>(null)
  const [screenings, setScreenings] = useState<SignupScreening[]>([])
  const [bots, setBots] = useState<{ count: number; limit: number; accounts: SuspectedBot[] } | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<'erase' | 'purge' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [log, held] = await Promise.all([
        api.signupScreenings(filter === 'all' ? undefined : filter),
        api.suspectedBots(),
      ])
      setSummary(log.last_7_days)
      setScreenings(log.screenings)
      setBots(held)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  async function eraseAll() {
    if (!bots || !bots.count) return
    const typed = await askReason({
      title: `Erase ${bots.count} suspected bot account${bots.count === 1 ? '' : 's'}?`,
      message: 'Each one is held and never sent a message, submitted a car, listed a rental or placed an order. They are deleted for good, with their sign-in history. This cannot be undone.',
      audience: `Type ${bots.count} to confirm`,
      placeholder: String(bots.count),
      minLength: 1,
      confirmLabel: 'Erase them',
      tone: 'danger',
    })
    if (!typed) return
    if (typed.trim() !== String(bots.count)) {
      toast('That number does not match. Nothing was erased.', 'error')
      return
    }
    setBusy('erase')
    try {
      const done = await api.eraseSuspectedBots(bots.count)
      toast(`${fmtInt(done.erased)} account${done.erased === 1 ? '' : 's'} erased`, 'success')
      await load()
    } catch (e: any) { toast(e.message, 'error') }
    finally { setBusy(null) }
  }

  async function purgeLeftovers() {
    setBusy('purge')
    try {
      const done = await api.purgeErasedRows()
      toast(done.checked === 0
        ? 'Nothing left over to remove'
        : `${fmtInt(done.removed)} of ${fmtInt(done.checked)} removed${done.kept ? `; ${done.kept} kept for other people's history` : ''}`, 'success')
    } catch (e: any) { toast(e.message, 'error') }
    finally { setBusy(null) }
  }

  return (
    <div>
      <PageHeader
        title="Bot sign-ups"
        description="Every sign-up is checked. Scripts are refused; look-alikes are held until they confirm their email; everyone else gets in as before."
      />

      {error ? <ErrorState error={error} onRetry={load} /> : loading && !summary ? <LoadingState /> : (
        <div className="grid gap-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Blocked (7 days)" value={fmtInt(summary?.blocked ?? 0)} sub="No account was made" icon="shield" tone={summary?.blocked ? 'danger' : 'neutral'} />
            <StatCard label="Held (7 days)" value={fmtInt(summary?.held ?? 0)} sub="Must confirm their email" icon="lock" tone={summary?.held ? 'warning' : 'neutral'} />
            <StatCard label="Allowed (7 days)" value={fmtInt(summary?.allowed ?? 0)} sub="Signed up normally" icon="users" />
          </div>

          <Card className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-body font-bold text-content">Held and never used</h2>
                <p className="mt-1 max-w-2xl text-label text-content-muted">
                  Held accounts with no message, car, rental or order. A held account that did talk to someone stays out of this list;
                  open it in Users to decide.
                </p>
              </div>
              <button type="button" onClick={eraseAll} disabled={!bots?.count || busy !== null}
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-danger px-4 text-label font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40">
                {busy === 'erase' ? 'Erasing…' : `Erase all ${bots?.count ?? 0}`}
              </button>
            </div>
            {bots && bots.accounts.length ? (
              <ul className="mt-4 divide-y divide-line-soft rounded-xl border border-line-soft">
                {bots.accounts.map((b) => (
                  <li key={b.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <Link href={`/users?q=${encodeURIComponent(b.email)}`} className="block truncate text-label font-bold text-content hover:underline">{b.name}</Link>
                      <p className="truncate text-caption text-content-muted">{b.email}</p>
                      <p className="text-caption text-content-muted">{b.access_hold_reasons.map(reasonLabel).join(' · ') || 'Held'}</p>
                    </div>
                    <div className="shrink-0 text-caption text-content-muted sm:text-right">
                      <p>Joined {fmtDateTime(b.created_at)}</p>
                      {b.last_ip ? <p className="break-all font-mono">{b.last_ip}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-label text-content-muted">None right now.</p>
            )}
            {bots && bots.count >= bots.limit ? (
              <p className="mt-3 text-caption text-content-muted">Showing the newest {bots.limit}. Erase these and the next ones appear.</p>
            ) : null}
          </Card>

          <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-line-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-body font-bold text-content">Recent sign-ups</h2>
              <div role="tablist" aria-label="Filter by decision" className="flex flex-wrap gap-1.5">
                {DECISIONS.map((d) => (
                  <button key={d.key} type="button" role="tab" aria-selected={filter === d.key} onClick={() => setFilter(d.key)}
                    className={`h-9 rounded-full px-3.5 text-label font-semibold transition-colors ${filter === d.key ? 'bg-content text-surface' : 'border border-line text-content hover:bg-surface-alt'}`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            {screenings.length === 0 ? (
              <EmptyState icon="users" title="No sign-ups here yet" description="Decisions appear as people sign up, from the moment this check was switched on." />
            ) : (
              <ul className="divide-y divide-line-soft">
                {screenings.map((s) => (
                  <li key={s.id} className="grid gap-1.5 px-5 py-3 sm:grid-cols-[1fr_auto] sm:gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {decisionPill(s.decision)}
                        {s.user_id && !s.erased ? (
                          <Link href={`/users?q=${encodeURIComponent(s.email)}`} className="truncate text-label font-bold text-content hover:underline">{s.email}</Link>
                        ) : (
                          <span className="truncate text-label font-bold text-content">{s.email === 'erased' ? 'Erased account' : s.email}</span>
                        )}
                        {s.access_hold ? <span className="text-caption font-bold text-warning-text">still held</span> : null}
                      </div>
                      {s.reasons.length ? <p className="mt-1 text-caption text-content-muted">{s.reasons.map(reasonLabel).join(' · ')}</p> : null}
                    </div>
                    <div className="text-caption text-content-muted sm:text-right">
                      <p>{fmtDateTime(s.created_at)} · {s.client === 'web' ? 'website' : 'app'}</p>
                      {s.ip ? <p className="break-all font-mono">{s.ip}{s.country ? ` · ${s.country === 'T1' ? 'Tor' : s.country}` : ''}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-body font-bold text-content">Leftovers from earlier erases</h2>
                <p className="mt-1 max-w-2xl text-label text-content-muted">
                  Test accounts erased before this change were only blanked to &ldquo;Deleted user&rdquo;. This removes those rows completely
                  wherever nobody else&rsquo;s conversation, inspection or payment still points at them.
                </p>
              </div>
              <button type="button" onClick={purgeLeftovers} disabled={busy !== null}
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-line px-4 text-label font-bold text-content hover:bg-surface-alt disabled:opacity-40">
                {busy === 'purge' ? 'Removing…' : 'Remove leftovers'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
