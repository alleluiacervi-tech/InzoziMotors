import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { AuthHeading, AuthSwitch, OneAccountNote } from '../_components/parts'
import { first, safePath, type SearchParams } from '../_lib/params'
import { SignInForm } from './SignInForm'

// A utility page with nothing to rank for, and one that search engines would
// otherwise crawl with a hundred `?next=` variants.
export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to Sawa Cars to see your saved cars, saved searches, vehicle enquiries and submissions.',
  robots: { index: false, follow: true },
}

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const next = safePath(first(params.next))

  // Already signed in: send them where they were headed instead of showing a
  // form that would just log them into the same session again.
  const user = await getCurrentUser()
  if (user) redirect(next)

  // Set by /session/expired after it clears a cookie the backend rejected.
  // Without this the user is dumped on a sign-in form with no idea why they
  // were signed out mid-session.
  const expired = first(params.expired) === '1'

  return (
    <>
      <AuthHeading title="Welcome back">
        Sign in to pick up your saved cars, your searches and any request you have open.
      </AuthHeading>

      {expired && (
        <p
          role="status"
          className="mb-6 rounded-xl border border-line bg-surface-alt px-4 py-3 text-caption text-content-secondary"
        >
          Your session expired, so we signed you out. Sign in again to pick up where you left off.
        </p>
      )}

      <SignInForm next={next} defaultEmail={first(params.email)} />

      <AuthSwitch prompt="New to Sawa Cars?" href="/signup" label="Create an account" />

      <OneAccountNote className="mt-8 border-t border-line-soft pt-6" />
    </>
  )
}
