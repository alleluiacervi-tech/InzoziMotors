import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'
import { Icon } from '@/components/ui'
import { StoreButtons } from '@/components/app/StoreButtons'
import { CONTACT, FOOTER_LINKS, SITE } from '@/lib/site'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-line bg-ink-900 text-white">
      <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2.6fr]">
          <div>
            <Logo size={19} tone="light" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">
              Rwanda&apos;s certified car marketplace. We inspect every car on a 150-point
              check, photograph it ourselves, and stand behind it for 7 days.
            </p>

            <div className="mt-7">
              <p className="mb-3 text-eyebrow font-bold uppercase text-white/40">
                Get the app
              </p>
              <StoreButtons tone="dark" size="sm" />
            </div>

            <div className="mt-8 space-y-2.5 text-sm">
              <a
                href={`https://wa.me/${CONTACT.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-white/60 transition-colors hover:text-white"
              >
                <Icon name="whatsapp" size={17} />
                {CONTACT.whatsappDisplay}
              </a>
              <a
                href={`mailto:${CONTACT.email}`}
                className="flex items-center gap-2.5 text-white/60 transition-colors hover:text-white"
              >
                <Icon name="mail" size={17} />
                {CONTACT.email}
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {FOOTER_LINKS.map((group) => (
              <div key={group.heading}>
                <h2 className="mb-4 text-eyebrow font-bold uppercase text-white/40">
                  {group.heading}
                </h2>
                <ul className="space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-white/65 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/45">
            © {year} {SITE.name}. Kigali, Rwanda. All rights reserved.
          </p>
          <p className="text-xs text-white/45">
            Buyers pay nothing. Payment happens in person at an Inzozi center — never online.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
