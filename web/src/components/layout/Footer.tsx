import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'
import { Eyebrow, Icon } from '@/components/ui'
import { StoreButtons } from '@/components/app/StoreButtons'
import { CENTERS, CONTACT, FOOTER_LINKS, SITE } from '@/lib/site'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-line bg-ink-900 text-white">
      <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2.6fr]">
          <div>
            <Logo size={19} tone="light" />
            <p className="mt-5 max-w-sm text-body leading-relaxed text-white/60">
              Rwanda&apos;s certified car marketplace. We inspect every car on a 150-point
              check, photograph it ourselves, and stand behind it for 7 days.
            </p>

            <div className="mt-7">
              <Eyebrow tone="invert">Get the app</Eyebrow>
              <StoreButtons tone="dark" size="sm" />
            </div>

            <div className="mt-8 space-y-2.5 text-body">
              {/* Honesty gate: the WhatsApp line renders only once the real
                  business number is verified — never the placeholder. */}
              {CONTACT.whatsappVerified ? (
                <a
                  href={`https://wa.me/${CONTACT.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-white/60 transition-colors hover:text-white"
                >
                  <Icon name="whatsapp" size={17} />
                  {CONTACT.whatsappDisplay}
                </a>
              ) : null}
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
                        className="text-caption text-white/65 transition-colors hover:text-white"
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

        {/* Trust furniture: three physical centers, printed where every page
            ends. Competitors bury their locations — the centers ARE the product
            here, so the footer says so. */}
        <div className="mt-14 border-t border-white/10 pt-10">
          <Eyebrow tone="invert">Visit us</Eyebrow>
          <div className="grid gap-6 sm:grid-cols-3">
            {CENTERS.map((center) => (
              <div key={center.id} className="text-caption leading-relaxed text-white/60">
                <p className="font-bold text-white/85">{center.name}</p>
                <p>{center.address}</p>
                <p>{center.hours}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-micro text-white/45">
            © {year} {SITE.name}. Kigali, Rwanda. All rights reserved.
          </p>
          <p className="text-micro text-white/45">
            Buyers pay nothing. Payment happens in person at an Sawa center — never online.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
