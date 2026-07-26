import Link from 'next/link'
import { Container, Icon, Section, SectionHeading } from '@/components/ui'
import { LISTING_PIPELINE, PipelineModules } from '@/components/marketing/PipelineModules'

// The pipeline as numbered modules on one dashed line — the offline handover
// is a first-class node, not an apology. Shared grammar with /sell and
// /how-it-works via PipelineModules.

export function HowItWorks() {
  return (
    <Section tone="surface">
      <Container>
        <SectionHeading
          eyebrow="How it works"
          title="From a seller’s driveway to your hands, in five steps"
          description="Nothing here happens out of sight. Every step in the middle is done by our team, at our centers, on the record."
        />

        <div className="mt-12">
          <PipelineModules steps={LISTING_PIPELINE} />
        </div>

        <p className="mt-10 text-body text-content-secondary">
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
