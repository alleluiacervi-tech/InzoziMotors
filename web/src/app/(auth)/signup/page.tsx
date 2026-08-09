import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { AuthHeading, AuthSwitch, OneAccountNote } from '../_components/parts'
import { first, safePath, type SearchParams } from '../_lib/params'
import { SignUpForm } from './SignUpForm'

// Unlike /signin this is a page people search for, so it stays indexable.
export const metadata: Metadata = {
  title: 'Create an account',
  description:
    'Create a free Sawa Cars account to save certified cars, set search alerts and request a car. Buyers pay nothing, ever.',
  alternates: { canonical: '/signup' },
}

export default async function SignUpPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const next = safePath(first(params.next))

  const user = await getCurrentUser()
  if (user) redirect(next)

  return (
    <>
      <AuthHeading title="Create your account">
        Saving cars, setting alerts and requesting a car all need an account. It is free, and
        buyers never pay Sawa Cars anything.
      </AuthHeading>

      <SignUpForm next={next} />

      <AuthSwitch prompt="Already have an account?" href="/signin" label="Sign in" />

      <OneAccountNote className="mt-8 border-t border-line-soft pt-6" />
    </>
  )
}
