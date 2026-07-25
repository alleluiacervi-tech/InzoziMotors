import { Badge, Container, Icon, Section } from '@/components/ui'
import type { IconName } from '@/components/ui'
import { LogoMark } from '@/components/brand/Logo'
import { StoreButtons } from '@/components/app/StoreButtons'

// There are no screenshot assets in this repo, and shipping an invented one
// would be a lie about a product a visitor can download in thirty seconds. So
// the device is drawn from the same primitives the real app uses: a frame, a
// listing card, a certification badge. It is an abstraction, not a mock-up of a
// specific car — no price, no plate, no fabricated model.
//
// The whole illustration is aria-hidden; the list beside it is the accessible
// version of the same message.

const APP_ONLY: { icon: IconName; title: string; desc: string }[] = [
  {
    icon: 'camera',
    title: 'Camera capture for verification',
    desc: 'Sellers photograph their national ID and take a live selfie in the app. That check has to happen on a device with a camera, so it lives there.',
  },
  {
    icon: 'bell',
    title: 'Push notifications',
    desc: 'A price drop on a car you saved, a reply from our team, a new match for a saved search — the moment it happens rather than the next time you visit.',
  },
  {
    icon: 'user',
    title: 'One account, both places',
    desc: 'Saved cars, saved searches, purchase requests and your whole history are the same on the web and in the app. Sign in once on each.',
  },
]

function PhoneMock() {
  return (
    <div aria-hidden className="mx-auto w-[264px] select-none">
      <div className="rounded-[2.5rem] border-[9px] border-ink-900 bg-surface shadow-float">
        <div className="rounded-[1.9rem] bg-surface-page px-3 pb-5 pt-3">
          {/* speaker slot */}
          <div className="mx-auto h-1 w-12 rounded-pill bg-line" />

          <div className="mt-4 flex items-center gap-2">
            <LogoMark size={22} />
            <span className="text-[12px] font-extrabold text-content">Inzozi Motors</span>
            <span className="ml-auto text-content-muted">
              <Icon name="bell" size={15} />
            </span>
          </div>

          {/* abstracted listing card */}
          <div className="mt-3 overflow-hidden rounded-2xl border border-line-soft bg-surface shadow-card">
            <div className="relative flex aspect-[4/3] items-center justify-center bg-surface-alt">
              <Icon name="car" size={52} className="text-content-muted opacity-50" />
              <div className="absolute left-2.5 top-2.5">
                <Badge tone="certPlus" icon="shield-check">
                  Certified+
                </Badge>
              </div>
            </div>
            <div className="space-y-2 p-3">
              <div className="h-2.5 w-3/4 rounded-pill bg-line" />
              <div className="h-2 w-1/2 rounded-pill bg-line-soft" />
              <div className="flex items-center gap-1.5 pt-1 text-[10px] font-bold text-content-muted">
                <Icon name="document" size={12} />
                150-point report attached
              </div>
            </div>
          </div>

          {/* the two things a browser tab cannot do */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 rounded-xl border border-line-soft bg-surface px-3 py-2.5">
              <Icon name="trending-down" size={14} className="text-content-muted" />
              <span className="text-[10px] font-bold text-content">Price drop on a saved car</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-line-soft bg-surface px-3 py-2.5">
              <Icon name="camera" size={14} className="text-content-muted" />
              <span className="text-[10px] font-bold text-content">ID verification · take a selfie</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AppShowcase() {
  return (
    <Section tone="surface">
      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <PhoneMock />

          <div>
            <p className="mb-3 text-eyebrow font-bold uppercase text-brand">The app</p>
            <h2 className="text-headline font-extrabold text-content">
              Everything works on the web. The app adds a camera and a tap on the shoulder.
            </h2>
            <p className="mt-4 max-w-prose text-[17px] leading-relaxed text-content-secondary">
              Browsing, full inspection reports, saved cars and searches, purchase requests and
              your entire account work here in the browser. Two things genuinely need a phone.
            </p>

            <ul className="mt-9 space-y-6">
              {APP_ONLY.map((item) => (
                <li key={item.title} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-alt text-content-secondary">
                    <Icon name={item.icon} size={18} />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-extrabold text-content">{item.title}</h3>
                    <p className="mt-1.5 max-w-prose text-[14px] leading-relaxed text-content-secondary">
                      {item.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <StoreButtons className="mt-9" />
          </div>
        </div>
      </Container>
    </Section>
  )
}

export default AppShowcase
