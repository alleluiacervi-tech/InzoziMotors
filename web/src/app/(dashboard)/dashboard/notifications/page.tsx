import type { Metadata } from 'next'
import Link from 'next/link'
import { MarkAllReadButton } from '@/components/dashboard/MarkAllReadButton'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { getNotifications } from '@/components/dashboard/data'
import { notificationTarget } from '@/components/dashboard/meta'
import { Badge, Button, Card, EmptyState, Icon, type IconName } from '@/components/ui'
import { formatDate } from '@/lib/business'
import type { AppNotification } from '@/lib/types'
import { markReadAction } from './actions'

export const metadata: Metadata = {
  title: 'Notifications',
  robots: { index: false, follow: false },
}

// Everything the platform has told this account, newest first, grouped by day.
// Unread is signalled three ways — a badge, bolder type and a marker — because
// colour alone is not a signal.

const TYPE_ICON: Record<string, IconName> = {
  price_drop: 'trending-down',
  new_message: 'mail',
  message: 'mail',
  listing_update: 'car',
  handover: 'key',
  search_match: 'search',
}

/** Groups by calendar day in the server's zone, labelling the two most recent
 *  days in words. Anything older reads better as a date than as "6d ago". */
function groupByDay(list: AppNotification[]): { key: string; label: string; items: AppNotification[] }[] {
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  const groups = new Map<string, AppNotification[]>()
  for (const notification of list) {
    const date = new Date(notification.created_at)
    const key = Number.isNaN(date.getTime()) ? 'unknown' : date.toDateString()
    const bucket = groups.get(key)
    if (bucket) bucket.push(notification)
    else groups.set(key, [notification])
  }

  return Array.from(groups.entries()).map(([key, items]) => ({
    key,
    label:
      key === today ? 'Today' : key === yesterday ? 'Yesterday' : formatDate(items[0].created_at),
    items,
  }))
}

export default async function NotificationsPage() {
  const list = await getNotifications()
  const unread = list.filter((n) => !n.read).length
  const groups = groupByDay(list)

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Price drops on saved cars, listing updates, new messages, rental inquiry activity and saved-search matches. The app adds push alerts for the same events."
        action={unread > 0 ? <MarkAllReadButton unread={unread} /> : undefined}
      />

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon="bell"
            title="Nothing to read"
            description="Save a car or a search and this fills up: we tell you when a saved car drops in price, when a matching car passes inspection, and every time your request moves forward."
            action={<Button href="/cars">Browse certified cars</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`day-${group.key}`}>
              <h2
                id={`day-${group.key}`}
                className="mb-3 text-caption font-bold uppercase tracking-wide text-content-muted"
              >
                {group.label}
              </h2>

              <Card className="p-2">
                <ul>
                  {group.items.map((notification) => {
                    const target = notificationTarget(notification)
                    const icon = TYPE_ICON[notification.type] ?? 'info'
                    return (
                      <li key={notification.id} className="hairline">
                        <article className="flex gap-3 p-3">
                          <span
                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              notification.read
                                ? 'bg-surface-alt text-content-muted'
                                : 'bg-info-tint text-info'
                            }`}
                          >
                            <Icon name={icon} size={17} />
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3
                                className={`text-caption ${
                                  notification.read
                                    ? 'font-semibold text-content-secondary'
                                    : 'font-extrabold text-content'
                                }`}
                              >
                                {notification.title}
                              </h3>
                              {notification.read ? null : <Badge tone="info">New</Badge>}
                            </div>

                            <p className="mt-1 text-caption leading-relaxed text-content-secondary">
                              {notification.body}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                              <time
                                dateTime={notification.created_at}
                                className="text-micro text-content-muted"
                              >
                                {new Date(notification.created_at).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </time>

                              {target ? (
                                <Link
                                  href={target.href}
                                  className="inline-flex min-h-[44px] items-center gap-1 text-caption font-bold text-brand hover:underline"
                                >
                                  {target.label}
                                  <Icon name="chevron-right" size={13} />
                                </Link>
                              ) : null}

                              {notification.read ? null : (
                                <form action={markReadAction}>
                                  <input type="hidden" name="id" value={notification.id} />
                                  <button
                                    type="submit"
                                    className="inline-flex min-h-[44px] items-center text-caption font-bold text-content-muted underline-offset-2 hover:text-content hover:underline"
                                  >
                                    Mark read
                                    <span className="sr-only">: {notification.title}</span>
                                  </button>
                                </form>
                              )}
                            </div>
                          </div>
                        </article>
                      </li>
                    )
                  })}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
