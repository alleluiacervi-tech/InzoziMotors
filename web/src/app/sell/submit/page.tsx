import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SubmitCarForm } from '@/components/onboarding/SubmitCarForm'
import { Alert, Button, Card, Container } from '@/components/ui'
import { vehicleMakes } from '@/lib/api'
import { getCurrentUser } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return { title: t('onboarding.submit.metaTitle'), robots: { index: false, follow: false } }
}

// G5 in docs/WEB-PARITY-PLAN.md. Same gate as POST /submissions: signed in,
// and a seller account. A buyer account can't become a seller one (no such
// endpoint), so this says so instead of letting the form fail at the end.
export default async function SubmitCarPage() {
  const t = await getServerT()
  const user = await getCurrentUser()
  if (!user) redirect('/signin?next=/sell/submit')

  const makes = await vehicleMakes.list().catch(() => [])

  return (
    <Container className="max-w-3xl py-8 sm:py-12">
      <h1 className="text-title font-extrabold text-content">{t('onboarding.submit.title')}</h1>
      <p className="mt-2 text-body leading-relaxed text-content-secondary">{t('onboarding.submit.description')}</p>

      <div className="mt-8">
        {user.role !== 'seller' ? (
          <Card className="p-6">
            <h2 className="text-title-sm font-extrabold text-content">{t('onboarding.submit.notSellerTitle')}</h2>
            <p className="mt-2 text-caption leading-relaxed text-content-secondary">{t('onboarding.submit.notSellerBody')}</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button href="/signup">{t('onboarding.submit.createSeller')}</Button>
              <Button href="/sell" variant="outline">{t('onboarding.submit.howItWorks')}</Button>
            </div>
          </Card>
        ) : (
          <>
            {user.id_verified !== 'approved' ? (
              <Alert tone="info" className="mb-6">{t('onboarding.submit.verifyLater')}</Alert>
            ) : null}
            <SubmitCarForm makes={makes.map((m) => m.name)} />
          </>
        )}
      </div>
    </Container>
  )
}
