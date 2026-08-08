import Link from 'next/link'
import { redirect } from 'next/navigation'
import { buildMetadata } from '@/lib/metadata'
import { getCurrentUser } from '@/lib/session'
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

export const metadata = buildMetadata({
  title: 'Delete your account',
  description:
    'How to permanently delete your Sawa Cars account and what happens to your data, including identity documents and records of completed sales.',
  path: '/account/delete',
})

const REMOVED = [
  'Your name, email address and phone number',
  'Your password',
  'Photographs of your national ID and your selfie',
  'Saved cars, saved searches and their alerts',
  'Notifications and registered devices',
  'Any listing of yours still on the marketplace is taken down',
]

const KEPT = [
  'Records of cars that have already changed hands through Sawa Cars, which we are required to keep',
  'Reviews written about a completed sale — these belong to the person who wrote them',
  'Fee records for sales that already completed',
]

export default async function DeleteAccountPage() {
  const user = await getCurrentUser()
  if (user) redirect('/dashboard/profile#delete-account')

  return (
    <Section>
      {/* The measure lives on an inner wrapper: max-w-* on Container itself
          loses to Container's own max-w-content at equal specificity, which
          used to stretch this copy across the full 1400px frame. */}
      <Container>
        <div className="mx-auto max-w-2xl">
        <h1 className="text-display font-extrabold tracking-tight text-content">
          Delete your Sawa Cars account
        </h1>
        <p className="mt-4 text-body leading-relaxed text-content-secondary">
          You can delete your account at any time, from the app or from this website. Deletion is
          permanent — we cannot restore an account once it is gone.
        </p>

        <div className="mt-10 rounded-2xl border border-line-soft bg-surface p-6">
          <h2 className="text-title-sm font-extrabold text-content">How to delete it</h2>
          <ol className="mt-4 space-y-3 text-caption leading-relaxed text-content-secondary">
            <li>
              <strong className="text-content">On this website:</strong> sign in, then go to{' '}
              <Link href="/dashboard/profile" className="font-semibold text-content underline">
                Profile → Delete account
              </Link>
              .
            </li>
            <li>
              <strong className="text-content">In the Sawa Cars app:</strong> open Settings, scroll to
              &ldquo;Danger zone&rdquo; and tap <em>Delete my account</em>.
            </li>
          </ol>
          <p className="mt-4 text-caption leading-relaxed text-content-secondary">
            Either way you will be asked for your password to confirm it is really you.
          </p>
          <Button href="/signin?next=/dashboard/profile" variant="dark" size="md" className="mt-6">
            Sign in to delete my account
          </Button>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-line-soft bg-surface p-6">
            <h2 className="text-title-sm font-extrabold text-content">What is deleted</h2>
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
            <h2 className="text-title-sm font-extrabold text-content">What is kept, and why</h2>
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
              These records no longer carry your name or contact details.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-line-soft bg-surface-alt p-6">
          <h2 className="text-title-sm font-extrabold text-content">If you have a sale in progress</h2>
          <p className="mt-2 text-caption leading-relaxed text-content-secondary">
            An account with a handover still being arranged cannot be deleted — someone is expecting
            to meet you at a center. Cancel or complete it first, then deletion goes through.
          </p>
        </div>

        <p className="mt-8 text-caption leading-relaxed text-content-secondary">
          Cannot sign in? Email{' '}
          <a href={`mailto:${CONTACT.supportEmail}`} className="font-semibold text-content underline">
            {CONTACT.supportEmail}
          </a>{' '}
          from the address on your account and we will delete it for you. See our{' '}
          <Link href="/legal/privacy" className="font-semibold text-content underline">
            privacy policy
          </Link>{' '}
          for what we hold and why.
        </p>
        </div>
      </Container>
    </Section>
  )
}
