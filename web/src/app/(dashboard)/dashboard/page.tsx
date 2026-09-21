import Link from 'next/link'
import { PageHeader, PanelHeading } from '@/components/dashboard/PageHeader'
import { StatTile } from '@/components/dashboard/StatTile'
import { getNotifications, settled } from '@/components/dashboard/data'
import { notificationTarget } from '@/components/dashboard/meta'
import { Alert, Badge, Button, Card, EmptyState, Icon } from '@/components/ui'
import { rentals, saved, submissions } from '@/lib/api'
import { SUBMISSION_STATUS_LABEL, formatRelative } from '@/lib/business'
import { getCurrentUser, getToken } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'

// ─────────────────────────────────────────────────────────────────────────────
// The dashboard's front page.
//
// It was written as four ~900-character JSX lines — every panel, every empty
// state and every conditional on one line each — which is why it had drifted
// away from the rest of the dashboard's layout language without anyone
// noticing. Nothing about WHAT it shows has changed: the same four counts from
// the same four API calls, the same direct-deal notice, the same three panels.
// What changed is that it is now legible, and laid out.
//
// DESIGN NOTES:
//
//   · The four calls stay in one Promise.allSettled. A dashboard that renders
//     three panels and a spinner is worse than one that renders three panels
//     and says the fourth failed — which is what the warning Alert does.
//
//   · The direct-deal notice is the ONE thing on this page that is a legal
//     position rather than data, so it keeps the brand tint and sits directly
//     under the counts, above the panels. Sawa Cars is not a party to any deal;
//     this page is the last surface before someone goes and arranges one.
//
//   · Panel rows are real list rows now — a 64px target, a chevron, a hover
//     surface — instead of a link wrapped around a paragraph. Every row on
//     this page navigates somewhere, and that was previously only discoverable
//     by pointing at it.
// ─────────────────────────────────────────────────────────────────────────────

/** How many of each list the overview shows before deferring to its own page. */
const PREVIEW = { notifications: 5, inquiries: 5, selling: 3 } as const

