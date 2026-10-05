import type { NextRequest } from 'next/server'
import { complete, failure, readState } from '@/lib/oauth-flow'

// POST /api/auth/oauth/apple/callback — Apple's form_post.
//
// Fields: state, code, id_token, and on the very first authorization only,
// `user` (JSON with the person's name). Apple never sends the name again, so
// it is passed on now or lost.
export async function POST(req: NextRequest) {
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return failure('failed')
  }
  const error = form.get('error')
  if (error) return failure(error === 'user_cancelled_authorize' ? 'cancelled' : 'failed', '/dashboard', 'apple')

  const flow = readState(req, 'apple', typeof form.get('state') === 'string' ? String(form.get('state')) : null)
  if (!flow) return failure('expired', '/dashboard', 'apple')
  const idToken = form.get('id_token')
  if (typeof idToken !== 'string' || !idToken) return failure('failed', flow.next, 'apple')

  let fullName: string | null = null
  const userJson = form.get('user')
  if (typeof userJson === 'string') {
    try {
      const parsed = JSON.parse(userJson) as { name?: { firstName?: string; lastName?: string } }
      fullName = [parsed.name?.firstName, parsed.name?.lastName].filter(Boolean).join(' ') || null
    } catch {
      // A malformed name is not worth failing a sign-in over.
    }
  }
  const code = form.get('code')
  return complete('apple', flow, {
    id_token: idToken,
    full_name: fullName,
    authorization_code: typeof code === 'string' ? code : null,
  })
}
