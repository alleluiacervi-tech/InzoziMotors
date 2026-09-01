import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { buildMetadata } from '@/lib/metadata'
import { getCurrentUser } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'
import { CONTACT } from '@/lib/site'
import { Button, Container, Section } from '@/components/ui'

// ─────────────────────────────────────────────────────────────────────────────
// The public account-deletion page.
//
// Google Play's Data Safety form asks for a URL where a user can request
// deletion WITHOUT installing the app and without being signed in — a reviewer
// opens it in a logged-out browser, so this page must render and explain the
// process to an anonymous visitor. Apple's requirement is different (deletion
// must be initiable inside the app) and is met by Settings → Danger zone in the
// Expo app plus /dashboard/profile here.
//
// A signed-in visitor has no reason to read the explanation — send them
// straight to the form that can actually do it.
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return buildMetadata({
    title: t('auth.del.metaTitle'),
    description: t('auth.del.metaDescription'),
    path: '/account/delete',
  })
}

export default async function DeleteAccountPage() {
  const user = await getCurrentUser()
  if (user) redirect('/dashboard/profile#delete-account')

  const t = await getServerT()

  const REMOVED = [
    t('auth.del.removed1'),
    t('auth.del.removed2'),
    t('auth.del.removed3'),
    t('auth.del.removed4'),
    t('auth.del.removed5'),
    t('auth.del.removed6'),
  ]

  const KEPT = [t('auth.del.kept1'), t('auth.del.kept2'), t('auth.del.kept3')]

  return (
    <Section>
      {/* The measure lives on an inner wrapper: max-w-* on Container itself
          loses to Container's own max-w-content at equal specificity, which
          used to stretch this copy across the full 1400px frame. */}
      <Container>
        <div className="mx-auto max-w-2xl">
        <h1 className="text-display font-extrabold tracking-tight text-content">
          {t('auth.del.title')}
        </h1>
        <p className="mt-4 text-body leading-relaxed text-content-secondary">
          {t('auth.del.intro1')}
        </p>
        <p className="mt-3 text-body leading-relaxed text-content-secondary">
          {t('auth.del.intro2')}
        </p>

        <div className="mt-10 rounded-2xl border border-line-soft bg-surface p-6">
          <h2 className="text-title-sm font-extrabold text-content">{t('auth.del.howTitle')}</h2>
          <ol className="mt-4 space-y-3 text-caption leading-relaxed text-content-secondary">
            <li>
              <strong className="text-content">{t('auth.del.webLabel')}</strong> {t('auth.del.webRest')}{' '}
              <Link href="/dashboard/profile" className="font-semibold text-content underline">
                {t('auth.del.profileLink')}
              </Link>
              .
            </li>
            <li>
              <strong className="text-content">{t('auth.del.appLabel')}</strong> {t('auth.del.appRest')}{' '}
              <em>{t('auth.del.appAction')}</em>.
            </li>
          </ol>
          <p className="mt-4 text-caption leading-relaxed text-content-secondary">
            {t('auth.del.howNote')}
          </p>
          <Button href="/signin?next=/dashboard/profile" variant="dark" size="md" className="mt-6">
            {t('auth.del.signInButton')}
          </Button>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-line-soft bg-surface p-6">
            <h2 className="text-title-sm font-extrabold text-content">{t('auth.del.removedTitle')}</h2>
            <ul className="mt-3 space-y-2 text-caption leading-relaxed text-content-secondary">
              {REMOVED.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="text-content-muted">
                    ·
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-line-soft bg-surface p-6">
            <h2 className="text-title-sm font-extrabold text-content">{t('auth.del.keptTitle')}</h2>
            <ul className="mt-3 space-y-2 text-caption leading-relaxed text-content-secondary">
              {KEPT.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="text-content-muted">
                    ·
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-micro leading-relaxed text-content-muted">
              {t('auth.del.keptNote')}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-line-soft bg-surface-alt p-6">
          <h2 className="text-title-sm font-extrabold text-content">{t('auth.del.directTitle')}</h2>
          <p className="mt-2 text-caption leading-relaxed text-content-secondary">
            {t('auth.del.directBody')}
          </p>
        </div>

        <p className="mt-8 text-caption leading-relaxed text-content-secondary">
          {t('auth.del.cannotPrefix')}{' '}
          <a href={`mailto:${CONTACT.supportEmail}`} className="font-semibold text-content underline">
            {CONTACT.supportEmail}
          </a>{' '}
          {t('auth.del.cannotMid')}{' '}
          <Link href="/legal/privacy" className="font-semibold text-content underline">
            {t('auth.del.privacyLink')}
          </Link>{' '}
          {t('auth.del.cannotEnd')}
        </p>
        </div>
      </Container>
    </Section>
  )
}
