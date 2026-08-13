// Same-origin. Requests go to this Next server, which attaches the JWT from an
// httpOnly cookie and forwards them (src/app/api/backend/[...path]/route.ts).
//
// The token used to live in localStorage and be attached here, in the browser —
// meaning any injected script could read the most privileged credential in the
// system. Nothing in this file touches a token now, and every call site below
// is unchanged, because only the base URL moved.
const BASE = '/api/backend'

// ─── Is the API actually answering? ──────────────────────────────────────────
// The header used to render a green dot and the words "Connected to live API"
// as static markup. It said connected while every request on the page was
// failing, which is the worst kind of status indicator: one that can only ever
// report good news.
//
// Every request updates this, so the claim is derived from real outcomes. A 4xx
// counts as CONNECTED — the API answered, it just refused — while a network
// throw or a 502/504 from the proxy (which returns exactly that when it cannot
// reach the backend) counts as unreachable.
export type ApiStatus = 'unknown' | 'ok' | 'unreachable'

let apiStatus: ApiStatus = 'unknown'
const statusListeners = new Set<(s: ApiStatus) => void>()

function setApiStatus(next: ApiStatus) {
  if (next === apiStatus) return
  apiStatus = next
  statusListeners.forEach((l) => l(next))
}

export function getApiStatus(): ApiStatus {
  return apiStatus
}

/** Subscribe to API reachability. Returns an unsubscribe function. */
export function onApiStatus(cb: (s: ApiStatus) => void): () => void {
  statusListeners.add(cb)
  return () => statusListeners.delete(cb)
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string> | undefined),
  }
  if (!(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...opts,
      headers,
      // The cookie is httpOnly but still same-origin; this makes the intent explicit.
      credentials: 'same-origin',
    })
  } catch (e) {
    // fetch only rejects on a genuine network failure — no response at all.
    setApiStatus('unreachable')
    const error = new Error('Could not reach the dashboard server.') as ApiError
    error.status = 0
    error.code = 'NETWORK'
    throw error
  }

  // 502/504 is this app's own proxy reporting it could not reach the backend.
  setApiStatus(res.status === 502 || res.status === 504 ? 'unreachable' : 'ok')

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    // 401 means the session is gone (expired, revoked, signed out elsewhere).
    // Surfacing it as a typed error lets the layout bounce to /login rather
    // than each page inventing its own handling.
    const error = new Error(err.error || res.statusText) as ApiError
    error.status = res.status
    // Structured refusals carry more than a sentence: the contract endpoints
    // return a machine-readable `code`, a per-field `errors` list (422), and the
    // conflicting row (409 CONTRACT_EXISTS). A form that maps those onto its own
    // inputs needs them here — dropping them would cost a second round trip.
    if (err.code) error.code = err.code
    if (err.errors) error.errors = err.errors
    if (err.contract) error.contract = err.contract
    if (err.contract_number) error.contract_number = err.contract_number
    throw error
  }
  return res.json()
}

// ─── Inspection centers ──────────────────────────────────────────────────────

export type CenterRow = {
  id: string
  name: string
  area: string | null
  address: string | null
  daily_capacity: number
  active: boolean
  /** Live bookings today, counted the same way the scheduler counts them — so
   *  this is the number that will actually gate the next booking. */
  booked_today: number
  upcoming: number
  all_time: number
}

// ─── Reported messages ───────────────────────────────────────────────────────

export type MessageReport = {
  id: string
  reason: string
  status: 'open' | 'resolved' | 'dismissed'
  created_at: string
  conversation_id: string
  message_id: string | null
  buyer_id: string
  seller_id: string
  reporter_id: string
  reporter_name: string
  reporter_email: string
  /** Who the report is ABOUT — the message author, or the other party in the
   *  thread when no specific message was named. */
  accused_id: string
  message_sender_name: string | null
  message_text: string | null
  message_sent_at: string | null
  buyer_name: string | null
  seller_name: string | null
  car_title: string | null
  car_id: string | null
  /** True when the reporter already blocked them, so the urgent part is handled. */
  reporter_has_blocked: boolean
}

export type ReviewReport = {
  id: string
  review_id: string
  reason: string
  status: 'open' | 'resolved' | 'dismissed'
  created_at: string
  rating: number
  comment: string | null
  removed_at: string | null
  seller_id: string
  reporter_name: string
  author_name: string
  seller_name: string
}

export type ReportThreadMessage = {
  id: string
  sender_id: string
  sender_name: string
  text: string
  created_at: string
  is_reported: boolean
}

// ─── Mailbox shapes ──────────────────────────────────────────────────────────

