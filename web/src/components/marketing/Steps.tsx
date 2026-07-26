// The two ways this site draws a sequence.
//
// Both take the step arrays straight out of lib/site.ts (BUYING_STEPS,
// SELLING_STEPS) so the journey a customer reads on the web is the journey the
// app describes. Numbers are ink, never brand red — a step index is not an
// action.

export type Step = { title: string; desc: string }

/** Vertical, connected. Used where the order genuinely is a timeline. */
export function StepTimeline({ steps }: { steps: readonly Step[] }) {
  return (
    <ol className="mt-10">
      {steps.map((step, i) => (
        <li key={step.title} className="relative flex gap-5 pb-9 last:pb-0">
          {i < steps.length - 1 ? (
            <span
              aria-hidden
              className="absolute bottom-0 left-[19px] top-11 w-px bg-line"
            />
          ) : null}

          <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-ink-900 text-caption font-extrabold tabular-nums text-white">
            {i + 1}
          </span>

          <div className="pt-1.5">
            <h3 className="text-title-sm font-extrabold text-content">{step.title}</h3>
            <p className="mt-2 max-w-prose text-body leading-relaxed text-content-secondary">
              {step.desc}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}

/** Scannable grid. The hairlines come from a 1px gap over a tinted parent. */
export function StepGrid({ steps }: { steps: readonly Step[] }) {
  return (
    <ol className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-line-soft bg-line-soft sm:grid-cols-2 lg:grid-cols-3">
      {steps.map((step, i) => (
        <li key={step.title} className="bg-surface p-6 sm:p-8">
          <span className="text-caption font-extrabold tabular-nums tracking-[0.1em] text-content-muted">
            {String(i + 1).padStart(2, '0')}
          </span>
          <h3 className="mt-3 text-title-sm font-extrabold text-content">{step.title}</h3>
          <p className="mt-2 text-caption leading-relaxed text-content-secondary">{step.desc}</p>
        </li>
      ))}
    </ol>
  )
}
