'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  blockUserAction,
  reportConversationAction,
  sendMessageAction,
  unblockUserAction,
} from '@/app/(dashboard)/dashboard/messages/actions'
import { Alert, Icon } from '@/components/ui'
import { useSocket } from '@/lib/socket'
import { useLocale, useT } from '@/lib/i18n/context'
import type { Message } from '@/lib/types'
import type { ConversationView } from './shared'

const REPORT_REASONS = ['scam', 'harassment', 'spam', 'other'] as const
type ReportReason = (typeof REPORT_REASONS)[number]

function byCreatedAt(a: Message, b: Message): number {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
}

function dedupe(list: Message[]): Message[] {
  const seen = new Set<string>()
  return list.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true))).sort(byCreatedAt)
}

function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// Consecutive messages from one person, close together, read as one block:
// tight spacing, one avatar, rounded like a single speech bubble. A gap this
// long, or a new day, starts a new block with its own time stamp.
const GROUP_GAP_MS = 10 * 60 * 1000
const STAMP_GAP_MS = 60 * 60 * 1000

function stampLabel(iso: string, locale: string, labels: { today: string; yesterday: string }): string {
  const d = new Date(iso)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const time = d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
  if (dayKey(iso) === dayKey(now.toISOString())) return `${labels.today} ${time}`
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return `${labels.yesterday} ${time}`
  const date = d.toLocaleDateString(locale, {
    weekday: now.getTime() - d.getTime() < 6 * 86400000 ? 'long' : undefined,
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })
  return `${date}, ${time}`
}

function exactTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
}

// One conversation, drawn the way messaging apps have taught everyone to read
// one: the other person on the left in grey, you on the right in ink, bubbles
// grouped by who spoke and when, a quiet time stamp between blocks, "Seen"
// under your last message once it has been read, and a composer that grows
// with what you type. It fills its pane (messages/layout.tsx) and, on a
// phone, the whole screen.

