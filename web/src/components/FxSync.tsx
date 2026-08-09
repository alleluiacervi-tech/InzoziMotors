'use client'

import { setRwfRate } from '@/lib/business'

// Pushes the server-fetched USD⇄RWF rate into the CLIENT bundle's copy of
// lib/business.ts. Server components get the rate because the root layout
// calls setRwfRate before rendering; client components ('use client' tools,
// dashboard editors) run from a separate module instance that would otherwise
// sit on the built-in fallback forever. Rendering this once in the layout
// closes that gap.
//
// Called during render on purpose — an effect would leave the first client
// paint formatted on the fallback and then re-render. Setting a module
// variable is idempotent and render-safe.
export function FxSync({ rate }: { rate: number }) {
  setRwfRate(rate)
  return null
}

export default FxSync
