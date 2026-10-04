'use client'

import Image from '@/components/ui/SafeImage'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { getConversationsAction } from '@/app/(dashboard)/dashboard/messages/actions'
import { Icon } from '@/components/ui'
import { formatRelative } from '@/lib/business'
import { useSocket } from '@/lib/socket'
import { useT } from '@/lib/i18n/context'
import type { Conversation, Message } from '@/lib/types'
import { viewOf, type ConversationView } from './shared'

// The list side of G1 in docs/WEB-PARITY-PLAN.md, drawn as a messaging app's
// conversation list: avatar, name, the last line and how long ago, and a dot
// for unread. It sits beside the open conversation from lg up (see
// messages/layout.tsx), so the open one is highlighted.
//
// Live updates mirror AppContext.js's `new_message` handling: a message for a
// conversation already on screen bumps it to the top and updates its preview;
// a message for a conversation this list has never seen (a brand-new thread)
// triggers one refetch of the whole list rather than trying to reconstruct
// car/name metadata from the bare message payload.

function ConversationAvatar({ view, size = 56 }: { view: ConversationView; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-alt text-title-sm font-extrabold text-content-secondary ring-1 ring-inset ring-line"
    >
      {view.carImage ? (
        <Image src={view.carImage} alt="" fill sizes={`${size}px`} className="object-cover" />
      ) : (
        (view.otherName || '?').charAt(0).toUpperCase()
      )}
    </span>
  )
}

export function MessageInbox({ initial, myId }: { initial: Conversation[]; myId: string }) {
  const t = useT()
  const pathname = usePathname() || ''
  const activeId = pathname.match(/^\/dashboard\/messages\/([^/]+)/)?.[1] ?? null
  const [conversations, setConversations] = useState(initial)
  const [query, setQuery] = useState('')
  const { socket } = useSocket(true)

  // The layout re-renders with fresh data when a thread opens (ThreadView
  // refreshes the route); take it, or unread counts would never come down.
  useEffect(() => setConversations(initial), [initial])

  useEffect(() => {
    if (!socket) return
    const onNewMessage = (msg: Message & { sender_name?: string }) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === msg.conversation_id)
        if (idx === -1) {
          getConversationsAction().then((res) => {
            if (res.ok) setConversations(res.data)
          })
          return prev
        }
        const updated: Conversation = {
          ...prev[idx],
          last_message: msg.text,
          last_message_at: msg.created_at,
          unread_count:
            msg.sender_id === myId ? prev[idx].unread_count : Number(prev[idx].unread_count || 0) + 1,
        }
        const rest = prev.filter((_, i) => i !== idx)
        return [updated, ...rest]
      })
    }
    socket.on('new_message', onNewMessage)
    return () => {
      socket.off('new_message', onNewMessage)
    }
  }, [socket, myId])

  const views = useMemo(() => {
    const all = conversations.map((c) => viewOf(c, myId))
    const q = query.trim().toLowerCase()
    if (!q) return all
    return all.filter((v) =>
      [v.otherName, v.carTitle, v.lastMessage].some((s) => s?.toLowerCase().includes(q))
    )
  }, [conversations, myId, query])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="sticky top-14 z-10 shrink-0 bg-surface px-4 pb-3 pt-5 lg:static lg:px-5 lg:pt-7">
        <h1 className="text-title font-extrabold text-content">{t('messages.inboxTitle')}</h1>
        {conversations.length ? (
          <label className="mt-4 flex h-10 items-center gap-2 rounded-xl bg-surface-alt px-3 text-content-muted focus-within:ring-2 focus-within:ring-content/15">
            <Icon name="search" size={17} aria-hidden="true" />
            <span className="sr-only">{t('messages.search')}</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('messages.search')}
              className="h-full min-w-0 flex-1 bg-transparent text-caption text-content placeholder:text-content-muted focus:outline-none"
            />
          </label>
        ) : null}
      </div>

      {!conversations.length ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full ring-2 ring-content">
            <Icon name="mail" size={28} className="text-content" />
          </span>
          <p className="mt-4 text-body font-extrabold text-content">{t('messages.emptyTitle')}</p>
          <p className="mt-1 max-w-xs text-caption text-content-secondary">{t('messages.emptyBody')}</p>
          <Link
            href="/cars"
            className="mt-5 inline-flex h-10 items-center rounded-xl bg-brand px-4 text-caption font-bold text-brand-on"
          >
            {t('messages.browseCars')}
          </Link>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto pb-4 lg:px-2">
          {views.length === 0 ? (
            <li className="px-5 py-10 text-center text-caption text-content-muted">{t('messages.noMatches')}</li>
          ) : null}
          {views.map((view) => {
            const active = view.id === activeId
            // The open conversation is being read right now.
            const unread = active ? 0 : view.unread
            return (
              <li key={view.id}>
                <Link
                  href={`/dashboard/messages/${view.id}`}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors lg:rounded-xl lg:px-3 ${
                    active ? 'bg-surface-alt' : 'hover:bg-surface-alt/70'
                  }`}
                >
                  <ConversationAvatar view={view} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-caption text-content ${unread > 0 ? 'font-extrabold' : 'font-semibold'}`}>
                      {view.otherName}
                      {view.carTitle ? (
                        <span className="font-normal text-content-muted"> · {view.carTitle}</span>
                      ) : null}
                    </p>
                    <p
                      className={`mt-0.5 flex min-w-0 gap-1 text-caption ${
                        unread > 0 ? 'font-bold text-content' : 'text-content-muted'
                      }`}
                    >
                      <span className="truncate">{view.lastMessage || t('messages.startConversation')}</span>
                      {view.lastMessageAt ? (
                        <span className="shrink-0 text-content-muted">· {formatRelative(view.lastMessageAt)}</span>
                      ) : null}
                    </p>
                  </div>
                  {unread > 0 ? (
                    <span className="flex shrink-0 items-center">
                      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-brand" />
                      <span className="sr-only">{t('messages.unreadBadge', { count: unread })}</span>
                    </span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default MessageInbox
