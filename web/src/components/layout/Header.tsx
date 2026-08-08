'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Logo } from '@/components/brand/Logo'
import { Button, Icon } from '@/components/ui'
import { CONTACT, NAV_LINKS } from '@/lib/site'
import type { User } from '@/lib/types'

/**
 * Sticky site header.
 *
 * The signed-in user is resolved on the SERVER (layout.tsx reads the httpOnly
 * cookie) and handed down as a prop. That keeps the JWT out of the browser
 * entirely while still letting this be a client component for the menu state.
 */
export function Header({ user }: { user: User | null }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Route changes must close the drawer, or a back-navigation leaves it open
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Prevent the page behind the drawer from scrolling
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Escape closes the drawer — keyboard users had no way out of it short of
  // tabbing to the X button.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href))

  return (
    <header
      className={`sticky top-0 z-50 h-[var(--header-h)] border-b transition-colors duration-300 ${
        scrolled
          ? 'border-line-soft bg-surface/85 backdrop-blur-xl'
          : 'border-transparent bg-surface-page'
      }`}
    >
      <div className="mx-auto flex h-full max-w-content items-center gap-4 px-5 sm:px-8 lg:px-12">
        <Link href="/" aria-label="Sawa — home" className="shrink-0">
          <Logo size={17} />
        </Link>

        <nav aria-label="Primary" className="ml-4 hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={`relative rounded-lg px-3 py-2 text-caption font-semibold transition-colors ${
                    isActive(link.href)
                      ? 'bg-brand/10 text-brand'
                      : 'text-content-secondary hover:bg-surface-alt hover:text-content'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* WhatsApp as header furniture — Rwanda's channel, the way Autochek
              puts a phone number in the header. Gated: renders only once the
              real business number is verified, never the placeholder. */}
          {CONTACT.whatsappVerified ? (
            <a
              href={`https://wa.me/${CONTACT.whatsapp}`}
              rel="noopener noreferrer"
              className="hidden items-center gap-2 rounded-lg px-3 py-2 text-caption font-semibold text-content-secondary transition-colors hover:bg-surface-alt hover:text-content lg:flex"
            >
              <Icon name="whatsapp" size={17} />
              {CONTACT.whatsappDisplay}
            </a>
          ) : null}

          <Link
            href="/cars"
            aria-label="Search cars"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-content-secondary transition-colors hover:bg-surface-alt hover:text-content lg:hidden"
          >
            <Icon name="search" size={20} />
          </Link>

          {user?.role === 'admin' ? (
            <Button
              href="/admin-portal"
              prefetch={false}
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              Admin
            </Button>
          ) : null}

          {user ? (
            <Button href="/dashboard" variant="secondary" size="sm" className="hidden sm:inline-flex">
              <Icon name="user" size={16} />
              <span className="max-w-[10ch] truncate">{user.name.split(' ')[0]}</span>
            </Button>
          ) : (
            <Button href="/signin" variant="ghost" size="sm" className="hidden sm:inline-flex">
              Sign in
            </Button>
          )}

          <Button href="/download" size="sm" className="hidden sm:inline-flex">
            Get the app
          </Button>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-content transition-colors hover:bg-surface-alt lg:hidden"
          >
            <Icon name={open ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-x-0 top-[var(--header-h)] bottom-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
          />
          <nav
            id="mobile-nav"
            aria-label="Mobile"
            className="relative max-h-full overflow-y-auto border-b border-line bg-surface px-5 pb-8 pt-4 shadow-float animate-fade-up"
          >
            <ul className="space-y-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive(link.href) ? 'page' : undefined}
                    className={`flex items-center justify-between rounded-xl px-4 py-3.5 text-body font-bold ${
                      isActive(link.href)
                        ? 'bg-brand/10 text-brand'
                        : 'text-content hover:bg-surface-alt'
                    }`}
                  >
                    {link.label}
                    <Icon name="chevron-right" size={16} />
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-6 space-y-3 border-t border-line-soft pt-6">
              {user?.role === 'admin' ? (
                <Button href="/admin-portal" prefetch={false} variant="secondary" fullWidth>
                  Admin dashboard
                </Button>
              ) : null}
              {user ? (
                <Button href="/dashboard" variant="outline" fullWidth leadingIcon={<Icon name="user" size={18} />}>
                  My dashboard
                </Button>
              ) : (
                <>
                  <Button href="/signin" variant="outline" fullWidth>Sign in</Button>
                  <Button href="/signup" variant="secondary" fullWidth>Create account</Button>
                </>
              )}
              <Button href="/download" fullWidth>Get the app</Button>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  )
}

export default Header
