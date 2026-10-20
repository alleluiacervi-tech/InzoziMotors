import { I18nScope } from '@/components/i18n/I18nScope'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { VerificationNotice } from '@/components/dashboard/VerificationNotice'
import { getUnreadCount, getUnreadMessageCount } from '@/components/dashboard/data'
import { getCurrentUser, getToken } from '@/lib/session'
import { account } from '@/lib/api'
import { getChosenLocale, getServerT } from '@/lib/i18n/server'
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
// The shell itself — sidebar, phone tab bar, the account and its verification
// pill always on screen, sign out kept apart from navigation — is drawn by
// DashboardShell. The site's marketing header and footer are not shown here
// (layout/SiteChrome.tsx): this is a workspace, not a page of the website.
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

  // Pushes are written by the server, so it needs the language the person chose
  // here (same as the app does on sign-in). Only a real choice, and only when it
  // differs, so this is a no-op on almost every page view.
  const chosen = await getChosenLocale()
  if (chosen && chosen !== user.preferred_language) {
    const token = await getToken()
    if (token) await account.updateProfile(token, { preferred_language: chosen }).catch(() => {})
  }

  const [unread, messagesUnread] = await Promise.all([getUnreadCount(), getUnreadMessageCount()])
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
    <I18nScope ns={['dashboard', 'messages', 'onboarding', 'market']}>
      <DashboardShell
        account={{
          name: user.name,
          initial,
          roleLabel: t(ROLE_KEY[user.role]),
          verification: {
            ...verification,
            label: t(`dashboard.profile.verification.${user.id_verified}Label`),
          },
          isAdmin: user.role === 'admin',
        }}
        unread={unread}
        messagesUnread={messagesUnread}
        isRentalProvider={isRentalProvider}
        notice={<VerificationNotice status={user.id_verified} />}
      >
        {children}
      </DashboardShell>
    </I18nScope>
  )
}
