import { Card } from '@/components/ui'
import { ActivateForm } from './ActivateForm'

export const metadata = { title: 'Activate showroom account' }

export default async function ActivateShowroomPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams
  return <main className="mx-auto w-full max-w-lg px-5 py-16">
    <Card className="p-7 sm:p-9">
      <p className="text-caption font-extrabold uppercase tracking-widest text-brand">Verified showroom</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-content">Create your private password</h1>
      <p className="mb-7 mt-3 text-body leading-relaxed text-content-secondary">Sawa Cars created this commercial seller account. This one-use link expires after 48 hours; your password is never visible to an administrator.</p>
      {token ? <ActivateForm token={token} /> : <p className="rounded-xl bg-danger-tint p-4 text-danger-strong">This activation link is incomplete. Ask Sawa Cars to send a new invitation.</p>}
    </Card>
  </main>
}
