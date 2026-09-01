import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'
import { AuthHeading, AuthSwitch, OneAccountNote } from '../_components/parts'
import { first, safePath, type SearchParams } from '../_lib/params'
import { SignUpForm } from './SignUpForm'

// Unlike /signin this is a page people search for, so it stays indexable.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('auth.signup.metaTitle'),
    description: t('auth.signup.metaDescription'),
    alternates: { canonical: '/signup' },
  }
}

export default async function SignUpPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const next = safePath(first(params.next))
  const t = await getServerT()

  const user = await getCurrentUser()
  if (user) redirect(next)

  return (
    <>
      <AuthHeading title={t('auth.signup.title')}>
        {t('auth.signup.subtitle')}
      </AuthHeading>

      <SignUpForm next={next} />

      {/* Carry `next` across the switch.
          The contact panel sends people here with ?next=/cars/<id>, and the form
          honoured it — but this link did not, so the ONE visitor it dropped was
          the first-timer who taps "Create an account": exactly the person
          organic search just sent, landing on an empty dashboard instead of
          back on the car they came for. */}
      <AuthSwitch
        prompt={t('auth.signup.switchPrompt')}
        href={next && next !== '/dashboard' ? `/signin?next=${encodeURIComponent(next)}` : '/signin'}
        label={t('auth.signup.switchLabel')}
      />

      <OneAccountNote className="mt-8 border-t border-line-soft pt-6" />
    </>
  )
}
