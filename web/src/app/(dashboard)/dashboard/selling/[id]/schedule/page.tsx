import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { ScheduleForm } from '@/components/onboarding/ScheduleForm'
import { Alert, Button } from '@/components/ui'
import { inspectionCenters, submissions } from '@/lib/api'
import { getToken } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return { title: t('onboarding.schedule.metaTitle'), robots: { index: false, follow: false } }
}

// The statuses PATCH /submissions/:id/schedule accepts. Anything else can't be
// booked, so the page says why instead of offering a form that will fail.
const SCHEDULABLE = new Set(['under_review', 'approved', 'scheduled'])

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }

export default async function SchedulePage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const t = await getServerT()
  const token = await getToken()
  if (!token) return null

  const [mine, centers] = await Promise.all([
    submissions.mine(token).catch(() => []),
    inspectionCenters.active().catch(() => []),
  ])
  const submission = mine.find((s) => s.id === id)
  if (!submission) notFound()

  const name = [submission.year, submission.make, submission.model].filter(Boolean).join(' ')

  return (
    <>
      <PageHeader title={t('onboarding.schedule.title')} description={name} />

      {query.new ? (
        <Alert tone="success" title={t('onboarding.schedule.receivedTitle')} className="mb-6">
          {t('onboarding.schedule.receivedBody', { car: name })}
        </Alert>
      ) : null}

      {!SCHEDULABLE.has(submission.status) ? (
        <Alert tone="info" className="mb-6">
          {t('onboarding.schedule.notSchedulable')}
          <div className="mt-3">
            <Button href="/dashboard/selling" variant="outline" size="sm">{t('onboarding.schedule.backToSelling')}</Button>
          </div>
        </Alert>
      ) : (
        <>
          {submission.inspection_center && submission.inspection_date ? (
            <Alert tone="info" className="mb-6">
              {t('onboarding.schedule.current', {
                center: submission.inspection_center,
                date: submission.inspection_date,
                time: submission.inspection_time ?? '',
              })}
            </Alert>
          ) : null}
          <p className="mb-6 text-caption text-content-secondary">{t('onboarding.schedule.requiredNote')}</p>
          <div className="max-w-3xl">
            <ScheduleForm submissionId={submission.id} centers={centers} />
          </div>
        </>
      )}
    </>
  )
}
