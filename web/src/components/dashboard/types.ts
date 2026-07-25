// Shared shape for every dashboard Server Action.
//
// Kept in its own module with no runtime imports so a client component can
// `import type` it without dragging server-only code into the browser bundle.

export type ActionState = {
  ok?: boolean
  /** Confirmation copy shown after a successful mutation. */
  message?: string
  /** Whole-form failure. */
  error?: string
  /** Per-input failures, keyed by the input's name. */
  fieldErrors?: Record<string, string>
} | null
