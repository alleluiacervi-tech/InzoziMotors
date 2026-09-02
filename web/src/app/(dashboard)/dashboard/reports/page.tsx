import type { Metadata } from 'next'
import { getMyReports } from '@/components/dashboard/data'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Badge, Button, Card, EmptyState, Icon } from '@/components/ui'
import { formatDate, formatMoneyExact } from '@/lib/business'
import type { ReportEntitlement } from '@/lib/types'
import { getServerT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('dashboard.meta.reports'),
    robots: { index: false, follow: false },
  }
}

// Every inspection report this account may read — commissioned, bought as a
// second reader's copy, or shared by a seller. An entitlement is worthless if
// its holder cannot find what it entitles them to: before this page, the only
// way to reach a report was a link somebody had sent, which worked for the one
// customer who paid for the inspection and nobody else who later gained access.

const SOURCE_KEY: Record<ReportEntitlement['source'], string> = {
  purchased: 'dashboard.reports.sourcePurchased',
  seller_copy: 'dashboard.reports.sourceSellerCopy',
  admin_grant: 'dashboard.reports.sourceAdminGrant',
  paid_customer: 'dashboard.reports.sourcePaidCustomer',
}

export default async function ReportsPage() {
  const t = await getServerT()
  const reports = await getMyReports()

  return (
    <>
      <PageHeader title={t('dashboard.reports.title')} description={t('dashboard.reports.description')} />

      {reports.length === 0 ? (
        <Card>
          <EmptyState
            icon="document"
            title={t('dashboard.reports.emptyTitle')}
            description={t('dashboard.reports.emptyBody')}
            action={<Button href="/contact">{t('dashboard.reports.bookInspection')}</Button>}
          />
        </Card>
      ) : (
        <Card className="p-2">
          <ul>
            {reports.map((report) => (
              <li key={report.entitlement_id} className="hairline">
                <article className="flex flex-wrap items-center gap-3 p-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-tint text-success">
                    <Icon name="shield-check" size={18} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-caption font-extrabold text-content">
                        {report.vehicle || t('dashboard.reports.scoreLabel', { score: report.score ?? '—' })}
                      </h3>
                      <Badge tone="info">{t(SOURCE_KEY[report.source] ?? 'dashboard.reports.sourcePurchased')}</Badge>
                    </div>

                    <p className="mt-1 text-caption text-content-secondary">
                      {report.score != null ? t('dashboard.reports.scoreLabel', { score: report.score }) : null}
                      {report.score != null ? ' · ' : ''}
                      {t('dashboard.reports.addedOn', { date: formatDate(report.granted_at) })}
                    </p>

                    <p className="mt-1 text-micro text-content-muted">
                      {report.paid_rwf
                        ? t('dashboard.reports.paidLabel', { amount: formatMoneyExact(report.paid_rwf) })
                        : t('dashboard.reports.freeLabel')}
                    </p>
                  </div>

                  <a
                    // Not report.file_url — that's the backend's own path,
                    // which only accepts a Bearer header a plain link can't
                    // send. This app's own route handler attaches it server-
                    // side from the httpOnly session cookie instead.
                    href={`/api/documents/${report.inspection_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-caption font-bold text-content hover:bg-surface-alt"
                  >
                    <Icon name="external" size={14} />
                    {t('dashboard.reports.viewReport')}
                  </a>
                </article>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}
