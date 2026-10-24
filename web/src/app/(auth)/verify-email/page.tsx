import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'
import { AuthHeading } from '../_components/parts'
import { first, safePath, type SearchParams } from '../_lib/params'
import { VerifyEmailForm } from './VerifyEmailForm'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return { title: t('auth.verify.metaTitle'), robots: { index: false, follow: false } }
}

// Where an account held as a suspected bot (backend lib/signup-risk.js) lands
// after signing up or in. It can do nothing else until the code is confirmed;
// a person does this in under a minute, a script that typed somebody else's
// address never gets the code.
export default async function VerifyEmailPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const next = safePath(first(params.next))
  const user = await getCurrentUser()
  if (!user) redirect(`/signin?next=${encodeURIComponent('/verify-email')}`)
  if (!user.access_hold) redirect(next)
  const t = await getServerT()

  return (
    <>
      <AuthHeading title={t('auth.verify.title')}>{t('auth.verify.subtitle')}</AuthHeading>
      <VerifyEmailForm email={user.email} next={next} />
    </>
  )
}
