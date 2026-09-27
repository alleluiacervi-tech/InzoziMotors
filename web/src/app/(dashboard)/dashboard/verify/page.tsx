import type { Metadata } from 'next'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { IdVerificationForm } from '@/components/onboarding/IdVerificationForm'
import { VerificationStatus } from '@/components/onboarding/VerificationStatus'
import { Alert } from '@/components/ui'
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
        <VerificationStatus
          approved={approved}
          title={t(approved ? 'onboarding.verify.approvedTitle' : 'onboarding.verify.pendingTitle')}
          body={t(approved ? 'onboarding.verify.approvedBody' : 'onboarding.verify.pendingBody')}
          action={approved && user.role === 'seller' ? { href: '/sell/submit', label: t('onboarding.verify.submitCar') } : undefined}
        />
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
