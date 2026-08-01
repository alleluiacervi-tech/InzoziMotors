import type { Metadata } from 'next'
import { Button, Container, Field, Icon, Section, SectionHeading, Textarea } from '@/components/ui'
import { PageHeader } from '@/components/marketing/PageHeader'
import { CenterList } from '@/components/marketing/CenterList'
import { CONTACT } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Contact & centers',
  description:
    'Reach the Sawa team on WhatsApp or by email, and find opening hours and addresses for our three inspection and handover centers in Kigali.',
  alternates: { canonical: '/contact' },
}

// "All of them real" is a literal claim — the WhatsApp channel only joins the
// list once the verified business number replaces the placeholder (the honesty
// gate in lib/site.ts). Shipping a fake number on a contact page is exactly the
// scam signal this company exists to kill.
const CHANNELS = [
  ...(CONTACT.whatsappVerified
    ? [
        {
          icon: 'whatsapp' as const,
          label: 'WhatsApp',
          value: CONTACT.whatsappDisplay,
          href: `https://wa.me/${CONTACT.whatsapp}`,
          note: 'The fastest way to reach us. Handover arrangements, viewings and questions about a specific listing.',
          external: true,
        },
      ]
    : []),
  {
    icon: 'mail' as const,
    label: 'General email',
    value: CONTACT.email,
    href: `mailto:${CONTACT.email}`,
    note: 'Partnerships, dealer accounts and anything that needs an attachment.',
    external: false,
  },
  {
    icon: 'shield' as const,
    label: 'Support',
    value: CONTACT.supportEmail,
    href: `mailto:${CONTACT.supportEmail}`,
    note: 'Returns inside the 7-day window, disputes after a handover, and account problems.',
    external: false,
  },
]

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Talk to a person"
        lede="WhatsApp is how Rwanda communicates, so it is how we do too. Messages are read by the team that runs the centers. If you have requested a car, we make contact within 24 hours to arrange the handover."
      />

      {/* ─── Channels ────────────────────────────────────────────────────── */}
      <Section tone="surface">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
            <div>
              <SectionHeading eyebrow="Reach us" title={CHANNELS.length === 3 ? "Three ways, all of them real" : "Two ways, both of them real"} />

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
                        <span className="block text-micro font-bold uppercase tracking-[0.1em] text-content-muted">
                          {channel.label}
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

            {/* This form has no server behind it — by design. It GETs straight
                to wa.me (or mailto) with the message pre-filled, so it works
                with JavaScript disabled and nothing is silently swallowed.
                Same honesty gate: WhatsApp only once the number is real. */}
            <div className="rounded-3xl border border-line-soft bg-surface p-6 shadow-card sm:p-8">
              <h2 className="text-title font-extrabold text-content">Write your message here</h2>
              <p className="mt-2 text-body leading-relaxed text-content-secondary">
                {CONTACT.whatsappVerified
                  ? 'We do not run a contact inbox on this website, so this button opens WhatsApp with what you have written already typed in. Nothing is sent from this page.'
                  : 'We do not run a contact inbox on this website, so this button opens your email app with what you have written already typed in. Nothing is sent from this page.'}
              </p>

              <form
                action={
                  CONTACT.whatsappVerified
                    ? `https://wa.me/${CONTACT.whatsapp}`
                    : `mailto:${CONTACT.email}`
                }
                method="get"
                target={CONTACT.whatsappVerified ? '_blank' : undefined}
                className="mt-7"
              >
                <Field
                  label="Your message"
                  htmlFor="wa-text"
                  hint="Include the listing you are asking about, if there is one — it saves a round trip."
                >
                  <Textarea
                    id="wa-text"
                    name={CONTACT.whatsappVerified ? 'text' : 'body'}
                    required
                    maxLength={900}
                    placeholder="Hello Sawa — I would like to ask about…"
                  />
                </Field>

                <Button
                  type="submit"
                  fullWidth
                  className="mt-6"
                  leadingIcon={
                    <Icon name={CONTACT.whatsappVerified ? 'whatsapp' : 'mail'} size={19} />
                  }
                >
                  {CONTACT.whatsappVerified ? 'Open WhatsApp' : 'Open your email app'}
                </Button>
              </form>
            </div>
          </div>
        </Container>
      </Section>

      {/* ─── Centers ─────────────────────────────────────────────────────── */}
      <Section tone="page">
        <Container>
          <SectionHeading
            eyebrow="Come and see us"
            title="Our centers"
            description="Inspections, handovers and returns all happen here. No appointment is needed to look around, but bring one if you are dropping a car off."
          />
          <CenterList className="mt-12" />
        </Container>
      </Section>
    </>
  )
}
