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
  description: 'Sign in to Inzozi Motors to see your saved cars, saved searches and purchase requests.',
  robots: { index: false, follow: true },
}

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const next = safePath(first(params.next))

  // Already signed in: send them where they were headed instead of showing a
  // form that would just log them into the same session again.
  const user = await getCurrentUser()
  if (user) redirect(next)

  return (
    <>
      <AuthHeading title="Welcome back">
        Sign in to pick up your saved cars, your searches and any request you have open.
      </AuthHeading>

      <SignInForm next={next} defaultEmail={first(params.email)} />

      <AuthSwitch prompt="New to Inzozi Motors?" href="/signup" label="Create an account" />

      <OneAccountNote className="mt-8 border-t border-line-soft pt-6" />
    </>
  )
}
