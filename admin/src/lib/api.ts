// Same-origin. Requests go to this Next server, which attaches the JWT from an
// httpOnly cookie and forwards them (src/app/api/backend/[...path]/route.ts).
//
// The token used to live in localStorage and be attached here, in the browser —
// meaning any injected script could read the most privileged credential in the
// system. Nothing in this file touches a token now, and every call site below
// is unchanged, because only the base URL moved.
const BASE = '/api/backend'

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string> | undefined),
  }
  if (!(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers,
    // The cookie is httpOnly but still same-origin; this makes the intent explicit.
    credentials: 'same-origin',
  })
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

  // Fees / revenue
  getFees: (status?: string) =>
    request<{ fees: any[]; totals: Record<string, number> }>(
      `/admin/fees${status ? `?status=${status}` : ''}`
    ),
  updateFee: (id: string, status: 'paid' | 'waived' | 'due') =>
    request<any>(`/admin/fees/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Featured listings
  featureCar: (id: string, days = 7) =>
    request<any>(`/cars/${id}/feature`, { method: 'PATCH', body: JSON.stringify({ days }) }),

  // Rental fleet (rental_cars) — money fields are USD integers
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
