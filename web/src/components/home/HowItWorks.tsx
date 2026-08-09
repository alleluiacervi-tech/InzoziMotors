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
          title="Driveway to handover, in five steps"
          description="Every step in the middle is done by our team, on the record."
        />

        <div className="mt-12">
          {/* Five equal columns. Step 5 used to carry the row's only image —
              "the visual anchor" in theory, but on screen it left four text
              columns dangling over a void next to one photo, and the image was
              a concept render anyway. Equal treatment reads as a process;
              one decorated node reads as unfinished. */}
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
