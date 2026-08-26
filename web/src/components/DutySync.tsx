'use client'

import { setDutyRates, type DutyRates } from '@/lib/business'

// Pushes the server-held import duty schedule into the CLIENT bundle's copy of
// lib/business.ts, exactly as FxSync does for the exchange rate and for the
// same reason: the root layout's setDutyRates only reaches server components,
// and the duty calculator is a client component running from a separate module
// instance that would otherwise sit on the built-in fallback forever.
//
// Called during render on purpose. An effect would paint the first result on
// the fallback schedule and then correct itself, which on a page of tax figures
// is worse than a moment's wait. Setting a module variable is idempotent.
export function DutySync({ rates }: { rates: DutyRates | null }) {
  setDutyRates(rates)
  return null
}

export default DutySync
