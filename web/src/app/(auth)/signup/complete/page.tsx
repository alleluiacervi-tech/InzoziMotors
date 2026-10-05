import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'
import { AuthHeading } from '../../_components/parts'
import { first, safePath, type SearchParams } from '../../_lib/params'
import { CompleteProfileForm } from './CompleteProfileForm'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return { title: t('auth.complete.metaTitle'), robots: { index: false, follow: false } }
}

// Where a first Google or Apple sign-in lands. Anyone else is sent on: signed
// out to sign in, already complete to where they were going.
export default async function CompleteProfilePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const next = safePath(first(params.next))
  const user = await getCurrentUser()
  if (!user) redirect(`/signin?next=${encodeURIComponent(next)}`)
  if (user.phone) redirect(next)

  const t = await getServerT()
  const defaultRole = first(params.role) === 'seller' || user.role === 'seller' ? 'seller' : 'buyer'

  return (
    <>
      <AuthHeading title={t('auth.complete.title')}>{t('auth.complete.subtitle')}</AuthHeading>
      <p className="-mt-4 mb-7 text-caption text-content-muted">{t('auth.complete.signedInAs', { email: user.email })}</p>
      <CompleteProfileForm next={next} defaultRole={defaultRole} />
    </>
  )
}
