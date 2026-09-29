import { getConversations } from '@/components/dashboard/data'
import { MessageInbox } from '@/components/dashboard/messages/MessageInbox'
import { MessagesSplit } from '@/components/dashboard/messages/MessagesSplit'
import { getCurrentUser } from '@/lib/session'

// The inbox as a messaging app lays it out: the conversation list on the left
// and the open conversation beside it, both at full height. On a phone the two
// take turns — the list at /dashboard/messages, a conversation on its own
// screen at /dashboard/messages/[id] (MessagesSplit decides which shows).
//
// The list lives here, in the layout, so it stays on screen and keeps its
// scroll position while conversations change beside it. ThreadView refreshes
// the route when it opens, which is what brings a thread's unread count down
// in this list too.
export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) return null
  const conversations = await getConversations()

  return (
    <MessagesSplit list={<MessageInbox initial={conversations} myId={user.id} />}>
      {children}
    </MessagesSplit>
  )
}
