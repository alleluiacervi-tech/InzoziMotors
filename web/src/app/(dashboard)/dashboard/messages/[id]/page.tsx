import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getConversationMeta } from '@/components/dashboard/data'
import { ThreadView } from '@/components/dashboard/messages/ThreadView'
import { viewOf } from '@/components/dashboard/messages/shared'
import { ApiError, messages } from '@/lib/api'
import { getCurrentUser, getToken } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return { title: t('dashboard.meta.messages'), robots: { index: false, follow: false } }
}

type Params = Promise<{ id: string }>

// G1 in docs/WEB-PARITY-PLAN.md. The conversation's car/name metadata comes
// from the list endpoint (the thread endpoint itself only returns raw
// messages) — see getConversationMeta. A blocked or foreign conversation
// 404s from the thread fetch itself; the backend refuses to say more, and
// neither does this page.
export default async function ThreadPage({ params }: { params: Params }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return null

  const token = await getToken()
  if (!token) return null

  const [conv, initialMessages] = await Promise.all([
    getConversationMeta(id),
    messages.thread(token, id).catch((err) => {
      if (err instanceof ApiError && err.status === 404) notFound()
      throw err
    }),
  ])

  const view = conv
    ? viewOf(conv, user.id)
    : { id, otherId: '', otherName: '', lastMessage: null, lastMessageAt: null, unread: 0, carId: null, carTitle: null, carImage: null }

  return <ThreadView conversation={view} initialMessages={initialMessages} myId={user.id} />
}
