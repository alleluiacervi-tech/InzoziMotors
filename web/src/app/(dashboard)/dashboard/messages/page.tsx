import type { Metadata } from 'next'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { getConversations } from '@/components/dashboard/data'
import { MessageInbox } from '@/components/dashboard/messages/MessageInbox'
import { getCurrentUser } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return { title: t('dashboard.meta.messages'), robots: { index: false, follow: false } }
}

// G1 in docs/WEB-PARITY-PLAN.md — the website's first real inbox. Everything
// live (new messages arriving, unread counts moving) is handled client-side
// by MessageInbox once it has this first, server-rendered page of data.
export default async function MessagesPage() {
  const t = await getServerT()
  const user = await getCurrentUser()
  if (!user) return null
  const conversations = await getConversations()

  return (
    <>
      <PageHeader title={t('messages.inboxTitle')} description={t('messages.inboxDescription')} />
      <MessageInbox initial={conversations} myId={user.id} />
    </>
  )
}
