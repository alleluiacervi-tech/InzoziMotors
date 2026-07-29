import { Badge, Container, Eyebrow, Icon, Section } from '@/components/ui'
import { LogoMark } from '@/components/brand/Logo'
import { StoreButtons } from '@/components/app/StoreButtons'
import { AppCapabilities } from '@/components/app/AppCapabilities'

// There are no screenshot assets in this repo, and shipping an invented one
// would be a lie about a product a visitor can download in thirty seconds. So
// the device is drawn from the same primitives the real app uses — and its
// listing card carries REAL typographic content (a representative title, a red
// price, the Certified+ badge) so it reads as the product, not a loading state.
//
// The whole illustration is aria-hidden; the copy beside it is the accessible
// version of the same message.

function PhoneMock() {
  return (
    <div aria-hidden className="mx-auto w-[264px] select-none">
      <div className="rounded-[2.5rem] border-[9px] border-ink-900 bg-surface shadow-float">
        <div className="rounded-[1.9rem] bg-surface-page px-3 pb-5 pt-3">
          {/* speaker slot */}
          <div className="mx-auto h-1 w-12 rounded-pill bg-line" />

          <div className="mt-4 flex items-center gap-2">
            <LogoMark size={22} />
            <span className="text-micro font-extrabold text-content">Inzozi Motors</span>
            <span className="ml-auto text-content-muted">
              <Icon name="bell" size={15} />
            </span>
          </div>

          {/* miniature listing card — real content at reduced scale */}
          <div className="mt-3 overflow-hidden rounded-2xl border border-line-soft bg-surface shadow-card">
            <div className="relative flex aspect-[4/3] items-center justify-center bg-surface-alt">
              <Icon name="car" size={52} className="text-content-muted opacity-50" />
              <div className="absolute left-2.5 top-2.5">
                <Badge tone="certPlus" icon="shield-check">
                  Certified+
                </Badge>
              </div>
            </div>
            <div className="p-3">
              <p className="text-micro font-extrabold text-content">2020 Toyota RAV4 · automatic</p>
              <p className="mt-0.5 text-caption font-extrabold text-brand">$26,000</p>
              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold text-content-muted">
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
            <Eyebrow>The app</Eyebrow>
            <h2 className="text-headline font-extrabold text-content">
              Everything works on the web. The app adds a camera and a tap on the shoulder.
            </h2>
            <p className="mt-4 max-w-prose text-title-sm leading-relaxed text-content-secondary">
              Browse, save, request and manage everything right here. Two things need a
              camera — finish those in the app.
            </p>

            <AppCapabilities className="mt-9" />

            <StoreButtons className="mt-9" />
          </div>
        </div>
      </Container>
    </Section>
  )
}

export default AppShowcase
