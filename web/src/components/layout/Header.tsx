'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Logo } from '@/components/brand/Logo'
import { Button, Icon } from '@/components/ui'
import { APP, CONTACT, NAV_LINKS } from '@/lib/site'
import type { User } from '@/lib/types'

/**
 * Sticky site header, with two personalities and a seam-free change between
 * them:
 *
 *   OVERLAY — on the homepage, before any scroll: fully transparent, light
 *   type, sitting ON the hero photograph (the hero pulls itself up underneath
 *   with a negative margin). The page opens as one full-bleed image with the
 *   navigation floating in it — the flagship treatment.
 *
 *   SOLID — everywhere else, and the moment the user scrolls: frosted surface,
 *   hairline, a whisper of shadow. The 300ms transition between the two is the
 *   whole trick; there is no third state.
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

  // Only the homepage carries a full-bleed dark hero for the header to float
  // on. The drawer forces solid: white panel under a transparent bar reads as
  // a rendering bug.
  const overlay = pathname === '/' && !scrolled && !open

  // The desktop nav link, in both personalities. The active page gets an
  // editorial underline bar rather than a pill — quieter, and it never
  // competes with the buttons on the right.
  const navLink = (active: boolean) =>
    `relative rounded-lg px-3 py-2 text-caption font-semibold transition-colors ` +
    `after:absolute after:inset-x-3 after:-bottom-px after:h-[2px] after:rounded-full ` +
    `after:transition-all after:duration-300 after:content-[''] ` +
    (overlay
      ? active
        ? 'text-white after:bg-white'
        : 'text-white/75 after:bg-transparent hover:text-white'
      : active
        ? 'text-content after:bg-brand'
        : 'text-content-secondary after:bg-transparent hover:text-content')

  // Quiet header furniture (WhatsApp, search, hamburger) in both tones.
  const quiet = overlay
    ? 'text-white/85 hover:bg-white/10 hover:text-white'
    : 'text-content-secondary hover:bg-surface-alt hover:text-content'

  return (
    <header
      className={`sticky top-0 z-50 h-[var(--header-h)] border-b transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ${
        overlay
          ? 'border-transparent bg-transparent'
          : scrolled
            ? 'border-line-soft bg-surface/85 shadow-[0_8px_24px_-20px_rgba(20,20,20,0.35)] backdrop-blur-xl'
            : 'border-transparent bg-surface-page'
      }`}
    >
      <div className="mx-auto flex h-full max-w-content items-center gap-4 px-5 sm:px-8 lg:px-12">
        <Link href="/" aria-label="Sawa Cars — home" className="shrink-0">
          <Logo size={17} tone={overlay ? 'light' : 'dark'} />
        </Link>

        <nav aria-label="Primary" className="ml-4 hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={navLink(isActive(link.href))}
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
              className={`hidden items-center gap-2 rounded-lg px-3 py-2 text-caption font-semibold transition-colors lg:flex ${quiet}`}
            >
              <Icon name="whatsapp" size={17} />
              {CONTACT.whatsappDisplay}
            </a>
          ) : null}

          <Link
            href="/cars"
            aria-label="Search cars"
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors lg:hidden ${quiet}`}
          >
            <Icon name="search" size={20} />
          </Link>

          {user?.role === 'admin' ? (
            <Button
              href="/admin-portal"
              prefetch={false}
              variant={overlay ? 'inverse' : 'ghost'}
              size="sm"
              className="hidden sm:inline-flex"
            >
              Admin
            </Button>
          ) : null}

          {user ? (
            <Button
              href="/dashboard"
              variant={overlay ? 'inverse' : 'secondary'}
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Icon name="user" size={16} />
              <span className="max-w-[10ch] truncate">{user.name.split(' ')[0]}</span>
            </Button>
          ) : (
            <Button
              href="/signin"
              variant={overlay ? 'inverse' : 'ghost'}
              size="sm"
              className="hidden sm:inline-flex"
            >
              Sign in
            </Button>
          )}

          {APP.storesLive ? (
            <>
              <Button
                href="/cars"
                variant={overlay ? 'inverse' : 'ghost'}
                size="sm"
                className="hidden lg:inline-flex"
              >
                Browse cars
              </Button>
              <Button href="/download" size="sm" className="hidden sm:inline-flex">
                Get the app
              </Button>
            </>
          ) : (
            <>
              {/* One primary action, and it is the product. The app link stays
                  reachable but stops outshouting a marketplace that is live
                  today with an app that is not. */}
              <Button
                href="/download"
                variant={overlay ? 'inverse' : 'outline'}
                size="sm"
                className="hidden lg:inline-flex"
              >
                Get the app
              </Button>
              <Button href="/cars" size="sm" className="hidden sm:inline-flex">
                Browse cars
              </Button>
            </>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors lg:hidden ${
              overlay ? 'text-white hover:bg-white/10' : 'text-content hover:bg-surface-alt'
            }`}
          >
            <Icon name={open ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </div>

      {/* Mobile drawer — items cascade in with a 40ms stagger; one animation,
          six offsets, and the sheet feels composed rather than dumped. */}
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
            className="relative max-h-full overflow-y-auto rounded-b-3xl border-b border-line bg-surface px-5 pb-8 pt-4 shadow-float"
          >
            <ul className="space-y-1">
              {NAV_LINKS.map((link, i) => (
                <li
                  key={link.href}
                  className="animate-fade-up [animation-fill-mode:backwards]"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
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

            {/* Contact, one tap away — the drawer doubles as the "reach a
                human" surface on the phone, where it matters most. */}
            {CONTACT.whatsappVerified ? (
              <div
                className="mt-5 grid grid-cols-2 gap-2 animate-fade-up [animation-fill-mode:backwards]"
                style={{ animationDelay: `${NAV_LINKS.length * 40}ms` }}
              >
                <a
                  href={`https://wa.me/${CONTACT.whatsapp}`}
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-line px-3 py-3 text-caption font-bold text-content transition-colors hover:bg-surface-alt"
                >
                  <Icon name="whatsapp" size={17} className="text-success" />
                  WhatsApp
                </a>
                <a
                  href={`tel:+${CONTACT.whatsapp}`}
                  className="flex items-center justify-center gap-2 rounded-xl border border-line px-3 py-3 text-caption font-bold text-content transition-colors hover:bg-surface-alt"
                >
                  <Icon name="phone" size={16} />
                  Call us
                </a>
              </div>
            ) : null}

            <div
              className="mt-5 space-y-3 border-t border-line-soft pt-5 animate-fade-up [animation-fill-mode:backwards]"
              style={{ animationDelay: `${(NAV_LINKS.length + 1) * 40}ms` }}
            >
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
              {APP.storesLive ? (
                <Button href="/download" fullWidth>Get the app</Button>
              ) : (
                <>
                  <Button href="/cars" fullWidth>Browse certified cars</Button>
                  <Button href="/download" variant="ghost" fullWidth>Get the app</Button>
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  )
}

export default Header