export function ThreadView({
  conversation,
  initialMessages,
  myId,
}: {
  conversation: ConversationView
  initialMessages: Message[]
  myId: string
}) {
  const t = useT()
  const { locale } = useLocale()
  const router = useRouter()
  const { socket } = useSocket(true)

  const [messages, setMessages] = useState<Message[]>(() => dedupe(initialMessages))
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [failedText, setFailedText] = useState<string | null>(null)
  const [otherTyping, setOtherTyping] = useState(false)
  const [blockedByBackend, setBlockedByBackend] = useState(false)

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState<ReportReason | null>(null)
  const [reportBusy, setReportBusy] = useState(false)
  const [reportDone, setReportDone] = useState<'sent' | 'failed' | null>(null)

  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false)
  const [blockBusy, setBlockBusy] = useState(false)
  const [blockError, setBlockError] = useState<string | null>(null)
  const [isBlockedByMe, setIsBlockedByMe] = useState(false)

  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Fixes a staleness window that is otherwise inherent to server rendering:
  // the sidebar's unread-message badge (in the layout) and this page's
  // "mark read" side effect (in messages.thread(), server-side) run as part
  // of the SAME navigation, with no guaranteed order between them. By the
  // time this client component mounts, that server render has already
  // finished and sent its response, so a refresh here is guaranteed to see
  // the post-read state.
  useEffect(() => {
    router.refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id])

  useEffect(() => {
    if (!socket) return
    socket.emit('join_conversation', conversation.id)
    return () => {
      socket.emit('leave_conversation', conversation.id)
    }
  }, [socket, conversation.id])

  useEffect(() => {
    if (!socket) return
    const onNewMessage = (msg: Message) => {
      if (msg.conversation_id !== conversation.id) return
      setMessages((prev) => dedupe([...prev, msg]))
    }
    const onTyping = ({ conversationId }: { conversationId: string }) => {
      if (conversationId === conversation.id) setOtherTyping(true)
    }
    const onStopTyping = ({ conversationId }: { conversationId: string }) => {
      if (conversationId === conversation.id) setOtherTyping(false)
    }
    socket.on('new_message', onNewMessage)
    socket.on('user_typing', onTyping)
    socket.on('user_stop_typing', onStopTyping)
    return () => {
      socket.off('new_message', onNewMessage)
      socket.off('user_typing', onTyping)
      socket.off('user_stop_typing', onStopTyping)
    }
  }, [socket, conversation.id])

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, otherTyping])

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current)
    }
  }, [])

  // The composer grows with what is typed, up to about five lines.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }, [text])

  function handleTextChange(value: string) {
    setText(value)
    if (!socket) return
    socket.emit('typing', { conversationId: conversation.id })
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      socket.emit('stop_typing', { conversationId: conversation.id })
    }, 2000)
  }

  async function submit(value: string) {
    const trimmed = value.trim()
    if (!trimmed || sending) return
    setSending(true)
    setFailedText(null)
    socket?.emit('stop_typing', { conversationId: conversation.id })
    if (typingTimeout.current) clearTimeout(typingTimeout.current)

    const result = await sendMessageAction(conversation.id, trimmed)
    setSending(false)
    if (result.ok) {
      setMessages((prev) => dedupe([...prev, result.data]))
      setText('')
    } else {
      setFailedText(trimmed)
      if (result.error.includes('not available with this user')) setBlockedByBackend(true)
    }
  }

  async function onBlock() {
    if (!conversation.otherId) return
    setBlockBusy(true)
    setBlockError(null)
    const result = await blockUserAction(conversation.otherId)
    setBlockBusy(false)
    if (result.ok) {
      setIsBlockedByMe(true)
      setBlockConfirmOpen(false)
      setMenuOpen(false)
    } else {
      setBlockError(result.error)
    }
  }

  async function onUnblock() {
    if (!conversation.otherId) return
    setBlockBusy(true)
    setBlockError(null)
    const result = await unblockUserAction(conversation.otherId)
    setBlockBusy(false)
    if (result.ok) setIsBlockedByMe(false)
    else setBlockError(result.error)
  }

  async function onReport() {
    if (!reportReason) return
    setReportBusy(true)
    const result = await reportConversationAction(conversation.id, reportReason)
    setReportBusy(false)
    setReportDone(result.ok ? 'sent' : 'failed')
    if (result.ok) setReportOpen(false)
  }

  const blocked = isBlockedByMe || blockedByBackend
  const labels = { today: t('messages.today'), yesterday: t('messages.yesterday') }
  const other = conversation.otherName || '?'
  const otherInitial = other.charAt(0).toUpperCase()
  const lastMessage = messages[messages.length - 1]
  const at = (m?: Message) => (m ? new Date(m.created_at).getTime() : 0)
  const startsBlock = (m: Message, prev?: Message) =>
    !prev || dayKey(prev.created_at) !== dayKey(m.created_at) || at(m) - at(prev) > STAMP_GAP_MS

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      {/* Header: who, and what the conversation is about */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-line-soft px-2 sm:px-5">
        <Link
          href="/dashboard/messages"
          aria-label={t('messages.backToInbox')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-content hover:bg-surface-alt lg:hidden"
        >
          <Icon name="chevron-left" size={24} />
        </Link>
        {/* The car's photo when there is one, as in the conversation list:
            it is what the conversation is about. */}
        <span
          aria-hidden="true"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-alt text-caption font-extrabold text-content-secondary ring-1 ring-inset ring-line"
        >
          {conversation.carImage ? (
            <Image src={conversation.carImage} alt="" fill sizes="40px" className="object-cover" />
          ) : (
            otherInitial
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-caption font-extrabold text-content">{other}</p>
          <p className="truncate text-micro text-content-muted" aria-live="polite">
            {otherTyping ? t('messages.typing') : conversation.carTitle || ''}
          </p>
        </div>
        {conversation.carId ? (
          <Link
            href={`/cars/${conversation.carId}`}
            aria-label={t('messages.viewListing')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-content hover:bg-surface-alt"
          >
            <Icon name="car" size={21} />
          </Link>
        ) : null}
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            aria-label={t('messages.safety.menu')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-content hover:bg-surface-alt"
          >
            <Icon name="info" size={21} />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-line-soft bg-surface p-1.5 shadow-card-lg">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  setReportOpen(true)
                  setReportDone(null)
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-caption font-semibold text-content hover:bg-surface-alt"
              >
                <Icon name="alert" size={15} /> {t('messages.safety.report')}
              </button>
              {isBlockedByMe ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onUnblock()
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-caption font-semibold text-content hover:bg-surface-alt"
                >
                  <Icon name="shield-check" size={15} />
                  {t('messages.safety.unblock', { name: other })}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    setBlockConfirmOpen(true)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-caption font-semibold text-danger hover:bg-danger-tint"
                >
                  <Icon name="close-circle" size={15} />
                  {t('messages.safety.block', { name: other })}
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Inline panels */}
      {reportOpen ? (
        <div className="shrink-0 border-b border-line-soft bg-surface-alt px-4 py-3 sm:px-5">
          {reportDone === 'sent' ? (
            <Alert tone="success">{t('messages.safety.reportSent')}</Alert>
          ) : (
            <>
              <p className="text-caption font-bold text-content">{t('messages.safety.reportTitle')}</p>
              <p className="mt-1 text-micro text-content-muted">{t('messages.safety.reportBody')}</p>
              <div className="mt-3 space-y-1.5">
                {REPORT_REASONS.map((reason) => (
                  <label key={reason} className="flex items-center gap-2 text-caption text-content">
                    <input
                      type="radio"
                      name="report_reason"
                      value={reason}
                      checked={reportReason === reason}
                      onChange={() => setReportReason(reason)}
                      className="h-4 w-4 accent-brand"
                    />
                    {t(`messages.safety.reportReason${reason.charAt(0).toUpperCase()}${reason.slice(1)}`)}
                  </label>
                ))}
              </div>
              {reportDone === 'failed' ? (
                <Alert tone="danger" className="mt-2">{t('messages.safety.reportFailed')}</Alert>
              ) : null}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={onReport}
                  disabled={!reportReason || reportBusy}
                  className="h-9 rounded-lg bg-brand px-3 text-caption font-bold text-brand-on disabled:opacity-50"
                >
                  {t('messages.safety.reportSubmit')}
                </button>
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="h-9 rounded-lg px-3 text-caption font-bold text-content-secondary hover:bg-surface"
                >
                  {t('messages.safety.reportCancel')}
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {blockConfirmOpen ? (
        <div className="shrink-0 border-b border-line-soft bg-danger-tint px-4 py-3 sm:px-5">
          <p className="text-caption font-bold text-danger">
            {t('messages.safety.blockTitle', { name: other })}
          </p>
          <p className="mt-1 text-micro text-content-secondary">{t('messages.safety.blockBody')}</p>
          {blockError ? <Alert tone="danger" className="mt-2">{blockError}</Alert> : null}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onBlock}
              disabled={blockBusy}
              className="h-9 rounded-lg border border-danger/40 bg-surface px-3 text-caption font-bold text-danger hover:bg-danger-tint disabled:opacity-50"
            >
              {t('messages.safety.blockConfirm')}
            </button>
            <button
              type="button"
              onClick={() => setBlockConfirmOpen(false)}
              className="h-9 rounded-lg px-3 text-caption font-bold text-content-secondary hover:bg-surface"
            >
              {t('messages.safety.blockCancel')}
            </button>
          </div>
        </div>
      ) : null}

      {/* Messages */}
      <div role="log" aria-live="polite" className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center pt-10 text-center">
            <span
              aria-hidden="true"
              className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-alt text-title font-extrabold text-content-secondary ring-1 ring-inset ring-line"
            >
              {otherInitial}
            </span>
            <p className="mt-3 text-body font-extrabold text-content">{other}</p>
            {conversation.carTitle ? (
              <p className="text-caption text-content-muted">{conversation.carTitle}</p>
            ) : null}
            <p className="mt-4 max-w-xs text-caption text-content-secondary">{t('messages.threadEmpty')}</p>
          </div>
        ) : null}

        {messages.map((m, i) => {
          const prev = messages[i - 1]
          const next = messages[i + 1]
          const mine = m.sender_id === myId
          const stamp = startsBlock(m, prev)
          const joinsPrev = !stamp && prev?.sender_id === m.sender_id && at(m) - at(prev) < GROUP_GAP_MS
          const joinsNext =
            !!next && !startsBlock(next, m) && next.sender_id === m.sender_id && at(next) - at(m) < GROUP_GAP_MS
          // A block reads as one bubble: the corners between its messages
          // tighten on the sender's side.
          const shape = mine
            ? `${joinsPrev ? 'rounded-tr-md' : ''} ${joinsNext ? 'rounded-br-md' : ''}`
            : `${joinsPrev ? 'rounded-tl-md' : ''} ${joinsNext ? 'rounded-bl-md' : ''}`
          return (
            <div key={m.id}>
              {stamp ? (
                <p className="my-4 text-center text-micro font-semibold text-content-muted">
                  {stampLabel(m.created_at, locale, labels)}
                </p>
              ) : null}
              <div className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'} ${joinsNext ? 'mb-0.5' : 'mb-2'}`}>
                {!mine ? (
                  joinsNext ? (
                    <span aria-hidden="true" className="w-7 shrink-0" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-alt text-micro font-extrabold text-content-secondary ring-1 ring-inset ring-line"
                    >
                      {otherInitial}
                    </span>
                  )
                ) : null}
                <div
                  title={exactTime(m.created_at, locale)}
                  className={`max-w-[75%] rounded-[22px] px-4 py-2 text-caption leading-relaxed sm:max-w-[62%] ${
                    mine ? 'bg-content text-surface' : 'bg-surface-alt text-content'
                  } ${shape}`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                </div>
              </div>
              {mine && m.id === lastMessage?.id ? (
                <p className="-mt-1 mb-2 pr-1 text-right text-micro text-content-muted">
                  {m.read ? t('messages.seen') : t('messages.sent')}
                </p>
              ) : null}
            </div>
          )
        })}

        {otherTyping ? (
          <div className="flex items-end gap-2">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-alt text-micro font-extrabold text-content-secondary ring-1 ring-inset ring-line"
            >
              {otherInitial}
            </span>
            <div className="flex h-9 items-center gap-1 rounded-[22px] bg-surface-alt px-4">
              <span className="sr-only">{t('messages.typing')}</span>
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  aria-hidden="true"
                  style={{ animationDelay: `${delay}ms` }}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-content-muted motion-reduce:animate-none"
                />
              ))}
            </div>
          </div>
        ) : null}
        <div ref={listEndRef} />
      </div>

      {/* Compose */}
      {blocked ? (
        <div className="shrink-0 border-t border-line-soft bg-surface-alt px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-center text-caption text-content-secondary sm:px-5">
          {isBlockedByMe
            ? t('messages.safety.blockedBanner', { name: other })
            : t('messages.safety.blockedByOther')}
        </div>
      ) : (
        <div className="shrink-0 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 sm:px-5 sm:pb-4">
          {failedText ? (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-danger-tint px-3 py-2 text-micro text-danger">
              <span>{t('messages.failedToSend')}</span>
              <button type="button" onClick={() => submit(failedText)} className="font-bold underline">
                {t('messages.retry')}
              </button>
            </div>
          ) : null}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit(text)
            }}
            className="flex items-end gap-2 rounded-[24px] border border-line bg-surface py-1 pl-4 pr-2 transition-colors focus-within:border-content/40"
          >
            <label htmlFor="thread-composer" className="sr-only">{t('messages.placeholder')}</label>
            <textarea
              id="thread-composer"
              ref={inputRef}
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit(text)
                }
              }}
              placeholder={t('messages.placeholder')}
              rows={1}
              className="max-h-32 min-h-[38px] flex-1 resize-none bg-transparent py-2 text-caption text-content placeholder:text-content-muted focus:outline-none"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="h-[38px] shrink-0 rounded-full px-3 text-caption font-extrabold text-brand transition-opacity disabled:opacity-40"
            >
              {sending ? t('messages.sending') : t('messages.send')}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default ThreadView
