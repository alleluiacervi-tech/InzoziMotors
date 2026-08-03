import type { Metadata } from 'next'
import { signOutAction } from '@/app/actions/auth'
import { DeleteAccountForm } from '@/components/dashboard/DeleteAccountForm'
import { PageHeader, PanelHeading } from '@/components/dashboard/PageHeader'
import { PasswordForm } from '@/components/dashboard/PasswordForm'
import { ProfileForm } from '@/components/dashboard/ProfileForm'
import { Badge, Button, Card, Icon } from '@/components/ui'
import { formatDate } from '@/lib/business'
import { getCurrentUser } from '@/lib/session'
import type { IdVerificationStatus } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Profile',
  robots: { index: false, follow: false },
}

// Account settings. Only the two controls the API actually supports are built:
// PATCH /auth/me (name, phone) and POST /auth/change-password. There is no
// email-change route, so there is no email-change control.

const VERIFICATION: Record<
  IdVerificationStatus,
  { label: string; tone: 'success' | 'warning' | 'neutral' | 'danger'; body: string }
> = {
  approved: {
    label: 'Verified',
    tone: 'success',
    body:
      'Our team has confirmed your identity. You can submit cars for inspection, and buyers see a verified-seller mark on your listings.',
  },
  pending: {
    label: 'In review',
    tone: 'warning',
    body:
      'Your documents are with our team. Reviews finish within 24 hours and you will get a notification the moment it is done.',
  },
  rejected: {
    label: 'Needs another attempt',
    tone: 'danger',
    body:
      'The photos we received were not clear enough to confirm. Open the Sawa Cars app and resubmit — there is no limit on attempts.',
  },
  none: {
    label: 'Not started',
    tone: 'neutral',
    body:
      'Buying, saving and requests all work without this. Verification is only needed to sell a car, and it happens in the Sawa Cars app: a photo of your national ID and a selfie.',
  },
}

export default async function ProfilePage() {
  const user = await getCurrentUser()
  if (!user) return null

  const verification = VERIFICATION[user.id_verified]

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your details, your password, and where your identity check stands."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="details">
          <PanelHeading id="details" title="Your details" />
          <Card className="p-5 sm:p-6">
            <ProfileForm name={user.name} phone={user.phone ?? ''} email={user.email} />
          </Card>
        </section>

        <div className="space-y-6">
          <section aria-labelledby="verification">
            <PanelHeading id="verification" title="Identity verification" />
            <Card className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={verification.tone}>{verification.label}</Badge>
                <p className="text-caption text-content-muted">
                  Account created {formatDate(user.created_at)}
                </p>
              </div>
              <p className="mt-3 text-caption leading-relaxed text-content-secondary">
                {verification.body}
              </p>
              {user.id_verified !== 'approved' ? (
                <div className="mt-5">
                  <Button href="/download" variant="outline" size="sm">
                    Get the app
                  </Button>
                </div>
              ) : null}
            </Card>
          </section>

          <section aria-labelledby="password">
            <PanelHeading id="password" title="Password" />
            <Card className="p-5 sm:p-6">
              <PasswordForm />
            </Card>
          </section>

          <section aria-labelledby="session">
            <PanelHeading id="session" title="This device" />
            <Card className="p-5 sm:p-6">
              <p className="text-caption leading-relaxed text-content-secondary">
                Signing out clears your session on this browser only. Your saved cars, requests and
                alerts stay exactly as they are.
              </p>
              <form action={signOutAction} className="mt-4">
                <button
                  type="submit"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-line px-4 text-caption font-bold text-content-secondary transition-colors hover:border-content-muted hover:bg-surface-alt hover:text-content"
                >
                  <Icon name="logout" size={16} />
                  Sign out
                </button>
              </form>
            </Card>
          </section>

          <section aria-labelledby="delete-account">
            <PanelHeading id="delete-account" title="Delete account" />
            <DeleteAccountForm />
          </section>
        </div>
      </div>
    </>
  )
}
