'use server'

import { revalidatePath } from 'next/cache'
import { ApiError, messages } from '@/lib/api'
import { getToken } from '@/lib/session'
import type { Conversation, Message } from '@/lib/types'

// Called imperatively from client components (MessageInbox, ThreadView), not
// wired to a <form action>, so each returns a plain result rather than the
// dashboard's usual ActionState — there is no form to re-render with field
// errors here, just a live UI reacting to a socket and a person typing.

type Result<T> = { ok: true; data: T } | { ok: false; error: string }

function describe(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.isNetworkError) return 'Could not reach Sawa Cars. Please try again.'
    return err.message
  }
  return fallback
}

/** The inbox's fallback when a live `new_message` names a conversation it has
 *  never seen (a brand-new thread) — mirrors the app's same refetch-on-miss
 *  behaviour in AppContext.js. */
export async function getConversationsAction(): Promise<Result<Conversation[]>> {
  const token = await getToken()
  if (!token) return { ok: false, error: 'Sign in to see your messages.' }
  try {
    return { ok: true, data: await messages.conversations(token) }
  } catch (err) {
    return { ok: false, error: describe(err, "Couldn't load your messages.") }
  }
}

export async function sendMessageAction(conversationId: string, text: string): Promise<Result<Message>> {
  const token = await getToken()
  if (!token) return { ok: false, error: 'Sign in to send a message.' }
  try {
    const message = await messages.send(token, conversationId, text)
    revalidatePath('/dashboard/messages')
    return { ok: true, data: message }
  } catch (err) {
    return { ok: false, error: describe(err, "Message didn't send. Check your connection and try again.") }
  }
}

export async function blockUserAction(otherId: string): Promise<Result<true>> {
  const token = await getToken()
  if (!token) return { ok: false, error: 'Sign in to do that.' }
  try {
    await messages.block(token, otherId)
    revalidatePath('/dashboard/messages')
    return { ok: true, data: true }
  } catch (err) {
    return { ok: false, error: describe(err, "Couldn't block this person. Try again.") }
  }
}

export async function unblockUserAction(otherId: string): Promise<Result<true>> {
  const token = await getToken()
  if (!token) return { ok: false, error: 'Sign in to do that.' }
  try {
    await messages.unblock(token, otherId)
    revalidatePath('/dashboard/messages')
    return { ok: true, data: true }
  } catch (err) {
    return { ok: false, error: describe(err, "Couldn't unblock this person. Try again.") }
  }
}

export async function reportConversationAction(conversationId: string, reason: string): Promise<Result<true>> {
  const token = await getToken()
  if (!token) return { ok: false, error: 'Sign in to do that.' }
  try {
    await messages.report(token, conversationId, reason)
    return { ok: true, data: true }
  } catch (err) {
    return { ok: false, error: describe(err, "Couldn't send your report. Try again.") }
  }
}
