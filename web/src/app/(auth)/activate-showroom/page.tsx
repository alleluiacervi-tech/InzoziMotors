import { redirect } from 'next/navigation'

// Invite emails sent before the generalised /activate route point here, and a
// 48-hour link is still live in someone's inbox. Forward, don't 404.
export default async function ActivateShowroomPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams
  redirect(token ? `/activate?token=${encodeURIComponent(token)}` : '/activate')
}
