import type { Metadata } from 'next'
import { Button, Container, Field, Icon, Section, SectionHeading, Textarea } from '@/components/ui'
import { PageHeader } from '@/components/marketing/PageHeader'
import { CenterList } from '@/components/marketing/CenterList'
import { CONTACT } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Contact us',
  description:
    'Call or WhatsApp the Sawa Cars team on +250 788 308 611, or email contact@sawacars.com. Opening hours and addresses for our inspection centers in Kigali.',
  alternates: { canonical: '/contact' },
}

// ─────────────────────────────────────────────────────────────────────────────
// One line, one mailbox, three ways to use them.
//
// The previous version of this page advertised two email addresses and a
// placeholder WhatsApp number behind an honesty gate, so it rendered as "two
// ways, both of them real" — accurate, but it read like a company that could
// not be reached. Both are real now, and the page is built around the number
// rather than apologising for it.
//
// Every channel here points at the SAME number and the SAME mailbox. That is a
// deliberate product decision, not a shortcut: an extra address is an extra
// place to be ignored, and the mailbox below is the one the admin dashboard's
// inbox actually reads over IMAP.
// ─────────────────────────────────────────────────────────────────────────────

/** The team is on the line while the centers are open. Kept in step with
 *  CENTERS in lib/site.ts — the widest window any center keeps. */
const LINE_HOURS = 'Mon–Sat · 8:00 – 18:00'

const CHANNELS = [
  {
    icon: 'whatsapp' as const,
    label: 'WhatsApp',
    value: CONTACT.whatsappDisplay,
    href: `https://wa.me/${CONTACT.whatsapp}`,
    note: 'The fastest way to reach us. Send a listing link and we will tell you whether the car is still on the floor.',
    badge: 'Fastest',
    external: true,
  },
  {
    icon: 'phone' as const,
    label: 'Call us',
    value: CONTACT.phoneDisplay,
    href: `tel:+${CONTACT.phone}`,
    note: `Same line, answered in person during center hours — ${LINE_HOURS}.`,
    badge: null,
    external: false,
  },
  {
    icon: 'mail' as const,
    label: 'Email',
    value: CONTACT.email,
    href: `mailto:${CONTACT.email}`,
    note: 'For anything that needs an attachment: dealer accounts, partnerships, or documents for a return.',
    badge: null,
    external: false,
  },
]

/** Sets expectations we can actually keep — every line here is a promise the
 *  operation already makes elsewhere on the site. */