export default async function DashboardOverviewPage() {
  const t = await getServerT()
  const user = await getCurrentUser()
  const token = await getToken()
  if (!user || !token) return null

  const [savedResult, inquiryResult, notificationResult, submissionResult] =
    await Promise.allSettled([
      saved.cars(token),
      rentals.myInquiries(token),
      getNotifications(),
      submissions.mine(token),
    ])

  const savedCars = settled(savedResult, [])
  const inquiries = settled(inquiryResult, [])
  const notes = settled(notificationResult, [])
  const selling = settled(submissionResult, [])

  const failed = [savedResult, inquiryResult, submissionResult].some(
    (result) => result.status === 'rejected'
  )
  const unread = notes.filter((note) => !note.read).length
  const activeInquiries = inquiries.filter((item) =>
    ['new', 'contacted'].includes(item.status)
  ).length
  const firstName = user.name.trim().split(' ')[0]

  return (
    <>
      <PageHeader
        title={t('dashboard.overview.title', { name: firstName })}
        description={t('dashboard.overview.description')}
        action={
          <Button href="/cars" size="compact" variant="outline">
            <Icon name="search" size={16} aria-hidden="true" />
            {t('dashboard.overview.browseCars')}
          </Button>
        }
      />

      {failed ? (
        <Alert tone="warning" title={t('dashboard.common.partFailedTitle')} className="mb-6">
          {t('dashboard.common.partFailedBody')}
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          label={t('dashboard.overview.statSavedLabel')}
          value={savedCars.length}
          icon="heart"
          href="/dashboard/saved"
          hint={t('dashboard.overview.statSavedHint')}
        />
        <StatTile
          label={t('dashboard.overview.statRentalsLabel')}
          value={activeInquiries}
          icon="calendar"
          href="/dashboard/rentals"
          hint={t('dashboard.overview.statRentalsHint')}
        />
        {/* The only tile that can be WAITING on the user rather than simply
            counting something they own. */}
        <StatTile
          label={t('dashboard.overview.statUnreadLabel')}
          value={unread}
          icon="bell"
          href="/dashboard/notifications"
          hint={t('dashboard.overview.statUnreadHint')}
          attention
        />
        <StatTile
          label={t('dashboard.overview.statSellingLabel')}
          value={selling.length}
          icon="car"
          href="/dashboard/selling"
          hint={t('dashboard.overview.statSellingHint')}
        />
      </div>

      {/* The invariant, on the surface where it matters most. */}
      <Card className="mt-8 border-brand/20 bg-brand-tint p-5">
        <div className="flex gap-3.5">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand"
          >
            <Icon name="info" size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="text-title-sm font-extrabold text-content">
              {t('dashboard.overview.dealsTitle')}
            </h2>
            <p className="mt-1.5 max-w-prose text-caption leading-relaxed text-pretty text-content-secondary">
              {t('dashboard.overview.dealsBody')}
            </p>
            <Link
              href="/how-it-works"
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-caption font-bold text-brand hover:underline"
            >
              {t('dashboard.overview.dealsLink')}
              <Icon name="arrow-right" size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Card>

      <div className="mt-8 grid items-stretch gap-6 lg:grid-cols-2">
        <section aria-labelledby="updates" className="flex flex-col">
          <PanelHeading
            id="updates"
            title={t('dashboard.overview.updatesTitle')}
            action={
              notes.length > PREVIEW.notifications ? (
                <Link
                  href="/dashboard/notifications"
                  className="inline-flex min-h-11 items-center text-caption font-bold text-brand hover:underline"
                >
                  {t('dashboard.overview.viewAll')}
                </Link>
              ) : null
            }
          />
          <Card className="flex flex-1 flex-col overflow-hidden p-2">
            {notes.length === 0 ? (
              <EmptyState
                icon="bell"
                title={t('dashboard.overview.updatesEmptyTitle')}
                description={t('dashboard.overview.updatesEmptyBody')}
                className="flex-1 justify-center py-10"
              />
            ) : (
              <ul>
                {notes.slice(0, PREVIEW.notifications).map((note) => {
                  const target = notificationTarget(note)
                  return (
                    <li key={note.id} className="hairline">
                      <div className="flex items-start gap-3 rounded-xl p-3">
                        {/* Unread is a dot AND a badge AND a bolder title —
                            never colour on its own. */}
                        <span
                          aria-hidden="true"
                          className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                            note.read ? 'bg-transparent' : 'bg-brand'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-caption font-bold text-content">{note.title}</h3>
                            {!note.read ? (
                              <Badge tone="info">{t('dashboard.common.new')}</Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 line-clamp-2 text-caption leading-relaxed text-content-secondary">
                            {note.body}
                          </p>
                          <time
                            dateTime={note.created_at}
                            className="mt-1.5 block text-micro text-content-muted"
                          >
                            {formatRelative(note.created_at)}
                          </time>
                        </div>
                        {target ? (
                          <Link
                            href={target.href}
                            className="inline-flex min-h-11 shrink-0 items-center text-caption font-bold text-brand hover:underline"
                          >
                            {t(target.labelKey)}
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </section>

        <section aria-labelledby="inquiries" className="flex flex-col">
          <PanelHeading
            id="inquiries"
            title={t('dashboard.overview.inquiriesTitle')}
            action={
              inquiries.length > PREVIEW.inquiries ? (
                <Link
                  href="/dashboard/rentals"
                  className="inline-flex min-h-11 items-center text-caption font-bold text-brand hover:underline"
                >
                  {t('dashboard.overview.viewAll')}
                </Link>
              ) : null
            }
          />
          <Card className="flex flex-1 flex-col overflow-hidden p-2">
            {inquiries.length === 0 ? (
              <EmptyState
                icon="calendar"
                title={t('dashboard.overview.inquiriesEmptyTitle')}
                description={t('dashboard.overview.inquiriesEmptyBody')}
                className="flex-1 justify-center py-10"
                action={
                  <Button href="/rentals" size="sm" variant="outline">
                    {t('dashboard.overview.browseRentals')}
                  </Button>
                }
              />
            ) : (
              <ul>
                {inquiries.slice(0, PREVIEW.inquiries).map((item) => (
                  <li key={item.id} className="hairline">
                    <Link
                      href="/dashboard/rentals"
                      className="group flex min-h-16 items-center justify-between gap-3 rounded-xl p-3 transition-colors hover:bg-surface-alt"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-caption font-bold text-content">
                          {item.car_title || item.inquiry_ref}
                        </span>
                        <span className="mt-0.5 block truncate text-micro text-content-muted">
                          {item.inquiry_ref} · {t(`dashboard.rentals.status.${item.status}`)}
                        </span>
                      </span>
                      <Icon
                        name="chevron-right"
                        size={16}
                        aria-hidden="true"
                        className="shrink-0 text-content-muted transition-transform duration-300 ease-brand group-hover:translate-x-0.5 motion-reduce:transition-none"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>

      {selling.length ? (
        <section aria-labelledby="selling" className="mt-8">
          <PanelHeading
            id="selling"
            title={t('dashboard.overview.sellingTitle')}
            action={
              <Link
                href="/dashboard/selling"
                className="inline-flex min-h-11 items-center text-caption font-bold text-brand hover:underline"
              >
                {t('dashboard.overview.fullPipeline')}
              </Link>
            }
          />
          <Card className="overflow-hidden p-2">
            <ul>
              {selling.slice(0, PREVIEW.selling).map((item) => (
                <li key={item.id} className="hairline">
                  <Link
                    href="/dashboard/selling"
                    className="group flex min-h-16 items-center justify-between gap-3 rounded-xl p-3 transition-colors hover:bg-surface-alt"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-caption font-bold text-content">
                        {item.car_title ??
                          [item.year, item.make, item.model].filter(Boolean).join(' ')}
                      </span>
                      <span className="mt-0.5 block truncate text-micro text-content-muted">
                        {SUBMISSION_STATUS_LABEL[item.status] ?? item.status}
                      </span>
                    </span>
                    <Icon
                      name="chevron-right"
                      size={16}
                      aria-hidden="true"
                      className="shrink-0 text-content-muted transition-transform duration-300 ease-brand group-hover:translate-x-0.5 motion-reduce:transition-none"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
    </>
  )
}
