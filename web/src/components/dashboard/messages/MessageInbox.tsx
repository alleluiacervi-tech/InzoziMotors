'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getConversationsAction } from '@/app/(dashboard)/dashboard/messages/actions'
import { EmptyState } from '@/components/ui'
import { formatRelative } from '@/lib/business'
import { useSocket } from '@/lib/socket'
import { useT } from '@/lib/i18n/context'
import type { Conversation, Message } from '@/lib/types'
import { viewOf } from './shared'

// The list side of G1 in docs/WEB-PARITY-PLAN.md. Mirrors AppContext.js's
// `new_message` handling: a message for a conversation already on screen
// bumps it to the top and updates its preview; a message for a conversation
// this list has never seen (a brand-new thread) triggers one refetch of the
// whole list rather than trying to reconstruct car/name metadata from the
// bare message payload.
export function MessageInbox({ initial, myId }: { initial: Conversation[]; myId: string }) {
  const t = useT()
  const [conversations, setConversations] = useState(initial)
  const { socket } = useSocket(true)

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

  if (!conversations.length) {
    return (
      <EmptyState
        icon="mail"
        title={t('messages.emptyTitle')}
        description={t('messages.emptyBody')}
        action={
          <Link
            href="/cars"
            className="inline-flex h-11 items-center rounded-xl bg-brand px-4 text-caption font-bold text-brand-on"
          >
            {t('messages.browseCars')}
          </Link>
        }
      />
    )
  }

  return (
    <ul className="divide-y divide-line-soft rounded-2xl border border-line-soft bg-surface">
      {conversations.map((conv) => {
        const view = viewOf(conv, myId)
        return (
          <li key={view.id}>
            <Link
              href={`/dashboard/messages/${view.id}`}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-alt sm:px-5"
            >
              <span
                aria-hidden="true"
                className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-alt text-body font-extrabold text-content-secondary ring-1 ring-inset ring-line"
              >
                {view.carImage ? (
                  <Image src={view.carImage} alt="" fill sizes="44px" className="object-cover" />
                ) : (
                  (view.otherName || '?').charAt(0).toUpperCase()
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-body font-bold text-content">{view.otherName}</p>
                  <span className="shrink-0 text-micro text-content-muted">
                    {formatRelative(view.lastMessageAt)}
                  </span>
                </div>
                {view.carTitle ? (
                  <p className="truncate text-micro text-content-muted">{view.carTitle}</p>
                ) : null}
                <p
                  className={`truncate text-caption ${
                    view.unread > 0 ? 'font-bold text-content' : 'text-content-secondary'
                  }`}
                >
                  {view.lastMessage || t('messages.startConversation')}
                </p>
              </div>
              {view.unread > 0 ? (
                <span className="tnum flex h-6 min-w-6 shrink-0 items-center justify-center rounded-pill bg-brand px-1.5 text-micro font-bold leading-none text-brand-on">
                  {view.unread}
                  <span className="sr-only"> {t('messages.unreadBadge', { count: view.unread })}</span>
                </span>
              ) : null}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export default MessageInbox
