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
import { useT } from '@/lib/i18n/context'
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

function dayLabel(iso: string, todayLabel: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (dayKey(iso) === dayKey(today.toISOString())) return todayLabel
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

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
  let lastDay = ''

  return (
    <div className="flex h-[calc(100vh-var(--header-h)-2rem)] max-h-[820px] flex-col overflow-hidden rounded-2xl border border-line-soft bg-surface sm:h-[calc(100vh-var(--header-h)-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-line-soft px-4 py-3 sm:px-5">
        <Link
          href="/dashboard/messages"
          aria-label={t('messages.backToInbox')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-content-secondary hover:bg-surface-alt"
        >
          <Icon name="chevron-left" size={20} />
        </Link>
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-alt text-caption font-extrabold text-content-secondary ring-1 ring-inset ring-line"
        >
          {(conversation.otherName || '?').charAt(0).toUpperCase()}
        </span>
        <p className="min-w-0 flex-1 truncate text-body font-extrabold text-content">
          {conversation.otherName}
        </p>
        {conversation.carId ? (
          <Link
            href={`/cars/${conversation.carId}`}
            aria-label={t('messages.viewListing')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-content-secondary hover:bg-surface-alt"
          >
            <Icon name="car" size={18} />
          </Link>
        ) : null}
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            aria-label={t('messages.safety.menu')}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-content-secondary hover:bg-surface-alt"
          >
            <Icon name="settings" size={18} />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-xl border border-line-soft bg-surface p-1.5 shadow-card-lg">
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
                  {t('messages.safety.unblock', { name: conversation.otherName })}
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
                  {t('messages.safety.block', { name: conversation.otherName })}
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Pinned car card */}
      {conversation.carId && conversation.carTitle ? (
        <Link
          href={`/cars/${conversation.carId}`}
          className="flex items-center gap-3 border-b border-line-soft bg-surface-alt/60 px-4 py-2.5 hover:bg-surface-alt sm:px-5"
        >
          {conversation.carImage ? (
            <span className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-alt">
              <Image src={conversation.carImage} alt="" fill sizes="56px" className="object-cover" />
            </span>
          ) : null}
          <span className="min-w-0 flex-1 truncate text-caption font-bold text-content">
            {conversation.carTitle}
          </span>
          <Icon name="chevron-right" size={16} className="shrink-0 text-content-muted" />
        </Link>
      ) : null}

      {/* Inline panels */}
      {reportOpen ? (
        <div className="border-b border-line-soft bg-surface-alt px-4 py-3 sm:px-5">
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
        <div className="border-b border-line-soft bg-danger-tint px-4 py-3 sm:px-5">
          <p className="text-caption font-bold text-danger">
            {t('messages.safety.blockTitle', { name: conversation.otherName })}
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
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        {messages.length === 0 ? (
          <p className="pt-10 text-center text-caption text-content-muted">{t('messages.threadEmpty')}</p>
        ) : null}
        {messages.map((m) => {
          const showDay = dayKey(m.created_at) !== lastDay
          lastDay = dayKey(m.created_at)
          const mine = m.sender_id === myId
          return (
            <div key={m.id}>
              {showDay ? (
                <div className="my-3 text-center text-micro font-bold text-content-muted">
                  {dayLabel(m.created_at, t('messages.today'))}
                </div>
              ) : null}
              <div className={`mb-2 flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-caption leading-relaxed ${
                    mine ? 'bg-brand text-brand-on' : 'border border-line-soft bg-surface-alt text-content'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  <p className={`mt-0.5 text-right text-micro ${mine ? 'text-brand-on/70' : 'text-content-muted'}`}>
                    {timeLabel(m.created_at)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        {otherTyping ? (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-line-soft bg-surface-alt px-3.5 py-2 text-caption text-content-muted">
              {t('messages.typing')}
            </div>
          </div>
        ) : null}
        <div ref={listEndRef} />
      </div>

      {/* Compose */}
      {blocked ? (
        <div className="border-t border-line-soft bg-surface-alt px-4 py-3 text-center text-caption text-content-secondary sm:px-5">
          {isBlockedByMe
            ? t('messages.safety.blockedBanner', { name: conversation.otherName })
            : t('messages.safety.blockedByOther')}
        </div>
      ) : (
        <div className="border-t border-line-soft p-3 sm:p-4">
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
            className="flex items-end gap-2"
          >
            <textarea
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
              className="max-h-32 flex-1 resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-caption text-content placeholder:text-content-muted focus:border-brand focus:outline-none"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              aria-label={t('messages.send')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-brand-on disabled:opacity-40"
            >
              <Icon name="arrow-right" size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default ThreadView
