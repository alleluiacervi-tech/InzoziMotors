import type { Metadata } from 'next'
import { AuthHeading, AuthSwitch } from '../_components/parts'
import { first, type SearchParams } from '../_lib/params'
import { ResetForm } from './ResetForm'

export const metadata: Metadata = {
  title: 'Reset your password',
  description: 'Reset the password on your Sawa account with a one-time code.',
  robots: { index: false, follow: true },
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  // Carried over from the sign-in form so the address is not typed twice.
  const params = await searchParams

  return (
    <>
      <AuthHeading title="Reset your password">
        Two steps: we send a code to your email, then you choose a new password.
      </AuthHeading>

      <ResetForm defaultEmail={first(params.email)} />

      <AuthSwitch prompt="No account yet?" href="/signup" label="Create one" />
    </>
  )
}
