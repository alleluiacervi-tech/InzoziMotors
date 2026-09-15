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

export type ActionCenterItem = {
  id: string
  kind: string
  priority: 'urgent' | 'attention' | 'routine'
  title: string
  detail: string
  href: string
  occurred_at: string | null
  age_hours: number
}

export type ActionCenterResponse = {
  generated_at: string
  summary: { total: number; urgent: number; attention: number; routine: number }
  items: ActionCenterItem[]
}

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

// ─── The vehicle journey ─────────────────────────────────────────────────────
// Seven stages from an unverified seller to a public listing, computed on the
// server from the workflow tables. `state` is where the work is; `actor` is who
// it waits on — and the second is what the operator actually sorts by.
export type JourneyActor = 'us' | 'seller' | 'clock' | 'none'
export type JourneyState = 'done' | 'active' | 'blocked' | 'locked'

export type JourneyBlocker = { label: string; fix: string | null }

export type JourneyStage = {
  key: string
  index: number
  label: string
  state: JourneyState
  actor: JourneyActor
  at: string | null
  age_hours: number | null
  detail: string
  blockers: JourneyBlocker[]
  href: string | null
}

export type Journey = {
  subject: { submission_id: string | null; inspection_id: string | null; car_id: string | null; seller_id: string | null }
  vehicle: { make: string | null; model: string | null; year: number | null; title: string }
  seller: { id: string; name: string; email: string; seller_type: string | null } | null
  complete: boolean
  stages_done: number
  stages_total: number
  current_stage: string | null
  actor: JourneyActor
  blocked: boolean
  age_hours: number | null
  stages: JourneyStage[]
}

export type JourneyBoard = {
  generated_at: string
  stages: { key: string; index: number; label: string }[]
  summary: {
    in_flight: number; waiting_on_us: number; waiting_on_seller: number
    blocked: number; live: number; published_this_week: number
  }
  truncated: boolean
  vehicles: Journey[]
}

export type Readiness = {
  ready: boolean
  missing: string[]
  /** Worth fixing, not worth refusing over — a thin description, a VIN of
   *  "N/A", a title that never mentions its own make. Advisory by design: a
   *  buyer cannot audit the 150-point rigour, but they can read a broken
   *  description, and they price the company from it. */
  warnings?: string[]
  photo_count: number
  min_photos: number
  inspection_required: boolean
  inspection: { id: string; version: string; score: number; passed: boolean; critical_failures: string[] } | null
}

/** The single place a dashboard request is made.
 *
 *  Returns the parsed body AND the Response, because a couple of endpoints put
 *  part of their answer in a header (X-Total-Count on the listings queue). The
 *  alternative — a hand-rolled fetch beside this one — silently loses the 401
 *  handling that bounces an expired session to /login and the unreachable-API
 *  banner, and loses them in precisely the circumstances they exist for. */
async function requestFull<T>(path: string, opts: RequestInit = {}): Promise<{ data: T; res: Response }> {
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
  // 204 and friends have no body; res.json() would throw on the empty string.
  const data = res.status === 204 || res.headers.get('content-length') === '0'
    ? (undefined as unknown as T)
    : await res.json()
  return { data, res }
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  return (await requestFull<T>(path, opts)).data
}


// ─── Account closures ────────────────────────────────────────────────────────

export type ClosedAccount = {
  id: string
  name: string
  email: string
  role: string
  closed_at: string
  purge_after: string
  closure_reason: string
  reason_label: string
  closure_note: string | null
  /** The thirty days are up and this account is waiting to be erased. */
  due_for_purge: boolean
}

// ─── Brands ──────────────────────────────────────────────────────────────────