const PROMISES = [
  {
    icon: 'clock' as const,
    title: 'Within 24 hours',
    body: 'Every purchase request gets a call or a WhatsApp message from the team that runs the centers.',
  },
  {
    icon: 'user' as const,
    title: 'A person, not a bot',
    body: 'The line is answered by the people who inspect and hand over the cars. There is no phone tree.',
  },
  {
    icon: 'shield-check' as const,
    title: 'One number, always',
    body: 'We never ask you to continue on another number or send money to an account given over chat.',
  },
]

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Talk to a person"
        lede="One line, answered by the team that supports inspections, listings and platform questions. Buyers and sellers use their own enabled contact channels for direct deal discussions."
      />

      {/* ─── The number, front and centre ─────────────────────────────────────
          An ink band so the single most useful thing on the page cannot be
          scrolled past, and so both actions are one tap on a phone. */}
      <Section tone="ink" className="!py-12 sm:!py-16">
        <Container>
          <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-between">
            <div className="text-center lg:text-left">
              <p className="text-micro font-bold uppercase tracking-[0.16em] text-white/60">
                Calls &amp; WhatsApp
              </p>
              {/* The number is a link on every viewport: on a phone it dials, on a
                  desktop it hands off to whatever handles tel: — and it is
                  selectable either way, which a plain <p> would also give but a
                  button would not. */}
              <a
                href={`tel:+${CONTACT.phone}`}
                className="mt-2 block text-headline font-extrabold text-white transition-colors hover:text-brand-bright"
              >
                {CONTACT.phoneDisplay}
              </a>
              <p className="mt-2 text-caption text-white/60">{LINE_HOURS}</p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              {/* No rel needed — Button adds noopener noreferrer for any http href. */}
              <Button
                href={`https://wa.me/${CONTACT.whatsapp}`}
                target="_blank"
                size="lg"
                leadingIcon={<Icon name="whatsapp" size={20} />}
              >
                Message on WhatsApp
              </Button>
              <Button
                href={`tel:+${CONTACT.phone}`}
                variant="inverse"
                size="lg"
                leadingIcon={<Icon name="phone" size={19} />}
              >
                Call now
              </Button>
            </div>
          </div>
        </Container>
      </Section>

      {/* ─── Channels + composer ─────────────────────────────────────────── */}
      <Section tone="surface">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
            <div className="min-w-0">
              <SectionHeading eyebrow="Reach us" title="Three ways, all of them real" />

              <ul className="mt-10 space-y-3">
                {CHANNELS.map((channel) => (
                  <li key={channel.label}>
                    <a
                      href={channel.href}
                      {...(channel.external
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                      className="flex gap-4 rounded-2xl border border-line-soft bg-surface p-5 shadow-card transition-all duration-300 ease-brand hover:-translate-y-0.5 hover:border-line hover:shadow-card-lg"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-alt text-content-secondary">
                        <Icon name={channel.icon} size={20} />
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-micro font-bold uppercase tracking-[0.1em] text-content-muted">
                            {channel.label}
                          </span>
                          {channel.badge ? (
                            <span className="rounded-pill bg-success-tint px-2 py-0.5 text-micro font-bold uppercase tracking-[0.08em] text-success-text">
                              {channel.badge}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block break-words text-title-sm font-extrabold text-content">
                          {channel.value}
                        </span>
                        <span className="mt-1.5 block text-caption leading-relaxed text-content-secondary">
                          {channel.note}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* This form has no server behind it — by design. It GETs straight to
                wa.me with the message pre-filled, so it works with JavaScript
                disabled and nothing is silently swallowed. Email stays a plain
                mailto in the card above rather than a second submit button:
                wa.me wants ?text= and mail clients want ?body=, and one textarea
                cannot carry both names without JavaScript. */}
            <div className="rounded-3xl border border-line-soft bg-surface p-6 shadow-card sm:p-8">
              <h2 className="text-title font-extrabold text-content">Write it here</h2>
              <p className="mt-2 text-body leading-relaxed text-content-secondary">
                This website does not run a contact inbox, so nothing is sent from this page. The
                button opens WhatsApp with what you have written already typed in — you press send.
              </p>

              <form
                action={`https://wa.me/${CONTACT.whatsapp}`}
                method="get"
                target="_blank"
                className="mt-7"
              >
                <Field
                  label="Your message"
                  htmlFor="wa-text"
                  hint="Include the listing you are asking about, if there is one — it saves a round trip."
                >
                  <Textarea
                    id="wa-text"
                    name="text"
                    required
                    maxLength={900}
                    placeholder="Hello Sawa Cars — I would like to ask about…"
                  />
                </Field>

                <Button
                  type="submit"
                  fullWidth
                  className="mt-6"
                  leadingIcon={<Icon name="whatsapp" size={19} />}
                >
                  Open WhatsApp
                </Button>

                <p className="mt-4 text-caption leading-relaxed text-content-muted">
                  Prefer email?{' '}
                  <a
                    href={`mailto:${CONTACT.email}`}
                    className="font-semibold text-content underline underline-offset-2"
                  >
                    {CONTACT.email}
                  </a>{' '}
                  reaches the same team.
                </p>
              </form>
            </div>
          </div>
        </Container>
      </Section>

      {/* ─── What to expect ─────────────────────────────────────────────────
          The third card is a safety notice as much as a promise: "continue on
          this other number" and "send a deposit to this account" are the two
          most common used-car scams in Kigali, and saying so on the contact
          page is worth more than saying it in the terms. */}
      <Section tone="page">
        <Container>
          <SectionHeading eyebrow="What to expect" title="After you get in touch" />
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {PROMISES.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-line-soft bg-surface p-6 shadow-card"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tint text-brand">
                  <Icon name={p.icon} size={19} />
                </span>
                <h3 className="mt-4 text-title-sm font-extrabold text-content">{p.title}</h3>
                <p className="mt-2 text-caption leading-relaxed text-content-secondary">{p.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* ─── Centers ─────────────────────────────────────────────────────── */}
      <Section tone="surface">
        <Container>
          <SectionHeading
            eyebrow="Come and see us"
            title="Our centers"
            description="Platform inspection services happen here. Contact the team before dropping off a vehicle; user transactions are arranged independently."
          />
          <CenterList className="mt-12" />
        </Container>
      </Section>
    </>
  )
}
