import Link from 'next/link'
import { Container, Icon, Section, SectionHeading } from '@/components/ui'
import { StepGrid } from '@/components/marketing/Steps'
import { BUYING_STEPS } from '@/lib/site'

export function HowItWorks() {
  return (
    <Section tone="surface">
      <Container>
        <SectionHeading
          eyebrow="How buying works"
          title="Six steps, and none of them involve paying online"
          description="You request the car, we arrange the handover, and money changes hands in person at a center — with both parties, both sets of documents and our team in the room."
        />

        <StepGrid steps={BUYING_STEPS} />

        <p className="mt-8 text-[15px] text-content-secondary">
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-1.5 font-bold text-brand hover:underline"
          >
            Refund conditions, what to bring, and how selling works
            <Icon name="arrow-right" size={16} />
          </Link>
        </p>
      </Container>
    </Section>
  )
}

export default HowItWorks