export type MailAddress = { name: string; address: string }

export type MailEnvelope = {
  uid: number
  subject: string
  from: MailAddress
  to: MailAddress[]
  date: string | null
  unread: boolean
  answered: boolean
  flagged: boolean
  size: number
  sizeLabel: string
  attachmentCount: number
  messageId: string | null
}

export type MailFolderKey = 'inbox' | 'sent' | 'drafts' | 'junk' | 'trash'
export type MailFolder = { key: MailFolderKey; total: number; unread: number }

export type MailList = {
  messages: MailEnvelope[]
  total: number
  unread: number
  limit: number
  offset: number
  mailbox: string
  search?: string
}

export type MailAttachment = {
  index: number
  filename: string
  contentType: string
  size: number
  sizeLabel: string
  cid: string | null
  inline: boolean
}

export type MailMessage = {
  uid: number
  subject: string
  from: MailAddress
  to: MailAddress[]
  cc: MailAddress[]
  date: string | null
  messageId: string | null
  /** Already sanitised server-side. Still rendered in a sandboxed iframe — see
   *  MessageBody.tsx for why one layer is not enough. */
  bodyHtml: string
  blockedImages: number
  hasHtml: boolean
  attachments: MailAttachment[]
}

/** What a failed request() throws. `status` is always set; the rest only when
 *  the backend sent a structured refusal. */
export type ApiError = Error & {
  status?: number
  code?: string
  errors?: { field: string; label: string; problem: string }[]
  contract?: any
  contract_number?: string
}

/** Sign in. Credentials go to this app's own route handler, never to the
 *  backend directly, so the resulting token stays server-side. */
export async function signIn(email: string, password: string): Promise<void> {
  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'same-origin',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Sign-in failed')
  }
}

/** Adopt a token handed over from the public website's /admin-portal route.
 *  It is verified against the backend before any cookie is written. */
export async function adoptToken(token: string): Promise<void> {
  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
    credentials: 'same-origin',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'That sign-in link has expired.')
  }
}

export async function signOut(): Promise<void> {
  await fetch('/api/session', { method: 'DELETE', credentials: 'same-origin' })
}

