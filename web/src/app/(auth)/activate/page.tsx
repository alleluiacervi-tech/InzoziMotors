import type { Metadata } from 'next'
import { Card } from '@/components/ui'
import { getServerT } from '@/lib/i18n/server'
import { ActivateForm } from './ActivateForm'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return { title: t('auth.activate.metaTitle') }
}

// One activation screen for every kind of admin-created account. The copy is
// deliberately account-agnostic: the person already knows what they were sent,
// and the alternative is a token-preflight round trip for a cosmetic heading.
export default async function ActivatePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams
  const t = await getServerT()
  return <main className="mx-auto w-full max-w-lg px-5 py-16">
    <Card className="p-7 sm:p-9">
      <p className="text-caption font-extrabold uppercase tracking-widest text-brand">{t('auth.activate.eyebrow')}</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-content">{t('auth.activate.title')}</h1>
      <p className="mb-7 mt-3 text-body leading-relaxed text-content-secondary">{t('auth.activate.intro')}</p>
      {token ? <ActivateForm token={token} /> : <p className="rounded-xl bg-danger-tint p-4 text-danger-strong">{t('auth.activate.incomplete')}</p>}
    </Card>
  </main>
}