export type MakeRow = {
  id: string
  name: string
  slug: string
  /** Other spellings that mean this brand — "vw", "benz", "range rover".
   *  Without them one brand's stock splits across several make values and every
   *  bucket looks emptier than it is. */
  aliases: string[]
  /** Null is the normal state. No brand mark is committed to the repository —
   *  they are third-party trademarks — so every client draws a lettermark until
   *  an operator uploads one. */
  logo_url: string | null
  display_order: number
  active: boolean
  /** Only present on the admin list. */
  listings?: number
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
  // Fee revenue by month and type — platform_fees (paid only) plus rental
  // listing subscriptions (their own table, always RWF). Distinct from
  // analytics' GMV figures: this is money Sawa itself actually received.
  revenue: () => request<{
    fees: { fee_type: string; month: string; currency: string; total: number; count: number }[]
    rental_subscriptions: { month: string; total: number; count: number }[]
    totals_by_type: { type: string; currency: string; total: number; count: number }[]
    gaps: {
      // Completed walk-ins with no live inspection fee — the one collection
      // gap this table can actually detect. See GET /admin/revenue.
      standalone_inspections_missing_fee: { id: string; vehicle_make: string | null; vehicle_model: string | null; vehicle_year: number | null; completed_at: string; customer_name: string | null }[]
    }
  }>('/admin/revenue'),
  actionCenter: () => request<ActionCenterResponse>('/admin/action-center'),
  search: (q: string) => request<{ results: { kind: string; id: string; title: string; detail: string; href: string }[] }>(`/admin/search?q=${encodeURIComponent(q)}`),
  activity: () => request<{ kind: string; title: string; detail: string; happened_at: string; href: string }[]>('/admin/activity'),
  auditLog: (params?: { q?: string; type?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams()
    if (params?.q) q.set('q', params.q)
    if (params?.type) q.set('type', params.type)
    if (params?.limit) q.set('limit', String(params.limit))
    if (params?.offset) q.set('offset', String(params.offset))
    return request<{
      id: string; action: string; target_type: string; target_id: string | null
      summary: string; metadata: Record<string, unknown>; created_at: string
      actor_name: string | null; actor_email: string | null
    }[]>(`/admin/audit-log?${q.toString()}`)
  },

  // Submissions
  submissions: (status?: string) =>
    request<any[]>(`/submissions/admin/all${status ? `?status=${status}` : ''}`),
  /** File an intake on a seller's behalf. `purpose` is what the vehicle is FOR
   *  — a rental operator should not have to file a sale submission for a van
   *  they never intend to sell. Returns the submission plus any warnings (e.g.
   *  the provider is not yet business-verified) so the gap gets closed while the
   *  car is still in the workshop. */
  createSubmission: (body: {
    // Either an existing account, or enough to create one for a walk-in who has
    // never used the app.
    seller_id?: string
    seller?: { name: string; email: string; phone?: string }
    make: string; model: string; year: number
    purpose?: 'sale' | 'rental' | 'both'
    mileage?: number | null; condition?: string | null; asking_price?: number | null
    fuel_type?: string | null; transmission?: string | null; body_type?: string | null
    color?: string | null; notes?: string | null
  }) => request<any & { warnings: string[] }>('/submissions/admin', {
    method: 'POST', body: JSON.stringify(body),
  }),
  updateSubmission: (id: string, data: any) =>
    request<any>(`/submissions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Inspections
  inspections: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<any[]>(`/inspections${q}`)
  },
  getInspection:      (id: string) => request<any>(`/inspections/${id}`),
  inspectionChecklist: () => request<any>('/inspections/checklist'),
  startInspection: (id: string) =>
    request<any>(`/inspections/${id}/start`, { method: 'POST' }),
  /** Save the work so far. Scores nothing, passes nothing, cannot touch a
   *  completed inspection — losing forty minutes to a dropped connection is
   *  what teaches an inspector to hurry. */
  saveChecklistDraft: (id: string, checklist_results: Record<string, string>) =>
    request<{ saved: true; recorded: number; remaining: number; checklist_attestations: Record<string, any> }>(
      `/inspections/${id}/checklist`,
      { method: 'PATCH', body: JSON.stringify({ checklist_results }) },
    ),
  /** Bulk-fill the non-critical items in one category as "pass" in a single
   *  action. The server decides which items that is (never a critical one),
   *  and records who did it and how many — this is a decision, not a tap, so
   *  unlike an individual save it lands in the audit log. */
  attestChecklistCategory: (id: string, category: string) =>
    request<{ saved: true; recorded: number; remaining: number; checklist_attestations: Record<string, any> }>(
      `/inspections/${id}/checklist`,
      { method: 'PATCH', body: JSON.stringify({ attest_category: category }) },
    ),
  inspectorStats: () => request<any[]>('/admin/inspectors'),

  /** Everything recorded about one vehicle, joined on the normalised VIN key.
   *  Refuses an identifier too short to join on rather than merging unrelated
   *  cars into one record. */
  vehicleHistory: (vin: string) =>
    request<{
      vin: { key: string | null; kind: 'iso' | 'chassis' | 'short' | 'none'; confident: boolean; note: string }
      inspections: any[]
      listings: any[]
      summary: {
        inspections: number; first_seen: string | null; last_seen: string | null
        best_score: number | null; latest_score: number | null
        passing_threshold: number; odometer_inconsistent: boolean
      }
    }>(`/admin/vehicles/history?vin=${encodeURIComponent(vin)}`),

  // ─── Global VIN Intelligence & Registry Operations ─────────────────────────
  decodeAndRetrieveVin: (vin: string) =>
    request<any>('/admin/vehicles/decode-and-retrieve', {
      method: 'POST',
      body: JSON.stringify({ vin }),
    }),

  compareDiscrepancies: (listingInputs: any, verifiedSpecs: any) =>
    request<{ hasDiscrepancies: boolean; count: number; discrepancies: any[] }>(
      '/admin/vehicles/compare-discrepancies',
      {
        method: 'POST',
        body: JSON.stringify({ listingInputs, verifiedSpecs }),
      }
    ),

  getVehicleIntelligence: (id: string) =>
    request<any>(`/admin/vehicles/intelligence/${id}`),

  getActiveSignals: (resolved = false) =>
    request<any[]>(`/admin/vehicles/signals?resolved=${resolved}`),

  resolveSignal: (id: string, note?: string) =>
    request<{ success: boolean; resolvedSignal: any }>(`/admin/vehicles/signals/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),

  addVehicleHistoryEvent: (id: string, eventData: any) =>
    request<any>(`/admin/vehicles/${id}/events`, {
      method: 'POST',
      body: JSON.stringify(eventData),
    }),

  updateVehicleSpecs: (id: string, specs: any, reason: string) =>
    request<any>(`/admin/vehicles/${id}/specs`, {
      method: 'PATCH',
      body: JSON.stringify({ specs, reason }),
    }),

  getVehiclesRegistry: (params?: { q?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams()
    if (params?.q) q.set('q', params.q)
    if (params?.limit) q.set('limit', String(params.limit))
    if (params?.offset) q.set('offset', String(params.offset))
    return request<{ items: any[]; total: number; limit: number; offset: number }>(
      `/admin/vehicles/registry?${q.toString()}`
    )
  },

  reassignListingSeller: (id: string, newSellerId: string, reason: string) =>
    request<{ success: boolean; car: any }>(`/cars/${id}/reassign-seller`, {
      method: 'POST',
      body: JSON.stringify({ new_seller_id: newSellerId, reason }),
    }),

  completeInspection: (id: string, data: any) =>
    request<any>(`/inspections/${id}/complete`, { method: 'POST', body: JSON.stringify(data) }),
  issueInspectionReport: (id: string) =>
    request<any>(`/inspections/${id}/report`, { method: 'POST' }),

  // Journey. Resolves from whichever id the page happens to be holding.
  journey: (subjectType: 'submission' | 'inspection' | 'car', id: string) =>
    request<Journey>(`/admin/journey/${subjectType}/${id}`),
  journeyBoard: () => request<JourneyBoard>('/admin/journey'),

  // Walk-in ("standalone") inspections — a paid check on a vehicle Sawa does
  // not list. The backend refuses to attach one to a submission or a car, so
  // none of these can ever produce publication evidence.
  bookWalkInInspection: (data: {
    make: string; model: string; year: number
    vin?: string; registration_plate?: string; mileage?: number
    center: string; scheduled_date: string; scheduled_time?: string
    customer_user_id?: string
    customer?: { name: string; email: string; phone?: string }
  }) => request<any>('/inspections/standalone', { method: 'POST', body: JSON.stringify(data) }),
  rescheduleInspection: (id: string, data: { center?: string; scheduled_date: string; scheduled_time?: string }) =>
    request<any>(`/inspections/${id}/schedule`, { method: 'PATCH', body: JSON.stringify(data) }),
  cancelInspection: (id: string, reason?: string) =>
    request<{ cancelled: boolean }>(`/inspections/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),

  // The walk-in fee is collected at the counter and recorded here — nothing on
  // this path moves money. A correction is a void plus a fresh record, never an
  // edit, so the original entry and the reason it was wrong both survive.
  recordInspectionFee: (id: string, data: { amount: number; method: 'cash' | 'mobile_money' | 'bank_transfer'; reference?: string }) =>
    request<any>(`/inspections/${id}/fee`, { method: 'POST', body: JSON.stringify(data) }),
  voidInspectionFee: (id: string, reason: string) =>
    request<any>(`/inspections/${id}/fee`, { method: 'DELETE', body: JSON.stringify({ reason }) }),
  notifyReportReady: (id: string) =>
    request<{ sent: boolean }>(`/inspections/${id}/report/notify`, { method: 'POST' }),

  // Handovers
  handovers: (status = 'pending') =>
    request<any[]>(`/handovers?status=${status}`),
  confirmHandover: (id: string, data: any = {}) =>
    request<any>(`/handovers/${id}/confirm`, { method: 'PATCH', body: JSON.stringify(data) }),
  completeHandover: (id: string) =>
    request<any>(`/handovers/${id}/complete`, { method: 'PATCH' }),
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

  // Historical transaction disputes — read/close retained records only.
  disputes: (status?: string) =>
    request<any[]>(`/disputes${status ? `?status=${status}` : ''}`),
  resolveDispute: (id: string, data: { status: 'resolved' | 'rejected'; resolution: string }) =>
    request<any>(`/disputes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Listings — admin-only route that accepts any status
  cars: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<any[]>(`/admin/listings${q}`)
  },
  /** The same view, plus how many rows match beyond the page.
   *
   *  The waiting-on-you queue is ordered oldest-first, so with a backlog longer
   *  than one page the newest vehicle — the one just worked on, the one being
   *  looked for — falls off the end. Filtering the fetched page in the browser
   *  then finds nothing, which reads exactly like the car not existing. `q` is
   *  passed to the server so a search covers the whole matching set, and `total`
   *  lets the page admit when it is showing a window. */
  carsPage: async (params: Record<string, string>): Promise<{ items: any[]; total: number }> => {
    const { data, res } = await requestFull<any[]>(`/admin/listings?${new URLSearchParams(params)}`)
    const items = data || []
    const header = Number(res.headers.get('X-Total-Count'))
    // Anything in the chain that drops the header must not make the page claim
    // there are fewer rows than it is already showing.
    return { items, total: Number.isFinite(header) && header > 0 ? header : items.length }
  },
  getCar: (id: string) => request<any>(`/cars/${id}`),
  /** Why a listing can (or cannot) be published — the same verdict the
   *  approve/publish transaction enforces, so the dashboard never has to
   *  re-derive the rules or guess which one is unmet. */
  listingReadiness: (id: string) => request<Readiness>(`/cars/${id}/readiness`),
  /** Correct what the vehicle IS. Make, model and year are what the inspection
   *  evidence is bound to, so this changes the listing AND its inspected
   *  submission in one server-side transaction — the two cannot diverge, which
   *  is what used to strand an admin on "Listing make, model and year must
   *  match the inspected submission" with no way forward. */
  correctVehicleIdentity: (id: string, body: { make: string; model: string; year: number; reason: string }) =>
    request<any>(`/cars/${id}/vehicle-identity`, { method: 'PATCH', body: JSON.stringify(body) }),
  updateCarStatus: (id: string, status: string, reason?: string) =>
    request<any>(`/cars/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, reason }) }),
  updateCar: (id: string, data: Record<string, unknown>) =>
    request<any>(`/cars/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  archiveCar: (id: string, reason: string) =>
    request<any>(`/cars/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),

  // Users / ID verification
  searchUsers: (q: string, limit = 8) =>
    request<any[]>(`/admin/users?q=${encodeURIComponent(q)}&limit=${limit}`),
  idVerificationQueue: () => request<any[]>('/id-verification/queue'),
  // ─── Report entitlements ───────────────────────────────────────────────────
  // Who may read an inspection report. Access is a row, not a column on the
  // inspection, so the same report can be sold to a second buyer rather than
  // being bound forever to whoever commissioned it.
  reportEntitlements: (inspectionId: string) =>
    request<any[]>(`/inspections/${inspectionId}/entitlements`),
  grantReportAccess: (inspectionId: string, body: {
    user_id: string
    source: 'purchased' | 'seller_copy' | 'admin_grant'
    amount?: number; method?: string; reference?: string; note?: string
  }) => request<any>(`/inspections/${inspectionId}/entitlements`, {
    method: 'POST', body: JSON.stringify(body),
  }),
  revokeReportAccess: (inspectionId: string, entitlementId: string, reason: string) =>
    request<any>(`/inspections/${inspectionId}/entitlements/${entitlementId}/revoke`, {
      method: 'POST', body: JSON.stringify({ reason }),
    }),
  decideVerification:  (userId: string, decision: string) =>
    request<any>(`/id-verification/${userId}`, {
      method: 'PATCH', body: JSON.stringify({ decision }),
    }),
  /** Approve an identity that was checked away from the dashboard — at the
   *  counter, against a business document, or on an established relationship.
   *  The note is the entire evidentiary record for that approval, so the server
   *  and the database both refuse a short one. */
  verifyIdentityOffline: (userId: string, body: { method: string; note: string; reference?: string }) =>
    request<{ success: true; decision: 'approved'; method: string; method_label: string }>(
      `/id-verification/${userId}/manual`, { method: 'POST', body: JSON.stringify(body) },
    ),
  /** Create any kind of account. The recipient sets their own password from a
   *  one-use link — nothing here emails a password. */
  /** Whether outbound email is actually configured. Reports configuration
   *  only — never a credential. */
  /** Change the signed-in operator's own password.
   *
   *  The backend already had this route; the dashboard had no way to reach it,
   *  which is how a weak admin password survives — rotating it meant a shell
   *  session and a hand-built request. Succeeding ends every OTHER session and
   *  keeps this one, so an operator is not signed out of the screen they are
   *  standing at. */
  changeOwnPassword: (current_password: string, new_password: string) =>
    request<{ user: { id: string; email: string } }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    }),

  mailStatus: () => request<{
    configured: boolean
    provider: 'resend' | 'smtp' | null
    from: string
    detail: string
  }>('/admin/mail-status'),

  createAccount: (data: { account_type: 'buyer' | 'individual_seller' | 'showroom'; name: string; email: string; phone?: string; business_name?: string }) =>
    request<any>('/admin/accounts', { method: 'POST', body: JSON.stringify(data) }),
  createShowroom: (data: { name: string; business_name: string; email: string; phone?: string }) =>
    request<any>('/admin/showrooms', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (userId: string, data: { name?: string; phone?: string | null; whatsapp_phone?: string | null; phone_visible?: boolean; whatsapp_visible?: boolean; business_name?: string | null; business_verified?: boolean; seller_type?: string | null; role?: 'buyer' | 'seller' }) =>
    request<any>(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  initiateUserPasswordReset: (userId: string) =>
    request<{ success: boolean; delivery: 'email_sent' | 'email_not_configured' }>(`/admin/users/${userId}/password-reset`, { method: 'POST' }),
  setUserAccess: (userId: string, action: 'suspend' | 'restore', reason?: string) =>
    request<any>(`/admin/users/${userId}/access`, { method: 'PATCH', body: JSON.stringify({ action, reason }) }),

  /** How many cars this seller may hold live or paused at once. Pass null to
   *  remove the cap. Lowering it below their current count NEVER unpublishes
   *  anything — the response's `warning` says how far over they are. */
  setListingCap: (userId: string, max_active_listings: number | null, note?: string) =>
    request<{
      id: string; name: string;
      max_active_listings: number | null; listing_cap_note: string | null;
      occupied: number; over_by: number; warning: string | null;
    }>(`/admin/users/${userId}/listing-cap`, {
      method: 'PUT', body: JSON.stringify({ max_active_listings, note }),
    }),

  // Imports — a separate operation and ledger from local vehicle handovers.
  importOrders: (status?: string) =>
    request<any[]>(`/imports/admin/all${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  importOrder: (id: string) => request<any>(`/imports/${id}`),
  quoteImport: (id: string, data: { quoted_total_rwf: number; exchange_rate?: number; quote_expires_at?: string; delivery_estimate?: string; line_items?: { label: string; amount_rwf: number }[]; terms?: string }) =>
    request<any>(`/imports/${id}/quote`, { method: 'POST', body: JSON.stringify(data) }),
  updateImportStatus: (id: string, status: string, summary?: string) =>
    request<any>(`/imports/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, summary }) }),
  reviewImportPayment: (orderId: string, paymentId: string, status: 'reviewed' | 'verified' | 'rejected', reason?: string) =>
    request<any>(`/imports/${orderId}/payments/${paymentId}`, { method: 'PATCH', body: JSON.stringify({ status, reason }) }),
  uploadImportDocument: (orderId: string, data: FormData) =>
    request<any>(`/imports/${orderId}/documents`, { method: 'POST', body: data }),
  updateImportShipment: (orderId: string, data: Record<string, string>) =>
    request<any>(`/imports/${orderId}/shipment`, { method: 'PATCH', body: JSON.stringify(data) }),
  prepareImportDocumentPack: (orderId: string) =>
    request<{ documents: any[] }>(`/imports/${orderId}/document-pack`, { method: 'POST' }),
  issueImportPaymentReceipt: (orderId: string, paymentId: string) =>
    request<any>(`/imports/${orderId}/payments/${paymentId}/receipt`, { method: 'POST' }),
  // Sawa's own landed cost, kept apart from quoted_total_rwf so margin is
  // visible — never returned to the buyer's own read of the same order.
  recordImportCost: (orderId: string, data: { actual_cost_rwf: number; note?: string }) =>
    request<any>(`/imports/${orderId}/cost`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Trust score
  trustScore: (userId: string) => request<any>(`/reviews/trust-score/${userId}`),

  // Cars creation & photo uploads
  createCar: (data: any) =>
    request<any>('/cars', { method: 'POST', body: JSON.stringify(data) }),
  uploadCarPhotos: (carId: string, formData: FormData) =>
    request<any>(`/inspections/cars/${carId}/photos`, { method: 'POST', body: formData }),
  getCarPhotos: (carId: string) =>
    request<any>(`/inspections/cars/${carId}/photos`),
  /** Burn the badge into the published photo.
   *
   *  Four corners as fractions of the image, so the geometry survives a resize
   *  and a perspective fit can be added later without changing the payload. The
   *  server re-encodes and keeps the original on a denied path — nothing here is
   *  a display-time overlay. */
  maskPlate: (carId: string, photoId: string, quad: { x: number; y: number }[]) =>
    request<any>(`/inspections/cars/${carId}/photos/${photoId}/plate`, {
      method: 'PATCH', body: JSON.stringify({ quad }),
    }),
  /** Record that a photo shows no plate. Never touches the file. */
  clearPlate: (carId: string, photoId: string) =>
    request<any>(`/inspections/cars/${carId}/photos/${photoId}/plate`, {
      method: 'PATCH', body: JSON.stringify({ plate_state: 'none' }),
    }),

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
  /** Place a car in the home-screen banner.
   *
   *  `kind` is what separates "we chose this" from "they paid for this". A
   *  sponsored placement is disclosed to buyers as Sponsored and must carry the
   *  agreed amount — recorded here, collected the way money always is. */
  featureCar: (
    id: string,
    opts: {
      kind?: 'editorial' | 'hot_deal' | 'sponsored'
      days?: number
      slot?: number
      headline?: string
      starts_at?: string
      amount_rwf?: number
    } = {},
  ) =>
    request<any>(`/cars/${id}/feature`, {
      method: 'PATCH',
      body: JSON.stringify({ kind: 'editorial', days: 7, ...opts }),
    }),

  /** End a placement early. A reason is required: a paid slot that vanishes
   *  without one is a customer conversation nobody can reconstruct. */
  cancelFeature: (placementId: string, reason: string) =>
    request<any>(`/cars/feature/${placementId}`, {
      method: 'DELETE', body: JSON.stringify({ reason }),
    }),

  /** What is in the banner right now, in slot order. */
  featuredBanner: (limit = 12) => request<any[]>(`/cars/featured?limit=${limit}`),

  // ── Account closures ───────────────────────────────────────────────────────
  // There is no approve or deny here on purpose. Guideline 5.1.1(v) requires
  // deletion to complete inside the app, so a closure has already happened by
  // the time it reaches this page. What an approval step was really wanted for
  // — knowing who left and why — is what these return.

  accountClosures: () => request<{
    closures: ClosedAccount[]
    reasons: { value: string; label: string }[]
    recovery_days: number
    tally: { closure_reason: string; label: string; n: number }[]
    due_for_purge: number
  }>('/admin/account-closures'),

  /** Erases every account past its window. It never chooses WHICH — the
   *  predicate does — so nobody can be purged early or skipped. */
  purgeClosedAccounts: () =>
    request<{ purged: number; attempted?: number; accounts?: unknown[] }>(
      '/admin/account-closures/purge',
      { method: 'POST' }
    ),

  // ── Brands ─────────────────────────────────────────────────────────────────
  // The seller-facing brand list used to be a twenty-item array inside a mobile
  // screen, so widening it needed an App Store release — and it carried no
  // Chinese marque while the catalogue already held three. These are how it is
  // maintained instead.

  /** Every brand, inactive included, plus how many listings each one carries —
   *  and `unrecognised`, the makes that appear on listings but on no brand row.
   *  That list is the one worth reading: it is where a misfiled car shows up. */
  makes: () => request<{
    makes: MakeRow[]
    unrecognised: { make: string; listings: number }[]
  }>('/admin/makes'),

  createMake: (name: string, aliases: string[] = [], display_order = 500) =>
    request<MakeRow>('/admin/makes', {
      method: 'POST', body: JSON.stringify({ name, aliases, display_order }),
    }),

  updateMake: (id: string, patch: Partial<Pick<MakeRow, 'name' | 'aliases' | 'display_order' | 'active' | 'logo_url'>>) =>
    request<MakeRow>(`/admin/makes/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  /** The logo itself. FormData, so `request` leaves the Content-Type alone and
   *  the browser sets the multipart boundary. */
  uploadMakeLogo: (id: string, data: FormData) =>
    request<MakeRow>(`/admin/makes/${id}/logo`, { method: 'POST', body: data }),

  // ── Import catalogue photography ────────────────────────────────────────
  // A propose/approve queue, not an automatic pipeline. A random sample of
  // this catalogue's own 233 models put the right car in Commons' top result
  // 38 times out of 44 -- good, not perfect, and "not perfect" is the exact
  // failure the catalogue was rebuilt to remove. So findImageCandidates only
  // STORES what it finds; nothing reaches a buyer until approveImage.

  findImageCandidates: (limit = 25) =>
    request<{
      checked: number; with_candidates: number; with_none: number
      awaiting_review: number; not_yet_searched: number; approved: number; skipped: number; total: number
    }>('/imports/admin/catalog/find-images', { method: 'POST', body: JSON.stringify({ limit }) }),

  imageQueue: () => request<{
    items: {
      id: string; make: string; model: string; body_type: string; origin_country: string
      candidates: {
        id: string; image_url: string; thumb_url: string; page_url: string
        title: string; author: string | null; license_name: string | null; license_url: string | null
      }[]
    }[]
    awaiting_review: number; not_yet_searched: number; approved: number; skipped: number; total: number
  }>('/imports/admin/catalog/image-queue'),

  approveImage: (catalogId: string, candidateId: string) =>
    request<any>(`/imports/admin/catalog/${catalogId}/approve-image`, {
      method: 'POST', body: JSON.stringify({ candidate_id: candidateId }),
    }),

  skipImage: (catalogId: string) =>
    request<any>(`/imports/admin/catalog/${catalogId}/skip-image`, { method: 'POST', body: JSON.stringify({}) }),

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

  settings: () => request<any[]>('/admin/settings'),
  // `unknown`, not `boolean | number`: two settings are now objects, and a
  // narrower type here would only be satisfied by casting at every call site.
  updateSetting: (key: string, value: unknown) =>
    request<any>(`/admin/settings/${encodeURIComponent(key)}`, {
      method: 'PATCH', body: JSON.stringify({ value }),
    }),
  // The public rate card — same numbers a customer would see, so a
  // fee-recording form can prefill what the office should be charging
  // without duplicating the whole settings read.
  rateCard: () => request<{ inspection_fee_rwf: number; report_resale_fee_rwf: number; rental_subscription_monthly_rwf: number; reviewed_on?: string }>('/settings/rate-card'),

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
  rentalCars:    () => request<any[]>('/rentals/admin/fleet'),
  getRentalCar:  (id: string) => request<any>(`/rentals/${id}`),
  createRentalCar: (data: any) =>
    request<any>('/rentals', { method: 'POST', body: JSON.stringify(data) }),
  // Listing subscriptions. A lapse hides a car by falling out of the public
  // predicates — nothing here sweeps or schedules anything, and a renewal takes
  // effect on the next request.
  rentalSubscriptions: (id: string) => request<any[]>(`/rentals/${id}/subscriptions`),
  recordRentalSubscription: (id: string, data: {
    amount_rwf: number; method?: 'cash' | 'mobile_money' | 'bank_transfer'
    reference?: string; starts_on: string; ends_on: string; note?: string
  }) => request<any>(`/rentals/${id}/subscriptions`, { method: 'POST', body: JSON.stringify(data) }),
  voidRentalSubscription: (subId: string, reason: string) =>
    request<any>(`/rentals/subscriptions/${subId}/void`, { method: 'POST', body: JSON.stringify({ reason }) }),

  updateRentalCar: (id: string, data: any) =>
    request<any>(`/rentals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Rental inquiries — providers own booking confirmation and payment.
  getRentalInquiries: (status?: string) =>
    request<any[]>(`/rentals/inquiries${status ? `?status=${status}` : ''}`),
  updateRentalInquiryStatus: (id: string, status: 'contacted' | 'closed' | 'cancelled') =>
    request<any>(`/rentals/inquiries/${id}/status`, {
      method: 'PATCH', body: JSON.stringify({ status }),
    }),
}
