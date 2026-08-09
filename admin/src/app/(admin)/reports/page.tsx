'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  api, type ApiError, type MessageReport, type ReportThreadMessage,
} from '@/lib/api'
import {
  Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader, Pill,
} from '@/components/ui'

// ─────────────────────────────────────────────────────────────────────────────
// Reported messages.
//
// Users could already report a message and the API already served the queue —
// there was simply no page, so every report went into a table nobody looked at.
// Besides the operational hole, App Store guideline 1.2 requires a way to act on
// reports about user-generated content, so an invisible queue is a review risk
// as well as a safety one.
//
// The design follows what a moderator actually needs to decide: who is being
// accused (not just who complained), the exact message, the conversation around
// it, and whether the reporter has already protected themselves by blocking.
// ─────────────────────────────────────────────────────────────────────────────

const TABS: { key: 'open' | 'resolved' | 'dismissed' | 'all'; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'dismissed', label: 'Dismissed' },
  { key: 'all', label: 'All' },
]

function ago(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const mins = Math.round((Date.now() - then) / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

export default function ReportsPage() {
  const [tab, setTab] = useState<'open' | 'resolved' | 'dismissed' | 'all'>('open')
  const [rows, setRows] = useState<MessageReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const [openThread, setOpenThread] = useState<string | null>(null)
  const [thread, setThread] = useState<ReportThreadMessage[]>([])
  const [threadLoading, setThreadLoading] = useState(false)

  const load = useCallback(async (t: typeof tab) => {
    setLoading(true)
    setError(null)
    try {
      setRows(await api.reports(t))
    } catch (e) {
      setError(e as ApiError)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(tab) }, [load, tab])

  async function showThread(id: string) {
    if (openThread === id) { setOpenThread(null); return }
    setOpenThread(id)
    setThreadLoading(true)
    setThread([])
    try {
      const t = await api.reportThread(id)
      setThread(t.messages)
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Could not load the conversation.')
    } finally {
      setThreadLoading(false)
    }
  }

  async function close(id: string, status: 'resolved' | 'dismissed') {
    setBusy(id)
    setProblem(null)
    try {
      await api.closeReport(id, status)
      load(tab)
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Could not update that report.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Reported messages"
        description="Chat reports from buyers and sellers. Resolved means you acted; dismissed means it was not abuse — both are kept, so a repeat offender is visible."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`inline-flex h-10 items-center rounded-xl px-4 text-label font-semibold transition-colors ${
              tab === t.key
                ? 'bg-ink-900 text-white'
                : 'border border-line bg-surface text-content-secondary hover:bg-surface-alt'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {problem ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-tint px-4 py-3 text-label font-semibold text-danger-strong">
          <span className="mt-0.5 shrink-0"><Icon name="alert" size={16} /></span>
          <span>{problem}</span>
        </div>
      ) : null}

      {loading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => load(tab)} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="shield-check"
          title={tab === 'open' ? 'Nothing reported' : `No ${tab} reports`}
          description={
            tab === 'open'
              ? 'Reports raised from a chat in the app appear here.'
              : 'Nothing has been closed with this outcome yet.'
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-section font-extrabold text-content">{r.reason}</h2>
                    <Pill status={r.status === 'open' ? 'open' : r.status === 'resolved' ? 'resolved' : 'cancelled'}
                      label={r.status} />
                    {r.reporter_has_blocked ? (
                      <span className="inline-flex items-center gap-1 rounded-pill bg-surface-alt px-2 py-0.5 text-caption font-semibold text-content-secondary">
                        <Icon name="lock" size={11} />
                        Already blocked
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-caption text-content-muted">
                    {ago(r.created_at)}
                    {r.car_title ? ` · about ${r.car_title}` : ''}
                  </p>
                </div>
                {r.status === 'open' ? (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => close(r.id, 'resolved')}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink-900 px-4 text-label font-bold text-white hover:bg-ink-800 disabled:opacity-50"
                    >
                      <Icon name="check" size={15} />
                      Acted on it
                    </button>
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => close(r.id, 'dismissed')}
                      className="inline-flex h-10 items-center rounded-xl border border-line px-4 text-label font-semibold text-content-secondary hover:bg-surface-alt disabled:opacity-50"
                    >
                      Not abuse
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Who complained and who it is about. A queue that names only the
                  complainant cannot be acted on. */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line-soft bg-surface-alt p-3">
                  <p className="text-micro font-bold uppercase tracking-[0.1em] text-content-muted">Reported by</p>
                  <p className="mt-1 text-label font-semibold text-content">{r.reporter_name}</p>
                  <p className="text-caption text-content-muted">{r.reporter_email}</p>
                </div>
                <div className="rounded-xl border border-danger/25 bg-danger-tint p-3">
                  <p className="text-micro font-bold uppercase tracking-[0.1em] text-danger-strong">Reported party</p>
                  <p className="mt-1 text-label font-semibold text-content">
                    {/* accused_id is a UUID, so it must be compared to an id —
                        comparing it to buyer_name was always false and always
                        fell through to the seller. */}
                    {r.message_sender_name
                      || (r.accused_id === r.buyer_id ? r.buyer_name : r.seller_name)
                      || 'The other party in the thread'}
                  </p>
                  <p className="text-caption text-content-muted">
                    {r.buyer_name && r.seller_name ? `${r.buyer_name} ↔ ${r.seller_name}` : ''}
                  </p>
                </div>
              </div>

              {r.message_text ? (
                <blockquote className="mt-3 rounded-xl border-l-4 border-danger-strong bg-surface-alt py-3 pl-4 pr-3">
                  <p className="text-label leading-relaxed text-content">{r.message_text}</p>
                  {r.message_sent_at ? (
                    <p className="mt-1.5 text-caption text-content-muted">
                      sent {new Date(r.message_sent_at).toLocaleString()}
                    </p>
                  ) : null}
                </blockquote>
              ) : (
                <p className="mt-3 text-caption italic text-content-muted">
                  The whole conversation was reported rather than one message.
                </p>
              )}

              <button
                type="button"
                onClick={() => showThread(r.id)}
                className="mt-3 inline-flex items-center gap-1.5 text-label font-semibold text-brand hover:underline"
              >
                <Icon name={openThread === r.id ? 'chevron-up' : 'chevron-down'} size={14} />
                {openThread === r.id ? 'Hide the conversation' : 'Read the conversation'}
              </button>

              {openThread === r.id ? (
                <div className="mt-3 rounded-xl border border-line-soft bg-surface-alt p-3">
                  {threadLoading ? (
                    <LoadingState rows={3} />
                  ) : thread.length === 0 ? (
                    <p className="text-caption text-content-muted">No messages in this conversation.</p>
                  ) : (
                    <ul className="space-y-2">
                      {thread.map((m) => (
                        <li
                          key={m.id}
                          className={`rounded-lg p-2.5 ${
                            m.is_reported
                              ? 'border border-danger/30 bg-danger-tint'
                              : 'bg-surface'
                          }`}
                        >
                          <p className="text-caption font-bold text-content-secondary">
                            {m.sender_name}
                            <span className="ml-2 font-normal text-content-muted">
                              {new Date(m.created_at).toLocaleString()}
                            </span>
                            {m.is_reported ? (
                              <span className="ml-2 font-bold text-danger-strong">· reported</span>
                            ) : null}
                          </p>
                          <p className="mt-1 text-label leading-relaxed text-content">{m.text}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
