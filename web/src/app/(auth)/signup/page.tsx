import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'
import { AuthHeading, AuthSwitch, OneAccountNote } from '../_components/parts'
import { first, safePath, type SearchParams } from '../_lib/params'
import { SignUpForm } from './SignUpForm'
import { OrDivider, SocialButtons } from '@/components/auth/SocialButtons'
import { enabledProviders } from '@/lib/oauth'

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
  // Someone who came here to sell (the valuation's "Submit this car", the
  // sell page, /sell/submit's sign-in bounce) starts with "I want to sell"
  // chosen, so they do not create a buyer account they then cannot use.
  const defaultRole =
    first(params.role) === 'seller' || next.startsWith('/sell') || next.startsWith('/dashboard/verify')
      ? 'seller'
      : 'buyer'
  const t = await getServerT()

  const user = await getCurrentUser()
  if (user) redirect(next)
  const providers = enabledProviders()

  return (
    <>
      <AuthHeading title={t('auth.signup.title')}>
        {t('auth.signup.subtitle')}
      </AuthHeading>

      {/* The role travels with the provider sign-up and is confirmed on the
          next step, so someone who came here to sell starts as a seller. */}
      {providers.google || providers.apple ? (
        <>
          <SocialButtons providers={providers} next={next} role={defaultRole} />
          <OrDivider label={t('auth.social.orEmail')} />
        </>
      ) : null}

      <SignUpForm next={next} defaultRole={defaultRole} />

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
