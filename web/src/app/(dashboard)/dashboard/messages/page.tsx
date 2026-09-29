import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/ui'
import { getServerT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return { title: t('dashboard.meta.messages'), robots: { index: false, follow: false } }
}

// G1 in docs/WEB-PARITY-PLAN.md. The conversation list itself is drawn by
// messages/layout.tsx; this is the right-hand pane before a conversation is
// chosen (desktop only — on a phone the list fills the screen instead).
export default async function MessagesPage() {
  const t = await getServerT()

  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full ring-2 ring-content">
        <Icon name="mail" size={34} className="text-content" />
      </span>
      <h1 className="mt-5 text-title-sm font-extrabold text-content">{t('messages.pickTitle')}</h1>
      <p className="mt-1.5 max-w-xs text-caption text-content-secondary">{t('messages.pickBody')}</p>
      <Link
        href="/cars"
        className="mt-5 inline-flex h-10 items-center rounded-xl bg-brand px-4 text-caption font-bold text-brand-on"
      >
        {t('messages.browseCars')}
      </Link>
    </div>
  )
}
