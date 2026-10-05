import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'
import { AuthHeading, AuthSwitch, OneAccountNote } from '../_components/parts'
import { first, safePath, type SearchParams } from '../_lib/params'
import { SignInForm } from './SignInForm'
import { Alert } from '@/components/ui'
import { OrDivider, SocialButtons } from '@/components/auth/SocialButtons'
import { enabledProviders } from '@/lib/oauth'

const OAUTH_ERRORS = new Set([
  'cancelled', 'expired', 'unavailable', 'email_in_use', 'email_required', 'staff',
  'unavailable_account', 'purged', 'failed',
])

// A utility page with nothing to rank for, and one that search engines would
// otherwise crawl with a hundred `?next=` variants.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('auth.signin.metaTitle'),
    description: t('auth.signin.metaDescription'),
    robots: { index: false, follow: true },
  }
}

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const next = safePath(first(params.next))
  const t = await getServerT()

  // Already signed in: send them where they were headed instead of showing a
  // form that would just log them into the same session again.
  const user = await getCurrentUser()
  if (user) redirect(next)

  // Set by /session/expired after it clears a cookie the backend rejected.
  // Without this the user is dumped on a sign-in form with no idea why they
  // were signed out mid-session.
  const expired = first(params.expired) === '1'
  const providers = enabledProviders()
  const oauthError = first(params.oauth_error)
  const oauthMessage = OAUTH_ERRORS.has(oauthError) ? t(`auth.social.errors.${oauthError}`) : null
  // Set by the Google/Apple callback when the account behind that sign-in is
  // closed but still inside its thirty days: the way back is the same button.
  const closedWith = first(params.closed)
  const closedProvider = closedWith === 'google' || closedWith === 'apple' ? closedWith : null

  return (
    <>
      <AuthHeading title={t('auth.signin.title')}>
        {t('auth.signin.subtitle')}
      </AuthHeading>

      {expired && (
        <p
          role="status"
          className="mb-6 rounded-xl border border-line bg-surface-alt px-4 py-3 text-caption text-content-secondary"
        >
          {t('auth.signin.expired')}
        </p>
      )}

      {closedProvider ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-line-soft bg-surface-alt p-5">
            <h2 className="text-title-sm font-extrabold text-content">{t('auth.signin.closed.title')}</h2>
            <p className="mt-2 text-caption leading-relaxed text-content-secondary">{t('auth.signin.closed.body')}</p>
            {first(params.until) ? (
              <p className="mt-2 text-caption font-bold text-content">
                {t('auth.signin.closed.until', { date: first(params.until) })}
              </p>
            ) : null}
          </div>
          <SocialButtons providers={providers} next={next} reopen only={closedProvider} />
        </div>
      ) : (
        <>
          {oauthMessage ? (
            <div className="mb-6">
              <Alert tone={oauthError === 'cancelled' ? 'info' : 'danger'}>{oauthMessage}</Alert>
            </div>
          ) : null}
          {providers.google || providers.apple ? (
            <>
              <SocialButtons providers={providers} next={next} />
              <OrDivider label={t('auth.social.orEmail')} />
            </>
          ) : null}
          <SignInForm next={next} defaultEmail={first(params.email)} />
        </>
      )}

      {/* Carry `next` across the switch.
          The contact panel sends people here with ?next=/cars/<id>, and the form
          honoured it — but this link did not, so the ONE visitor it dropped was
          the first-timer who taps "Create an account": exactly the person
          organic search just sent, landing on an empty dashboard instead of
          back on the car they came for. */}
      <AuthSwitch
        prompt={t('auth.signin.switchPrompt')}
        href={next && next !== '/dashboard' ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}
        label={t('auth.signin.switchLabel')}
      />

      <OneAccountNote className="mt-8 border-t border-line-soft pt-6" />
    </>
  )
}
