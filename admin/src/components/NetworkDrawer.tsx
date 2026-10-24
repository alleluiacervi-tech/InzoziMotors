'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api, type UserNetwork } from '@/lib/api'
import { deviceLabel, reasonLabel, SOURCE_LABEL } from '@/lib/account-protection'
import { fmtDateTime } from '@/lib/format'
import { ErrorState, Icon, LoadingState, Pill } from '@/components/ui'

// ─────────────────────────────────────────────────────────────────────────────
// Where one account is used from (GET /admin/users/:id/network). The newest
// address is "now"; every earlier network stays listed with when it was first
// and last seen, so a move between Wi-Fi, mobile data or countries is visible.
// Opening this writes to the activity log: an address is personal data.
// ─────────────────────────────────────────────────────────────────────────────

export function NetworkDrawer({ user, onClose }: {
  user: { id: string; name: string; email: string; access_hold?: string | null }
  onClose: () => void
}) {
  const panel = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<UserNetwork | null>(null)
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setError(null)
    setData(null)
    try { setData(await api.userNetwork(user.id)) } catch (e) { setError(e) }
  }, [user.id])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const current = data?.current

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/40" onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="network-drawer-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-line bg-surface shadow-card-lg outline-none"
      >
        <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-line-soft bg-surface px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id="network-drawer-title" className="text-body font-bold leading-tight text-content">Where {user.name} signs in from</h2>
            <p className="mt-0.5 truncate text-label text-content-muted">{user.email}</p>
            {user.access_hold ? <div className="mt-2"><Pill status="rejected" label="Held · suspected bot" /></div> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-content-muted transition-colors hover:bg-surface-alt hover:text-content">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="grid gap-6 px-5 py-5">
          {error ? <ErrorState error={error} onRetry={load} /> : !data ? <LoadingState rows={4} /> : (
            <>
              <section aria-labelledby="net-now">
                <h3 id="net-now" className="mb-2 text-caption font-bold uppercase tracking-widest text-content-muted">Now</h3>
                {current ? (
                  <div className="rounded-xl border border-line-soft bg-surface-alt p-4">
                    <p className="break-all font-mono text-body font-bold text-content">{current.ip}</p>
                    <p className="mt-1 text-label text-content-secondary">
                      {current.country ? (current.country === 'T1' ? 'Tor network' : current.country) : 'Country unknown'}
                      {' · '}{deviceLabel(current.user_agent)}
                    </p>
                    <p className="mt-1 text-caption text-content-muted">
                      Last seen {fmtDateTime(current.last_seen_at)} · {SOURCE_LABEL[current.last_source] || current.last_source}
                    </p>
                  </div>
                ) : (
                  <p className="text-label text-content-muted">
                    No address recorded yet. Addresses are kept from sign-up, sign-in and use of the account since this was switched on.
                  </p>
                )}
              </section>

              {data.addresses.length > 1 ? (
                <section aria-labelledby="net-history">
                  <h3 id="net-history" className="mb-2 text-caption font-bold uppercase tracking-widest text-content-muted">
                    Every address ({data.addresses.length})
                  </h3>
                  <ul className="divide-y divide-line-soft rounded-xl border border-line-soft">
                    {data.addresses.map((a) => (
                      <li key={a.ip} className="px-4 py-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <span className="break-all font-mono text-label font-bold text-content">{a.ip}</span>
                          <span className="text-caption text-content-muted">{a.country === 'T1' ? 'Tor' : a.country || '—'}</span>
                        </div>
                        <p className="mt-1 text-caption text-content-muted">
                          {fmtDateTime(a.first_seen_at)} → {fmtDateTime(a.last_seen_at)} · {a.seen_count}× · first by {(SOURCE_LABEL[a.first_source] || a.first_source).toLowerCase()}
                        </p>
                        <p className="text-caption text-content-muted">{deviceLabel(a.user_agent)}</p>
                        {a.other_accounts > 0 ? (
                          <p className="mt-1 text-caption font-bold text-warning-text">
                            {a.other_accounts} other account{a.other_accounts === 1 ? '' : 's'} used this address
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section aria-labelledby="net-related">
                <h3 id="net-related" className="mb-2 text-caption font-bold uppercase tracking-widest text-content-muted">Other accounts on the same addresses</h3>
                {data.related_accounts.length ? (
                  <ul className="grid gap-2">
                    {data.related_accounts.map((r) => (
                      <li key={r.id}>
                        <Link href={`/users?q=${encodeURIComponent(r.email)}`}
                          className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-line-soft px-4 py-2.5 hover:bg-surface-alt">
                          <span className="min-w-0">
                            <span className="block truncate text-label font-bold text-content">{r.name}</span>
                            <span className="block truncate text-caption text-content-muted">{r.email} · joined {fmtDateTime(r.created_at)}</span>
                          </span>
                          {r.access_hold ? <Pill status="rejected" label="Held" /> : <Pill status={r.role} />}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-label text-content-muted">None. A shared office or mobile network can put real people on one address, so treat a match as a lead, not proof.</p>
                )}
              </section>

              {data.screenings.length ? (
                <section aria-labelledby="net-signup">
                  <h3 id="net-signup" className="mb-2 text-caption font-bold uppercase tracking-widest text-content-muted">Sign-up check</h3>
                  {data.screenings.map((s, i) => (
                    <div key={i} className="rounded-xl border border-line-soft p-4">
                      <div className="flex items-center gap-2">
                        <Pill status={s.decision === 'allowed' ? 'approved' : s.decision === 'held' ? 'pending' : 'rejected'}
                          label={s.decision === 'allowed' ? 'Allowed' : s.decision === 'held' ? 'Held' : 'Blocked'} />
                        <span className="text-caption text-content-muted">{fmtDateTime(s.created_at)} · {s.client === 'web' ? 'website' : 'app'}</span>
                      </div>
                      {s.reasons.length ? (
                        <ul className="mt-2 list-disc pl-5 text-label text-content-secondary">
                          {s.reasons.map((r) => <li key={r}>{reasonLabel(r)}</li>)}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
