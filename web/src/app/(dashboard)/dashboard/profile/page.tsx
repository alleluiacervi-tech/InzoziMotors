import type { Metadata } from 'next'
import { signOutAction } from '@/app/actions/auth'
import { DeleteAccountForm } from '@/components/dashboard/DeleteAccountForm'
import { PageHeader, PanelHeading } from '@/components/dashboard/PageHeader'
import { PasswordForm } from '@/components/dashboard/PasswordForm'
import { ProfileForm } from '@/components/dashboard/ProfileForm'
import { Badge, Button, Card, Icon } from '@/components/ui'
import { formatDate } from '@/lib/business'
import { account } from '@/lib/api'
import { getCurrentUser } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'
import type { IdVerificationStatus } from '@/lib/types'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('dashboard.meta.profile'),
    robots: { index: false, follow: false },
  }
}

// Account settings. Only the two controls the API actually supports are built:
// PATCH /auth/me (name, phone) and POST /auth/change-password. There is no
// email-change route, so there is no email-change control.

const VERIFICATION: Record<
  IdVerificationStatus,
  { labelKey: string; tone: 'success' | 'warning' | 'neutral' | 'danger'; bodyKey: string }
> = {
  approved: {
    labelKey: 'dashboard.profile.verification.approvedLabel',
    tone: 'success',
    bodyKey: 'dashboard.profile.verification.approvedBody',
  },
  pending: {
    labelKey: 'dashboard.profile.verification.pendingLabel',
    tone: 'warning',
    bodyKey: 'dashboard.profile.verification.pendingBody',
  },
  rejected: {
    labelKey: 'dashboard.profile.verification.rejectedLabel',
    tone: 'danger',
    bodyKey: 'dashboard.profile.verification.rejectedBody',
  },
  none: {
    labelKey: 'dashboard.profile.verification.noneLabel',
    tone: 'neutral',
    bodyKey: 'dashboard.profile.verification.noneBody',
  },
}

export default async function ProfilePage() {
  const t = await getServerT()
  const user = await getCurrentUser()
  if (!user) return null

  const verification = VERIFICATION[user.id_verified]

  // Fetched rather than duplicated in the component: the same vocabulary is a
  // CHECK constraint on the server, and a hardcoded copy here would eventually
  // offer a reason the database refuses. The component keeps a bundled fallback
  // for the case where this read fails — being unable to list reasons must not
  // be what stops somebody closing their account.
  const closure = await account.closureReasons().catch(() => null)

  return (
    <>
      <PageHeader
        title={t('dashboard.profile.title')}
        description={t('dashboard.profile.description')}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="details">
          <PanelHeading id="details" title={t('dashboard.profile.detailsHeading')} />
          <Card className="p-5 sm:p-6">
            <ProfileForm name={user.name} phone={user.phone ?? ''} whatsapp={user.whatsapp_phone ?? ''} phoneVisible={!!user.phone_visible} whatsappVisible={!!user.whatsapp_visible} email={user.email} />
          </Card>
        </section>

        <div className="space-y-6">
          <section aria-labelledby="verification">
            <PanelHeading id="verification" title={t('dashboard.profile.verificationHeading')} />
            <Card className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={verification.tone}>{t(verification.labelKey)}</Badge>
                <p className="text-caption text-content-muted">
                  {t('dashboard.profile.accountCreated', { date: formatDate(user.created_at) })}
                </p>
              </div>
              <p className="mt-3 text-caption leading-relaxed text-content-secondary">
                {t(verification.bodyKey)}
              </p>
              {user.id_verified !== 'approved' ? (
                <div className="mt-5">
                  <Button href="/download" variant="outline" size="sm">
                    {t('dashboard.common.getApp')}
                  </Button>
                </div>
              ) : null}
            </Card>
          </section>

          <section aria-labelledby="password">
            <PanelHeading id="password" title={t('dashboard.profile.passwordHeading')} />
            <Card className="p-5 sm:p-6">
              <PasswordForm />
            </Card>
          </section>

          <section aria-labelledby="session">
            <PanelHeading id="session" title={t('dashboard.profile.deviceHeading')} />
            <Card className="p-5 sm:p-6">
              <p className="text-caption leading-relaxed text-content-secondary">
                {t('dashboard.profile.deviceBody')}
              </p>
              <form action={signOutAction} className="mt-4">
                <Button type="submit" variant="outline" size="compact">
                  <Icon name="logout" size={16} />
                  {t('dashboard.common.signOut')}
                </Button>
              </form>
            </Card>
          </section>

          <section aria-labelledby="delete-account">
            <PanelHeading id="delete-account" title={t('dashboard.profile.closeHeading')} />
            <DeleteAccountForm reasons={closure?.reasons} recoveryDays={closure?.recovery_days} />
          </section>
        </div>
      </div>
    </>
  )
}
