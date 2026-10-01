import { NextResponse } from 'next/server'
import { ApiError, koreaCatalog } from '@/lib/api'

// GET /api/imports/korea/:id/reports — the Korean inspection report and
// accident record, fetched after the page has rendered so the car's photos and
// price never wait on the provider.
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  try {
    return NextResponse.json(await koreaCatalog.reports(id), { headers: { 'Cache-Control': 'public, max-age=60' } })
  } catch (error) {
    const status = error instanceof ApiError && error.status === 404 ? 404 : 502
    return NextResponse.json({ error: 'Could not load the reports.' }, { status })
  }
}
