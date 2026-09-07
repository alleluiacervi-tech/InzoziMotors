import { NextResponse } from 'next/server'
import { fx } from '@/lib/api'

// GET /api/fx — the same rate the layout renders with, for the browser.
//
// Client components cannot call the API's own origin directly (the base URL is
// a server-side env var, and keeping it that way is what stops the browser from
// ever needing to know where the API lives). This is the ordinary route-handler
// pattern the rest of the site uses for client fetches.
//
// No caching here: the browser asks for this at most once an hour, and the
// point of asking is to find out whether the figure has moved. `fx.get` already
// carries its own cache and never throws — a provider outage answers with the
// last known good rate, flagged stale.
export const dynamic = 'force-dynamic'

export async function GET() {
  const rate = await fx.get()
  return NextResponse.json(rate, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
