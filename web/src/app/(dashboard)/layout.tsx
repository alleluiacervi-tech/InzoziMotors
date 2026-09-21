import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { signOutAction } from '@/app/actions/auth'
import { DashboardNav } from '@/components/dashboard/DashboardNav'
import { VerificationNotice } from '@/components/dashboard/VerificationNotice'
import { getUnreadCount } from '@/components/dashboard/data'
import { Badge, Button, Container, Icon } from '@/components/ui'
import { getCurrentUser } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'
import type { UserRole } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// The signed-in shell.
//
// middleware.ts already bounces anonymous visitors at the edge; this second
// check is the one that actually matters, because the middleware only sees
// whether a cookie exists — the backend decides whether the JWT inside it is
// still valid. A stale cookie lands here with user === null and is sent to
// sign in rather than rendering an empty dashboard.
//
// The token never leaves the server: pages read it with getToken() and pass
// only rendered data down. No client component in this tree receives a JWT.
//
// DESIGN NOTES on this pass:
//
//   · The identity card carries the account's REAL STATE, not just its name.
//     `id_verified` decides what a seller may do — publish a listing, be
//     contacted, hold rental stock — and it was visible only as a banner that
//     disappears once approved. A quiet pill in the sidebar means the answer to
//     "am I verified?" is always on screen, on every page of the dashboard.
//
//   · SIGN OUT MOVED TO THE FOOT of the sidebar, under a rule. It sat inside
//     the identity card, immediately beside the avatar, which put the one
//     irreversible control in the nav at the top of the reading order and one
//     mis-tap from the first menu item. Separating a destructive action from
//     ordinary navigation is the standard pattern, and it costs nothing here.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Dashboard',
  // Nothing behind sign-in belongs in an index.
  robots: { index: false, follow: false },
}

const ROLE_KEY: Record<UserRole, string> = {
  buyer: 'dashboard.roles.buyer',
  seller: 'dashboard.roles.seller',
  admin: 'dashboard.roles.admin',
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = await getServerT()
  const user = await getCurrentUser()
  // Via /session/expired, not straight to /signin: the cookie is still present
  // and still fools the middleware, so sending them to /signin here would bounce
  // them back to /dashboard and loop forever. That route clears the cookie
  // first. See web/src/app/session/expired/route.ts.
  if (!user) redirect('/session/expired?next=/dashboard')

  const unread = await getUnreadCount()
  const initial = user.name.trim().charAt(0).toUpperCase() || '?'
  // Mirrors verifiedRentalProvider() in backend/src/routes/rentals.js — the
  // same three conditions that let POST /rentals/propose actually succeed.
  // Showing the fleet/inbox links to anyone else would just hand them an
  // empty page and a 403 on their first action.
  const isRentalProvider =
    user.role === 'seller' && user.id_verified === 'approved' && user.business_verified === true

  // Tone and label for the verification pill. `approved` is the only state
  // worth a positive colour; everything else is either in progress or blocking,
  // and both carry an icon as well as a colour.
  const verification = {
    approved: { tone: 'success' as const, icon: 'shield-check' as const },
    pending: { tone: 'warning' as const, icon: 'clock' as const },
    rejected: { tone: 'danger' as const, icon: 'alert' as const },
    none: { tone: 'neutral' as const, icon: 'shield' as const },
  }[user.id_verified] ?? { tone: 'neutral' as const, icon: 'shield' as const }

  return (
    <div className="bg-surface-page">
      <Container className="py-5 sm:py-8 lg:py-10">
        <div className="lg:grid lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-10">
          <aside className="lg:sticky lg:top-[calc(var(--header-h)+2.5rem)] lg:self-start">
            <div className="mb-4 rounded-2xl border border-line-soft bg-surface p-4 shadow-card lg:mb-6">
              <div className="flex items-center gap-3">
                {/* The initial, ringed. A bare tinted circle reads as a
                    placeholder; the ring makes it read as an avatar slot. */}
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-alt text-title-sm font-extrabold text-content-secondary ring-1 ring-inset ring-line"
                >
                  {initial}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-body font-extrabold text-content">{user.name}</p>
                  <p className="truncate text-micro text-content-muted">{t(ROLE_KEY[user.role])}</p>
                </div>
              </div>

              <div className="mt-3.5 flex flex-wrap gap-2">
                <Badge tone={verification.tone} icon={verification.icon}>
                  {t(`dashboard.profile.verification.${user.id_verified}Label`)}
                </Badge>
              </div>
            </div>

            <DashboardNav unread={unread} isRentalProvider={isRentalProvider} />

            {/* Destructive action, separated from the nav by a rule and a full
                block of space — never adjacent to a navigation item. */}
            <form
              action={signOutAction}
              className="mt-4 hidden border-t border-line-soft pt-4 lg:block"
            >
              <Button type="submit" variant="ghost" size="compact" fullWidth className="!justify-start">
                <Icon name="logout" size={16} aria-hidden="true" />
                {t('dashboard.common.signOut')}
              </Button>
            </form>
          </aside>

          <div className="min-w-0 pt-6 lg:pt-0">
            <VerificationNotice status={user.id_verified} />
            {children}

            {/* Phones never see the sidebar, so sign out lives at the foot of
                the content column — the end of the page, where an exit belongs
                and where no thumb reaches by accident. */}
            <form action={signOutAction} className="mt-10 border-t border-line-soft pt-6 lg:hidden">
              <Button type="submit" variant="outline" size="compact" fullWidth>
                <Icon name="logout" size={16} aria-hidden="true" />
                {t('dashboard.common.signOut')}
              </Button>
            </form>
          </div>
        </div>
      </Container>
    </div>
  )
}
