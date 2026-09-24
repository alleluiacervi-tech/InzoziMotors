// The pure half of translation: look a dot-path up in a message tree and fill
// {{name}} placeholders. No catalogue is imported here, so this file is safe to
// pull into the client bundle — the catalogue itself (dictionary.ts, every
// string in six languages) stays on the server.

export type Messages = Record<string, unknown>

export type TFunction = (key: string, vars?: Record<string, string | number>) => string

export function lookup(source: Messages | undefined, key: string): string | undefined {
  if (!source) return undefined
  const value = key.split('.').reduce<unknown>(
    (acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined),
    source,
  )
  return typeof value === 'string' ? value : undefined
}

export function fill(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_m, name) =>
    vars[name] == null ? `{{${name}}}` : String(vars[name]),
  )
}

/** Deep-merge `over` onto `base`: the active language wins per string, English
 *  fills whatever it has not translated yet. */
export function mergeMessages(base: unknown, over: unknown): unknown {
  if (!over || typeof over !== 'object') return over ?? base
  if (!base || typeof base !== 'object') return over
  const out: Messages = { ...(base as Messages) }
  for (const [k, v] of Object.entries(over as Messages)) {
    out[k] = mergeMessages((base as Messages)[k], v)
  }
  return out
}
