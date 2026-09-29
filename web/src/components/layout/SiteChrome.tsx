'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/** The signed-in workspace: its own shell, no marketing header or footer. */
export const isAppRoute = (pathname: string | null) =>
  pathname === '/dashboard' || Boolean(pathname?.startsWith('/dashboard/'))

// The site header and footer are for browsing and for finding out about Sawa.
// Inside the dashboard they were a second navigation stacked on the first and
// a page of company links under every inbox and form, so a signed-in person
// never felt they were in a workspace. The dashboard layout draws its own
// shell (DashboardShell); this steps the marketing chrome aside for it.
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (isAppRoute(pathname)) return null
  return <>{children}</>
}

export default SiteChrome
