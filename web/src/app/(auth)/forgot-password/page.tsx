import type { Metadata } from 'next'
import { getServerT } from '@/lib/i18n/server'
import { AuthHeading, AuthSwitch } from '../_components/parts'
import { first, type SearchParams } from '../_lib/params'
import { ResetForm } from './ResetForm'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('auth.forgot.metaTitle'),
    description: t('auth.forgot.metaDescription'),
    robots: { index: false, follow: true },
  }
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  // Carried over from the sign-in form so the address is not typed twice.
  const params = await searchParams
  const t = await getServerT()

  return (
    <>
      <AuthHeading title={t('auth.forgot.title')}>
        {t('auth.forgot.subtitle')}
      </AuthHeading>

      <ResetForm defaultEmail={first(params.email)} />

      <AuthSwitch prompt={t('auth.forgot.switchPrompt')} href="/signup" label={t('auth.forgot.switchLabel')} />
    </>
  )
}