export const api = {
  // Auth — sign-in is NOT here: it goes through signIn() above, which posts to
  // this app's own /api/session so the token never reaches the browser.
  me: () => request<any>('/auth/me'),

  // Dashboard
  stats:     () => request<any>('/admin/stats'),
  analytics: () => request<any>('/admin/analytics'),
  search: (q: string) => request<{ results: { kind: string; id: string; title: string; detail: string; href: string }[] }>(`/admin/search?q=${encodeURIComponent(q)}`),
  activity: () => request<{ kind: string; title: string; detail: string; happened_at: string; href: string }[]>('/admin/activity'),

  // Submissions
  submissions: (status?: string) =>
    request<any[]>(`/submissions/admin/all${status ? `?status=${status}` : ''}`),
  updateSubmission: (id: string, data: any) =>
    request<any>(`/submissions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Inspections
  inspections: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<any[]>(`/inspections${q}`)
  },
  getInspection:      (id: string) => request<any>(`/inspections/${id}`),
  completeInspection: (id: string, data: any) =>
    request<any>(`/inspections/${id}/complete`, { method: 'POST', body: JSON.stringify(data) }),

  // Handovers
  handovers: (status = 'pending') =>
    request<any[]>(`/handovers?status=${status}`),
  confirmHandover: (id: string, data: any = {}) =>
    request<any>(`/handovers/${id}/confirm`, { method: 'PATCH', body: JSON.stringify(data) }),
  completeHandover: (id: string) =>
    request<any>(`/handovers/${id}/complete`, { method: 'PATCH' }),
  updateCar: (id: string, data: any) =>
    request<any>(`/cars/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Contracts — the sale agreement. Every route is admin-only.
  //
  // The PDF itself is deliberately absent from this object: request() always
  // parses the response as JSON, and a contract file is a binary stream. It is
  // opened as a plain link to /api/backend/contracts/<id>/file (add ?download=1
  // to force a save-as), which the same httpOnly cookie authenticates.
  contractPrefill: (handoverId: string) =>
    request<any>(`/contracts/handover/${handoverId}/prefill`),
  generateContract: (handoverId: string, payload: any) =>
    request<any>(`/contracts/handover/${handoverId}`, {
      method: 'POST', body: JSON.stringify(payload),
    }),
  handoverContract: (handoverId: string) =>
    request<any>(`/contracts/handover/${handoverId}`),
  markContractSigned: (id: string) =>
    request<any>(`/contracts/${id}/signed`, { method: 'PATCH' }),
  supersedeContract: (id: string, reason: string) =>
    request<any>(`/contracts/${id}/supersede`, {
      method: 'POST', body: JSON.stringify({ reason }),
    }),
  contracts: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<any[]>(`/contracts${q}`)
  },

  // Disputes — the 7-day return guarantee queue
  disputes: (status?: string) =>
    request<any[]>(`/disputes${status ? `?status=${status}` : ''}`),
  resolveDispute: (id: string, data: { status: 'resolved' | 'rejected'; resolution: string }) =>
    request<any>(`/disputes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Listings — admin-only route that accepts any status
  cars: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<any[]>(`/admin/listings${q}`)
  },
  getCar: (id: string) => request<any>(`/cars/${id}`),
  updateCarStatus: (id: string, status: string) =>
    request<any>(`/cars/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Users / ID verification
  searchUsers: (q: string, limit = 8) =>
    request<any[]>(`/admin/users?q=${encodeURIComponent(q)}&limit=${limit}`),
  idVerificationQueue: () => request<any[]>('/id-verification/queue'),
  decideVerification:  (userId: string, decision: string) =>
    request<any>(`/id-verification/${userId}`, {
      method: 'PATCH', body: JSON.stringify({ decision }),
    }),

  // Trust score
  trustScore: (userId: string) => request<any>(`/reviews/trust-score/${userId}`),

  // Cars creation & photo uploads
  createCar: (data: any) =>
    request<any>('/cars', { method: 'POST', body: JSON.stringify(data) }),
  uploadCarPhotos: (carId: string, formData: FormData) =>
    request<any>(`/inspections/cars/${carId}/photos`, { method: 'POST', body: formData }),
  getCarPhotos: (carId: string) =>
    request<any>(`/inspections/cars/${carId}/photos`),
  setCarPhotoCover: (carId: string, photoId: string) =>
    request<any>(`/inspections/cars/${carId}/photos/${photoId}/cover`, { method: 'PATCH' }),
  deleteCarPhoto: (carId: string, photoId: string) =>
    request<any>(`/inspections/cars/${carId}/photos/${photoId}`, { method: 'DELETE' }),

  // Fees / revenue
  // `totals` is expressed in ONE currency — the dominant one, named in
  // `currencies`. totalsByCurrency carries every currency present, because a
  // database part-way through the RWF conversion holds both and a single
  // summed figure would be money in neither.
  getFees: (status?: string) =>
    request<{
      fees: any[]
      totals: Record<string, number>
      totalsByCurrency?: Record<string, Record<string, number>>
      currencies?: string[]
    }>(`/admin/fees${status ? `?status=${status}` : ''}`),
  updateFee: (id: string, status: 'paid' | 'waived' | 'due') =>
    request<any>(`/admin/fees/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Featured listings
  featureCar: (id: string, days = 7) =>
    request<any>(`/cars/${id}/feature`, { method: 'PATCH', body: JSON.stringify({ days }) }),

  // ── Inspection centers ─────────────────────────────────────────────────────
  // Booking capacity is enforced against daily_capacity on every scheduling
  // request, so this is the difference between changing a centre's capacity in a
  // form and doing it with a hand-written UPDATE on production.
  centers: () => request<CenterRow[]>('/centers'),
  createCenter: (data: Partial<CenterRow>) =>
    request<CenterRow>('/centers', { method: 'POST', body: JSON.stringify(data) }),
  updateCenter: (id: string, data: Partial<CenterRow>) =>
    request<CenterRow>(`/centers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  /** Deactivates rather than deletes — see routes/centers.js. */
  deactivateCenter: (id: string) =>
    request<CenterRow & { pending_inspections: number }>(`/centers/${id}`, { method: 'DELETE' }),

  // ── Reported messages ──────────────────────────────────────────────────────
  reports: (status: 'open' | 'resolved' | 'dismissed' | 'all' = 'open') =>
    request<MessageReport[]>(`/messages/admin/reports?status=${status}`),
  reportThread: (id: string) =>
    request<{ conversation_id: string; reported_message_id: string | null; messages: ReportThreadMessage[] }>(
      `/messages/admin/reports/${id}/thread`
    ),
  reviewReports: (status: 'open' | 'resolved' | 'dismissed' | 'all' = 'open') =>
    request<ReviewReport[]>(`/reviews/admin/reports?status=${status}`),
  closeReviewReport: (id: string, status: 'resolved' | 'dismissed') =>
    request<ReviewReport>(`/reviews/admin/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  /** Admin takedown — soft-hides the review and resolves its open reports. */
  removeReview: (id: string, reason: string) =>
    request<{ success: boolean }>(`/reviews/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
  closeReport: (id: string, status: 'resolved' | 'dismissed') =>
    request<MessageReport>(`/messages/admin/reports/${id}`, {
      method: 'PATCH', body: JSON.stringify({ status }),
    }),

  // ── The contact@ mailbox ───────────────────────────────────────────────────
  // Read over IMAP on the server; the browser never touches the mail host and
  // never sees the mailbox password. Attachments are NOT here: request() parses
  // every response as JSON, and an attachment is a binary stream — it is fetched
  // as a plain link to /api/backend/mail/... which the same httpOnly cookie
  // authenticates, exactly like the contract PDF.
  mail: (params?: {
    limit?: number; offset?: number; q?: string
    folder?: MailFolderKey; starred?: boolean
  }) => {
    const q = new URLSearchParams()
    if (params?.limit) q.set('limit', String(params.limit))
    if (params?.offset) q.set('offset', String(params.offset))
    if (params?.q) q.set('q', params.q)
    if (params?.folder && params.folder !== 'inbox') q.set('folder', params.folder)
    if (params?.starred) q.set('starred', '1')
    const qs = q.toString()
    return request<MailList>(`/mail/messages${qs ? `?${qs}` : ''}`)
  },
  mailUnread: () => request<{ unread: number; total: number }>('/mail/unread'),
  /** The folder rail — which standard folders this account has, with counts. */
  mailFolders: () => request<{ folders: MailFolder[] }>('/mail/folders'),
  /** `images` opts in to loading remote images — off by default because a remote
   *  image in mail is a tracking pixel that confirms a human opened it.
   *  IMAP uids are per-folder, so the folder always travels with the uid. */
  mailMessage: (uid: number, opts?: { images?: boolean; peek?: boolean; folder?: MailFolderKey }) => {
    const q = new URLSearchParams()
    if (opts?.images) q.set('images', '1')
    if (opts?.peek) q.set('peek', '1')
    if (opts?.folder && opts.folder !== 'inbox') q.set('folder', opts.folder)
    const qs = q.toString()
    return request<MailMessage>(`/mail/messages/${uid}${qs ? `?${qs}` : ''}`)
  },
  mailFlag: (uid: number, flag: 'seen' | 'flagged', value: boolean, folder: MailFolderKey = 'inbox') =>
    request<{ ok: true }>(`/mail/messages/${uid}/flags`, {
      method: 'PATCH', body: JSON.stringify({ flag, value, folder }),
    }),
  mailMove: (uid: number, destination: MailFolderKey, folder: MailFolderKey = 'inbox') =>
    request<{ ok: true; destination: MailFolderKey }>(`/mail/messages/${uid}/move`, {
      method: 'POST', body: JSON.stringify({ destination, folder }),
    }),
  /** Reply with optional attachments. FormData when files ride along —
   *  request() already skips the JSON content-type for FormData bodies. */
  mailReply: (uid: number, text: string, files: File[] = []) => {
    if (!files.length) {
      return request<{ messageId?: string; to: string; subject: string }>(
        `/mail/messages/${uid}/reply`, { method: 'POST', body: JSON.stringify({ text }) }
      )
    }
    const form = new FormData()
    form.set('text', text)
    for (const f of files) form.append('attachments', f, f.name)
    return request<{ messageId?: string; to: string; subject: string }>(
      `/mail/messages/${uid}/reply`, { method: 'POST', body: form }
    )
  },
  mailCompose: (to: string, subject: string, text: string, files: File[] = []) => {
    const form = new FormData()
    form.set('to', to)
    form.set('subject', subject)
    form.set('text', text)
    for (const f of files) form.append('attachments', f, f.name)
    return request<{ messageId?: string; to: string; subject: string }>(
      '/mail/messages', { method: 'POST', body: form }
    )
  },

  // Rental fleet (rental_cars) — money fields are whole Rwandan francs
  rentalCars:    () => request<any[]>('/rentals'),
  getRentalCar:  (id: string) => request<any>(`/rentals/${id}`),
  createRentalCar: (data: any) =>
    request<any>('/rentals', { method: 'POST', body: JSON.stringify(data) }),
  updateRentalCar: (id: string, data: any) =>
    request<any>(`/rentals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Rental bookings
  getRentalBookings: (status?: string) =>
    request<any[]>(`/rentals/bookings${status ? `?status=${status}` : ''}`),
  updateRentalBookingStatus: (id: string, status: 'active' | 'completed' | 'cancelled') =>
    request<any>(`/rentals/bookings/${id}/status`, {
      method: 'PATCH', body: JSON.stringify({ status }),
    }),
}
