'use client'

import { useCallback, useEffect, useState } from 'react'
import { api, type ApiError, type MailEnvelope, type MailMessage } from '@/lib/api'
import {
  Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader, Pill,
} from '@/components/ui'
import { MessageBody } from './MessageBody'

// ─────────────────────────────────────────────────────────────────────────────
// The contact@sawacars.com inbox.
//
// Two panes: a list that stays put, and a reading pane beside it — because
// answering a mailbox is queue work, and a full-page navigation per message
// loses your place in the queue every time.
//
// Read live over IMAP by the API on every load. No mail is stored in our
// database, so deleting a message in webmail deletes it here, and there is no
// second copy to drift.
// ─────────────────────────────────────────────────────────────────────────────

const PAGE = 25

/** A mail failure is never rendered as an empty inbox. MAIL_NOT_CONFIGURED in
 *  particular means "nobody set the mailbox up", which is a completely different
 *  action from "nobody has written to us". */
function MailFailure({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  if (error.code === 'MAIL_NOT_CONFIGURED') {
    return (
      <EmptyState
        icon="mail"
        title="The mailbox is not connected yet"
        description="Set MAIL_USER and MAIL_PASS in the server environment, then restart the API. Nothing else on the dashboard is affected."
      />
    )
  }
  if (error.code === 'MAIL_AUTH_FAILED') {
    return (
      <ErrorState
        error={error}
        title="The mail server rejected our credentials"
        onRetry={onRetry}
      />
    )
  }
  return <ErrorState error={error} title="Cannot reach the mail server" onRetry={onRetry} />
}

function when(date: string | null): string {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  const sameYear = d.getFullYear() === now.getFullYear()
  return d.toLocaleDateString(undefined,
    sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: '2-digit' })
}

