import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { signOutAction } from '@/app/actions/auth'
import { DashboardNav } from '@/components/dashboard/DashboardNav'
import { VerificationNotice } from '@/components/dashboard/VerificationNotice'
import { getUnreadCount } from '@/components/dashboard/data'
import { Container, Icon } from '@/components/ui'
import { getCurrentUser } from '@/lib/session'
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
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Dashboard',
  // Nothing behind sign-in belongs in an index.
  robots: { index: false, follow: false },
}

const ROLE_LABEL: Record<UserRole, string> = {
  buyer: 'Buyer account',
  seller: 'Seller account',
  admin: 'Sawa team',
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  // Via /session/expired, not straight to /signin: the cookie is still present
  // and still fools the middleware, so sending them to /signin here would bounce
  // them back to /dashboard and loop forever. That route clears the cookie
  // first. See web/src/app/session/expired/route.ts.
  if (!user) redirect('/session/expired?next=/dashboard')

  const unread = await getUnreadCount()
  const initial = user.name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="bg-surface-page">
      <Container className="py-5 sm:py-8 lg:py-10">
        <div className="lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-10">
          <aside className="lg:sticky lg:top-[calc(var(--header-h)+2.5rem)] lg:self-start">
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-line-soft bg-surface p-4 shadow-card lg:mb-5 lg:flex-col lg:items-stretch lg:gap-3">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-alt text-title-sm font-extrabold text-content-secondary"
                >
                  {initial}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-body font-extrabold text-content">{user.name}</p>
                  <p className="truncate text-micro text-content-muted">{ROLE_LABEL[user.role]}</p>
                </div>
              </div>

              <form action={signOutAction} className="ml-auto lg:ml-0">
                <button
                  type="submit"
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line px-4 text-caption font-bold text-content-secondary transition-colors hover:bg-surface-alt hover:text-content lg:w-full"
                >
                  <Icon name="logout" size={16} />
                  Sign out
                </button>
              </form>
            </div>

            <DashboardNav unread={unread} />
          </aside>

          <div className="min-w-0 pt-6 lg:pt-0">
            <VerificationNotice status={user.id_verified} />
            {children}
          </div>
        </div>
      </Container>
    </div>
  )
}
