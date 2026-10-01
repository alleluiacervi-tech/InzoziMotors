import { NextResponse, type NextRequest } from 'next/server'
import { koreaCatalog } from '@/lib/api'

// GET /api/imports/korea — the next page of Korean cars, for "Show more".
//
// The browser cannot call the API's own origin (its address is a server-side
// setting), so the grid asks this route, which passes only the filters the API
// understands and nothing else.
export const dynamic = 'force-dynamic'

const ALLOWED = ['make', 'model', 'fuel', 'transmission', 'min_year', 'max_year', 'max_mileage', 'min_price_usd', 'max_price_usd', 'q', 'sort', 'cursor', 'limit']

export async function GET(request: NextRequest) {
  const query: Record<string, string> = {}
  for (const key of ALLOWED) {
    const value = request.nextUrl.searchParams.get(key)
    if (value) query[key] = value.slice(0, 200)
  }
  try {
    return NextResponse.json(await koreaCatalog.list(query), { headers: { 'Cache-Control': 'public, max-age=60' } })
  } catch {
    return NextResponse.json({ error: 'Could not load cars.' }, { status: 502 })
  }
}