export default function InboxPage() {
  const [list, setList] = useState<MailEnvelope[]>([])
  const [total, setTotal] = useState(0)
  const [unread, setUnread] = useState(0)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  const [openUid, setOpenUid] = useState<number | null>(null)
  const [message, setMessage] = useState<MailMessage | null>(null)
  const [msgLoading, setMsgLoading] = useState(false)
  const [msgError, setMsgError] = useState<ApiError | null>(null)
  const [showImages, setShowImages] = useState(false)

  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<string | null>(null)
  const [replyError, setReplyError] = useState<string | null>(null)

  const loadList = useCallback(async (nextOffset: number, q: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.mail({ limit: PAGE, offset: nextOffset, q: q || undefined })
      setList(data.messages)
      setTotal(data.total)
      setUnread(data.unread)
    } catch (e) {
      setError(e as ApiError)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadList(offset, search) }, [loadList, offset, search])

  // Debounced search, so typing does not open an IMAP SEARCH per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setOffset(0)
      setSearch(query.trim())
    }, 400)
    return () => clearTimeout(t)
  }, [query])

  const openMessage = useCallback(async (uid: number, images = false) => {
    setOpenUid(uid)
    setMsgLoading(true)
    setMsgError(null)
    setMessage(null)
    setSent(null)
    setReplyError(null)
    if (!images) setShowImages(false)
    try {
      const m = await api.mailMessage(uid, { images })
      setMessage(m)
      // Opening marks it read server-side; reflect that here without refetching
      // the whole list.
      setList((prev) => prev.map((e) => (e.uid === uid ? { ...e, unread: false } : e)))
      setUnread((n) => {
        const wasUnread = list.find((e) => e.uid === uid)?.unread
        return wasUnread ? Math.max(0, n - 1) : n
      })
    } catch (e) {
      setMsgError(e as ApiError)
    } finally {
      setMsgLoading(false)
    }
  }, [list])

  async function sendReply() {
    if (!message || !reply.trim()) return
    setSending(true)
    setReplyError(null)
    try {
      const res = await api.mailReply(message.uid, reply)
      setSent(res.to)
      setReply('')
      setList((prev) => prev.map((e) => (e.uid === message.uid ? { ...e, answered: true } : e)))
    } catch (e) {
      const err = e as ApiError
      setReplyError(
        err.code === 'MAIL_RATE_LIMITED'
          ? 'That is a lot of replies in one minute. Wait a moment and try again.'
          : err.message
      )
    } finally {
      setSending(false)
    }
  }

  async function toggleFlag() {
    if (!message) return
    const env = list.find((e) => e.uid === message.uid)
    const next = !(env?.flagged)
    // Optimistic: a star that waits for a round trip feels broken.
    setList((prev) => prev.map((e) => (e.uid === message.uid ? { ...e, flagged: next } : e)))
    try {
      await api.mailFlag(message.uid, 'flagged', next)
    } catch {
      setList((prev) => prev.map((e) => (e.uid === message.uid ? { ...e, flagged: !next } : e)))
    }
  }

  const page = Math.floor(offset / PAGE) + 1
  const pages = Math.max(1, Math.ceil(total / PAGE))
  const openEnvelope = list.find((e) => e.uid === openUid)

  return (
    <>
      <PageHeader
        title="Inbox"
        description={
          error
            ? 'contact@sawacars.com'
            : `contact@sawacars.com · ${total} message${total === 1 ? '' : 's'}${unread ? `, ${unread} unread` : ''}`
        }
        action={
          <button
            type="button"
            onClick={() => loadList(offset, search)}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-label font-semibold text-content transition-colors hover:bg-surface-alt"
          >
            <Icon name="refresh" size={16} />
            Refresh
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        {/* ── List ─────────────────────────────────────────────────────────── */}
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <div className="border-b border-line-soft p-3">
            <label className="relative block">
              <span className="sr-only">Search the mailbox</span>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted">
                <Icon name="search" size={16} />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search sender, subject or body"
                className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-label text-content placeholder:text-content-muted focus:border-content-muted focus:outline-none"
              />
            </label>
          </div>

          {loading ? (
            <div className="p-3"><LoadingState rows={7} /></div>
          ) : error ? (
            <MailFailure error={error} onRetry={() => loadList(offset, search)} />
          ) : list.length === 0 ? (
            <EmptyState
              icon="mail"
              title={search ? 'Nothing matches that' : 'No mail yet'}
              description={
                search
                  ? 'Try a different sender, subject or phrase.'
                  : 'Messages sent to contact@sawacars.com appear here.'
              }
            />
          ) : (
            <ul className="min-h-0 flex-1 divide-y divide-line-soft overflow-y-auto">
              {list.map((m) => {
                const active = m.uid === openUid
                return (
                  <li key={m.uid}>
                    <button
                      type="button"
                      onClick={() => openMessage(m.uid)}
                      className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors ${
                        active ? 'bg-brand-tint' : 'hover:bg-surface-alt'
                      }`}
                    >
                      <span className="flex items-baseline gap-2">
                        {m.unread ? (
                          <span
                            className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand"
                            aria-label="Unread"
                          />
                        ) : (
                          <span className="mt-1 h-2 w-2 shrink-0" aria-hidden />
                        )}
                        <span
                          className={`min-w-0 flex-1 truncate text-label ${
                            m.unread ? 'font-bold text-content' : 'font-semibold text-content-secondary'
                          }`}
                        >
                          {m.from.name || m.from.address || 'Unknown sender'}
                        </span>
                        <span className="shrink-0 text-caption text-content-muted">{when(m.date)}</span>
                      </span>
                      <span className={`truncate pl-4 text-label ${m.unread ? 'text-content' : 'text-content-secondary'}`}>
                        {m.subject}
                      </span>
                      <span className="flex items-center gap-2 pl-4">
                        {m.answered ? <Pill status="complete" label="Replied" /> : null}
                        {m.flagged ? (
                          <span className="text-warning-text"><Icon name="star" size={13} /></span>
                        ) : null}
                        {m.attachmentCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-caption text-content-muted">
                            <Icon name="document" size={12} />
                            {m.attachmentCount}
                          </span>
                        ) : null}
                        <span className="ml-auto text-caption text-content-muted">{m.sizeLabel}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {!error && total > PAGE ? (
            <div className="flex items-center justify-between border-t border-line-soft px-3 py-2">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE))}
                className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-label font-semibold text-content-secondary disabled:opacity-40 enabled:hover:bg-surface-alt"
              >
                <Icon name="chevron-left" size={15} /> Newer
              </button>
              <span className="text-caption text-content-muted">Page {page} of {pages}</span>
              <button
                type="button"
                disabled={offset + PAGE >= total}
                onClick={() => setOffset(offset + PAGE)}
                className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-label font-semibold text-content-secondary disabled:opacity-40 enabled:hover:bg-surface-alt"
              >
                Older <Icon name="chevron-right" size={15} />
              </button>
            </div>
          ) : null}
        </Card>

        {/* ── Reading pane ─────────────────────────────────────────────────── */}
        <Card className="min-h-[420px] overflow-hidden">
          {openUid === null ? (
            <EmptyState
              icon="mail"
              title="Nothing open"
              description="Pick a message on the left to read and reply to it."
            />
          ) : msgLoading ? (
            <div className="p-5"><LoadingState rows={6} /></div>
          ) : msgError ? (
            <MailFailure error={msgError} onRetry={() => openMessage(openUid)} />
          ) : message ? (
            <div className="flex h-full flex-col">
              <div className="border-b border-line-soft p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-section font-extrabold text-content">{message.subject}</h2>
                  <button
                    type="button"
                    onClick={toggleFlag}
                    aria-label={openEnvelope?.flagged ? 'Remove flag' : 'Flag this message'}
                    className={`shrink-0 rounded-lg p-2 transition-colors hover:bg-surface-alt ${
                      openEnvelope?.flagged ? 'text-warning-text' : 'text-content-muted'
                    }`}
                  >
                    <Icon name="star" size={17} />
                  </button>
                </div>
                <p className="mt-2 text-label text-content-secondary">
                  <span className="font-semibold text-content">
                    {message.from.name || message.from.address}
                  </span>
                  {message.from.name ? (
                    <span className="text-content-muted"> &lt;{message.from.address}&gt;</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-caption text-content-muted">
                  {message.date ? new Date(message.date).toLocaleString() : 'No date'}
                  {message.to.length ? ` · to ${message.to.map((t) => t.address).join(', ')}` : ''}
                </p>

                {message.blockedImages > 0 && !showImages ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-alt px-3 py-2">
                    <span className="text-caption text-content-secondary">
                      {message.blockedImages} remote image{message.blockedImages === 1 ? '' : 's'} blocked.
                      Loading them tells the sender you opened this.
                    </span>
                    <button
                      type="button"
                      onClick={() => { setShowImages(true); openMessage(message.uid, true) }}
                      className="ml-auto text-caption font-bold text-brand underline underline-offset-2"
                    >
                      Load images
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
                <MessageBody html={message.bodyHtml} />

                {message.attachments.length > 0 ? (
                  <div className="mt-5 border-t border-line-soft pt-4">
                    <p className="mb-2 text-micro font-bold uppercase tracking-[0.1em] text-content-muted">
                      {message.attachments.length} attachment{message.attachments.length === 1 ? '' : 's'}
                    </p>
                    <ul className="space-y-2">
                      {message.attachments.map((a) => (
                        <li key={a.index}>
                          {/* A plain link, not a fetch: the file is a binary stream
                              and the httpOnly cookie authenticates it the same way
                              it does the contract PDF. Always downloads — the
                              server forces Content-Disposition: attachment, so an
                              HTML attachment can never execute in this origin. */}
                          <a
                            href={`/api/backend/mail/messages/${message.uid}/attachments/${a.index}`}
                            className="flex items-center gap-3 rounded-xl border border-line-soft bg-surface p-3 transition-colors hover:bg-surface-alt"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-content-secondary">
                              <Icon name="document" size={16} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-label font-semibold text-content">
                                {a.filename}
                              </span>
                              <span className="block text-caption text-content-muted">
                                {a.contentType} · {a.sizeLabel}
                              </span>
                            </span>
                            <span className="shrink-0 text-content-muted">
                              <Icon name="arrow-right" size={15} />
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              {/* ── Reply ──────────────────────────────────────────────────
                  Reply-only, to the sender of this message. There is no To:
                  field on purpose: a free recipient would turn this into a
                  send-anything-from-contact@ console, and abuse of the company's
                  real address gets the domain blacklisted. */}
              <div className="border-t border-line-soft bg-surface-alt p-4">
                {sent ? (
                  <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success-tint px-3 py-2 text-label font-semibold text-success-text">
                    <Icon name="check-circle" size={16} />
                    Reply sent to {sent}
                  </div>
                ) : (
                  <>
                    <label className="block">
                      <span className="mb-1.5 block text-caption font-semibold text-content-secondary">
                        Reply to {message.from.address}
                      </span>
                      <textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        rows={4}
                        maxLength={25_000}
                        placeholder="Type your reply…"
                        className="w-full resize-y rounded-xl border border-line bg-surface p-3 text-label leading-relaxed text-content placeholder:text-content-muted focus:border-content-muted focus:outline-none"
                      />
                    </label>
                    {replyError ? (
                      <p className="mt-2 text-caption font-semibold text-danger-strong">{replyError}</p>
                    ) : null}
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        type="button"
                        disabled={sending || !reply.trim()}
                        onClick={sendReply}
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-label font-bold text-white transition-colors hover:bg-brand-bright disabled:opacity-50"
                      >
                        <Icon name="mail" size={16} />
                        {sending ? 'Sending…' : 'Send reply'}
                      </button>
                      <span className="text-caption text-content-muted">
                        Sends from contact@sawacars.com and threads onto this message.
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </>
  )
}
