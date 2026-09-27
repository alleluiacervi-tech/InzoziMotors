import type { Metadata } from 'next'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { IdVerificationForm } from '@/components/onboarding/IdVerificationForm'
import { Alert, Button, Card, Icon } from '@/components/ui'
import { getCurrentUser } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return { title: t('onboarding.verify.metaTitle'), robots: { index: false, follow: false } }
}

// G4 in docs/WEB-PARITY-PLAN.md. States follow the app's IDVerificationScreen:
// pending and approved get a status card; none and rejected get the form. The
// backend stores no rejection reason (F1 in §10.1), so a rejection gets the
// same general advice the app gives.
export default async function VerifyPage() {
  const t = await getServerT()
  const user = await getCurrentUser()
  if (!user) return null

  if (user.id_verified === 'pending' || user.id_verified === 'approved') {
    const approved = user.id_verified === 'approved'
    return (
      <>
        <PageHeader title={t('onboarding.verify.title')} />
        <Card className="p-8 text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
              approved ? 'bg-success-tint text-success-text' : 'bg-surface-alt text-content-muted'
            }`}
          >
            <Icon name={approved ? 'shield-check' : 'clock'} size={30} />
          </div>
          <h2 className="mt-5 text-title-sm font-extrabold text-content">
            {t(approved ? 'onboarding.verify.approvedTitle' : 'onboarding.verify.pendingTitle')}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-caption leading-relaxed text-content-secondary">
            {t(approved ? 'onboarding.verify.approvedBody' : 'onboarding.verify.pendingBody')}
          </p>
          {approved && user.role === 'seller' ? (
            <div className="mt-6">
              <Button href="/sell/submit">{t('onboarding.verify.submitCar')}</Button>
            </div>
          ) : null}
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader title={t('onboarding.verify.title')} description={t('onboarding.verify.description')} />
      {user.id_verified === 'rejected' ? (
        <Alert tone="warning" title={t('onboarding.verify.rejectedTitle')} className="mb-6">
          {t('onboarding.verify.rejectedBody')}
        </Alert>
      ) : null}
      <div className="max-w-2xl">
        <IdVerificationForm />
      </div>
    </>
  )
}
