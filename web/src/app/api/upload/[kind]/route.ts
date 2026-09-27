import { NextResponse } from 'next/server'
import { API_URL } from '@/lib/api'
import { getToken } from '@/lib/session'

// ─────────────────────────────────────────────────────────────────────────────
// The one place browser JavaScript ever sends a file (D1 in
// docs/WEB-PARITY-PLAN.md). A Server Action would refuse anything over 1 MB
// (Next's default, sized for form fields, not photographs), so uploads go
// through this route handler instead — no such limit applies here. It reads
// the cookie server-side and attaches it as the one request's Bearer header,
// exactly like /api/documents/[id]/route.ts does for downloads, so the
// session token still never reaches the browser.
//
// Each "kind" maps to exactly one backend multipart endpoint and mirrors that
// endpoint's own multer limits (backend/src/middleware/upload.js) so a file
// that would be rejected upstream is rejected here with the same shape of
// error, before it is ever sent over the wire. Nothing about the file's bytes
// is logged — an ID photograph must never appear in an access log.
//
// Adding a kind (e.g. Phase 2's submission reference photos) means adding one
// entry below and, on the backend, the multipart route it points at — never
// widening this route into a general-purpose proxy.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

interface UploadKind {
  /** Backend path this kind forwards to, verbatim. */
  path: string
  /** Field names the backend route accepts; anything else is dropped. */
  fields: readonly string[]
  maxFiles: number
  maxBytesPerFile: number
}

const KINDS: Record<string, UploadKind> = {
  // POST /id-verification (backend/src/routes/id-verification.js) — ID front,
  // ID back, selfie. Deliberately not recompressed on either side (D4): an
  // identity document is evidence, not a thumbnail.
  id: {
    path: '/id-verification',
    fields: ['id_front', 'id_back', 'selfie'],
    maxFiles: 3,
    maxBytesPerFile: 5 * 1024 * 1024,
  },
}

type Ctx = { params: Promise<{ kind: string }> }

export async function POST(request: Request, ctx: Ctx): Promise<Response> {
  const { kind } = await ctx.params
  const config = KINDS[kind]
  if (!config) {
    return NextResponse.json({ error: 'Unknown upload kind.' }, { status: 404 })
  }

  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: 'Sign in to upload.' }, { status: 401 })
  }

  let incoming: FormData
  try {
    incoming = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Could not read the upload.' }, { status: 400 })
  }

  const outgoing = new FormData()
  let fileCount = 0
  for (const [field, value] of incoming.entries()) {
    if (!config.fields.includes(field) || !(value instanceof File)) continue
    fileCount += 1
    if (fileCount > config.maxFiles) {
      return NextResponse.json({ error: `At most ${config.maxFiles} files are allowed.` }, { status: 413 })
    }
    if (value.size > config.maxBytesPerFile) {
      return NextResponse.json(
        { error: `${field.replace(/_/g, ' ')} is larger than ${Math.round(config.maxBytesPerFile / (1024 * 1024))} MB.` },
        { status: 413 }
      )
    }
    outgoing.append(field, value, value.name)
  }
  if (!fileCount) {
    return NextResponse.json({ error: 'No file received.' }, { status: 400 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${API_URL}${config.path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: outgoing,
    })
  } catch {
    return NextResponse.json({ error: 'Could not reach Sawa Cars.' }, { status: 502 })
  }

  const data = await upstream.json().catch(() => ({}))
  return NextResponse.json(data, { status: upstream.status })
}
