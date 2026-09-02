import type { DutyRates } from '@/lib/business'
import type {
  AppNotification, Car, CarQuery, Conversation, EligibleRentalInspection, FeaturedPlacement,
  InspectionCenter, InspectionReport,
  Message, RentalCar, RentalInquiry, Review, SavedSearch, Submission, TrustScore, User,
  Valuation, VehicleHistory,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
// One HTTP client for the whole site, speaking the same REST contract as the
// Expo app (src/api/client.js) and the admin dashboard (admin/src/lib/api.ts).
//
// The web has one wrinkle neither of those has: the same code runs on the server
// (Server Components, route handlers) and in the browser. The token therefore
// comes from two different places, so callers pass it explicitly rather than the
// client reaching for ambient state that only exists on one side.
//
//   Server Component  ->  api.cars.list()               (public, cached)
//   Server Component  ->  api.me(await getToken())      (per-request, no cache)
//   Client Component  ->  fetch('/api/...') route handler, which holds the cookie
//
// The browser NEVER sees the JWT: it lives in an httpOnly cookie and is attached
// server-side. That is the single biggest security difference from the mobile
// app, where SecureStore is the appropriate store.
// ─────────────────────────────────────────────────────────────────────────────

/** Server-side base URL — the VPS, reachable directly from the Next server. */
export const API_URL =
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export class ApiError extends Error {
  status: number
  code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
  /** True when the backend could not be reached at all (vs. answered with 4xx). */
  get isNetworkError() {
    return this.status === 0
  }
}

type RequestOptions = {
  token?: string | null
  /** Next.js caching. Public catalogue data is revalidated; anything
   *  user-specific must pass `cache: 'no-store'`, which is the default here. */
  revalidate?: number | false
  tags?: string[]
  cache?: RequestCache
  signal?: AbortSignal
  /** Milliseconds before the request is abandoned. A hung API must not hang a page. */
  timeoutMs?: number
}

const DEFAULT_TIMEOUT = 10_000

async function request<T>(
  path: string,
  init: RequestInit & RequestOptions = {}
): Promise<T> {
  const { token, revalidate, tags, timeoutMs = DEFAULT_TIMEOUT, ...rest } = init

  const headers = new Headers(rest.headers)
  headers.set('Accept', 'application/json')
  if (rest.body && !(rest.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  // A slow VPS must not hold a Server Component render open indefinitely.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const next =
    revalidate === undefined && !tags
      ? undefined
      : { revalidate: revalidate === false ? undefined : revalidate, tags }

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers,
      signal: rest.signal ?? controller.signal,
      // Authenticated reads must never be cached across users.
      cache: rest.cache ?? (token ? 'no-store' : rest.cache),
      ...(next ? { next } : {}),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new ApiError(
        (data as { error?: string }).error || `Request failed (${res.status})`,
        res.status,
        (data as { code?: string }).code
      )
    }
    return data as T
  } catch (err) {
    if (err instanceof ApiError) throw err
    const message =
      (err as Error)?.name === 'AbortError'
        ? 'The request timed out.'
        : 'Could not reach Sawa Cars. Please try again.'
    throw new ApiError(message, 0)
  } finally {
    clearTimeout(timer)
  }
}

function qs(params: Record<string, unknown>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value))
    }
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}

// ─── Public catalogue ────────────────────────────────────────────────────────
// Unauthenticated and server-renderable, which is what makes the marketplace
// indexable. Revalidated rather than cached forever so a sold car leaves the
// site quickly without us rebuilding.

const CATALOGUE_REVALIDATE = 60

/** The platform USD⇄RWF rate, served by our own API (backend/src/lib/fx.js).
 *  Never throws: a page must not fail because a display hint is unavailable —
 *  the fallback mirrors the backend's floor and is flagged stale. */
export const fx = {
  get: async (): Promise<{ rate: number; source: string; fetched_at: string | null; stale: boolean }> => {
    try {
      return await request('/fx', { revalidate: 3600, cache: undefined, timeoutMs: 4000 })
    } catch {
      return { rate: 1470, source: 'client-fallback', fetched_at: null, stale: true }
    }
  },
}

export const duty = {
  /**
   * The import duty schedule the calculator runs on. Cached for an hour by
   * Next; the rates change perhaps twice a year and a correction reaches the
   * site within that.
   *
   * Returns null rather than throwing, so lib/business falls back to the last
   * schedule a person reviewed — a calculator that renders nothing is worse
   * than one that renders dated figures and dates them.
   */
  rates: async (): Promise<DutyRates | null> => {
    try {
      return await request<DutyRates>('/settings/duty-rates', { revalidate: 3600, cache: undefined, timeoutMs: 4000 })
    } catch {
      return null
    }
  },
}

export const cars = {
  list: (query: CarQuery = {}) =>
    request<Car[]>(`/cars${qs(query as Record<string, unknown>)}`, {
      revalidate: CATALOGUE_REVALIDATE,
      tags: ['cars'],
    }),

  /** The cars an operator placed at the top of the marketplace, in slot order.
   *  The app has rendered these since the banner work; the website was still
   *  showing "newest six live listings" and calling it featured, so a placement
   *  an operator made — including one somebody paid for — appeared in exactly
   *  one of the two places it was sold to appear. */
  featured: (limit = 6) =>
    request<FeaturedPlacement[]>(`/cars/featured?limit=${limit}`, {
      revalidate: CATALOGUE_REVALIDATE,
      tags: ['cars', 'featured'],
    }),

  get: (id: string) =>
    request<Car>(`/cars/${id}`, { revalidate: CATALOGUE_REVALIDATE, tags: ['cars', `car:${id}`] }),

  history: (id: string) =>
    request<VehicleHistory>(`/cars/${id}/history`, { revalidate: CATALOGUE_REVALIDATE }),

  inspectionReport: (id: string) =>
    request<InspectionReport>(`/inspections/report/${id}`, { revalidate: CATALOGUE_REVALIDATE }),

  contact: (token: string, id: string, channel: 'phone' | 'whatsapp' | 'in_app', acknowledge = false) =>
    request<{ channel: string; contact: string | null; seller_id: string; notice: string; available: { phone: boolean; whatsapp: boolean; in_app: boolean } }>(`/cars/${id}/contact`, {
      token, method: 'POST', body: JSON.stringify({ channel, acknowledge }), cache: 'no-store',
    }),

  /** Public valuation tool — no account needed, same endpoint the app calls. */
  valuation: (params: { make: string; year: number; mileage?: number }) =>
    request<Valuation>(`/cars/valuation/estimate${qs(params)}`, { cache: 'no-store' }),
}

export const rentals = {
  list: () => request<RentalCar[]>('/rentals', { revalidate: CATALOGUE_REVALIDATE, tags: ['rentals'] }),
  get: (id: string) => request<RentalCar>(`/rentals/${id}`, { revalidate: CATALOGUE_REVALIDATE }),
  inspectionReport: (id: string) =>
    request<InspectionReport>(`/inspections/report/rental/${id}`, { revalidate: CATALOGUE_REVALIDATE }),
  inquire: (token: string, id: string, body: { start_date?: string; days?: number; pickup_location?: string; message?: string; preferred_channel: 'in_app' | 'phone' | 'whatsapp'; acknowledge: boolean }) =>
    request<RentalInquiry & { contact?: string | null; notice: string }>(`/rentals/${id}/inquire`, {
      token, method: 'POST', body: JSON.stringify(body), cache: 'no-store',
    }),
  myInquiries: (token: string) => request<RentalInquiry[]>('/rentals/inquiries/my', { token, cache: 'no-store' }),
  updateInquiry: (token: string, id: string, status: 'cancelled') =>
    request<RentalInquiry>(`/rentals/inquiries/${id}/status`, { token, method: 'PATCH', body: JSON.stringify({ status }) }),

  // ── Provider self-serve ──────────────────────────────────────────────────
  // A verified rental provider managing their own fleet and inbox. Publication
  // stays admin-only — propose() can only ever land 'pending_review'.
  mine: (token: string) => request<RentalCar[]>('/rentals/mine', { token, cache: 'no-store' }),
  eligibleInspections: (token: string) =>
    request<EligibleRentalInspection[]>('/rentals/mine/eligible-inspections', { token, cache: 'no-store' }),
  propose: (token: string, body: Record<string, unknown>) =>
    request<RentalCar & { message: string }>('/rentals/propose', {
      token, method: 'POST', body: JSON.stringify(body), cache: 'no-store',
    }),
  updateMine: (token: string, id: string, body: Record<string, unknown>) =>
    request<RentalCar>(`/rentals/${id}/mine`, {
      token, method: 'PATCH', body: JSON.stringify(body), cache: 'no-store',
    }),
  /** The provider's incoming inquiries (or every inquiry, for an admin). */
  providerInquiries: (token: string, status?: RentalInquiry['status']) =>
    request<RentalInquiry[]>(`/rentals/inquiries${status ? `?status=${status}` : ''}`, { token, cache: 'no-store' }),
  updateInquiryStatus: (token: string, id: string, status: 'contacted' | 'closed' | 'cancelled') =>
    request<RentalInquiry>(`/rentals/inquiries/${id}/status`, { token, method: 'PATCH', body: JSON.stringify({ status }) }),
}

export const inspectionCenters = {
  active: () => request<InspectionCenter[]>('/centers/active', {
    revalidate: 60,
    tags: ['inspection-centers'],
  }),
}

export const sellers = {
  reviews: (userId: string) =>
    request<Review[]>(`/reviews/seller/${userId}`, { revalidate: 300 }),
  trustScore: (userId: string) =>
    request<TrustScore>(`/reviews/trust-score/${userId}`, { revalidate: 300 }),
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const auth = {
  login: (email: string, password: string) =>
    request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    }),

  register: (name: string, email: string, password: string, role: 'buyer' | 'seller' = 'buyer') =>
    request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
      cache: 'no-store',
    }),

  /** Always resolves 200 — the backend never reveals whether an email exists. */
  forgotPassword: (email: string) =>
    request<{ success: true; dev_code?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
      cache: 'no-store',
    }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    request<{ success: true }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, new_password: newPassword }),
      cache: 'no-store',
    }),

  acceptShowroomInvite: (token: string, password: string) =>
    request<{ user: User; token: string }>('/auth/accept-showroom-invite', {
      method: 'POST', body: JSON.stringify({ token, password }), cache: 'no-store',
    }),

  /** Activate any admin-created account from its one-use invite link. */
  acceptInvite: (token: string, password: string) =>
    request<{ user: User; token: string }>('/auth/accept-invite', {
      method: 'POST', body: JSON.stringify({ token, password }), cache: 'no-store',
    }),
}

// ─── Authenticated ───────────────────────────────────────────────────────────
// Every function here takes the token explicitly. That is deliberate: it makes
// it impossible to accidentally render a cached page containing another user's
// data, because an authenticated call is always visibly per-request.

export const account = {
  me: (token: string) => request<User>('/auth/me', { token }),

  updateProfile: (token: string, fields: { name?: string; phone?: string; whatsapp_phone?: string; phone_visible?: boolean; whatsapp_visible?: boolean; avatar_url?: string }) =>
    request<User>('/auth/me', { token, method: 'PATCH', body: JSON.stringify(fields) }),

  /** Returns a replacement token: the backend ends every other session on a
   *  password change, so the caller's cookie must be re-issued or they log
   *  themselves out by securing their own account. */
  changePassword: (token: string, current_password: string, new_password: string) =>
    request<{ success: true; token: string }>('/auth/change-password', {
      token,
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    }),

  /** Permanent. The API re-authenticates before anonymising the account. */
  /** Closes the account immediately. Nothing is erased for thirty days, and
   *  the response says the date it will be — see lib/account-closure.js on the
   *  server for why an operator cannot approve or block this. */
  closeAccount: (token: string, password: string, reason: string, note?: string) =>
    request<{ success: true; reopen_until: string; recovery_days: number; listings_taken_down: number }>('/auth/me', {
      token,
      method: 'DELETE',
      body: JSON.stringify({ password, reason, note }),
    }),

  /** The fixed vocabulary the server's CHECK constraint accepts. Fetched, not
   *  duplicated, so the radio buttons and the storable values cannot drift. */
  closureReasons: () =>
    request<{ reasons: { value: string; label: string }[]; recovery_days: number }>(
      '/auth/closure-reasons',
      { revalidate: 3600 }
    ),
}

export const importOrders = {
  mine: (token: string) => request<any[]>('/imports/mine', { token }),
  get: (token: string, id: string) => request<any>(`/imports/${id}`, { token }),
  create: (token: string, data: { origin_country: string; make: string; model: string; year?: number; supplier_reference?: string; customer_notes?: string }) =>
    request<any>('/imports', { token, method: 'POST', body: JSON.stringify(data) }),
  acceptAgreement: (token: string, id: string) => request<any>(`/imports/${id}/accept-agreement`, { token, method: 'POST' }),
  submitPaymentProof: (token: string, orderId: string, paymentId: string, data: FormData) =>
    request<any>(`/imports/${orderId}/payments/${paymentId}/proof`, { token, method: 'POST', body: data }),
}

export const saved = {
  cars: (token: string) => request<Car[]>('/cars/saved/list', { token }),
  toggle: (token: string, carId: string) =>
    request<{ saved: boolean }>(`/cars/save/${carId}`, { token, method: 'POST' }),

  searches: (token: string) => request<SavedSearch[]>('/saved-searches', { token }),
  createSearch: (token: string, label: string, filters: SavedSearch['filters']) =>
    request<SavedSearch>('/saved-searches', {
      token, method: 'POST', body: JSON.stringify({ label, filters }),
    }),
  updateSearch: (token: string, id: string, notify_enabled: boolean) =>
    request<SavedSearch>(`/saved-searches/${id}`, {
      token, method: 'PATCH', body: JSON.stringify({ notify_enabled }),
    }),
  deleteSearch: (token: string, id: string) =>
    request<{ success: true }>(`/saved-searches/${id}`, { token, method: 'DELETE' }),
}

/**
 * Where one of my cars has reached, and who is holding it up.
 *
 * A projection of the same computation the Sawa team sees — not a second one —
 * reduced on the server to what a seller may read. `waiting_on: 'you'` is the
 * only value that asks the seller to do something.
 */
export type SellerProgress = {
  submission_id: string | null
  car_id: string | null
  stages_done: number
  stages_total: number
  complete: boolean
  blocked: boolean
  waiting_on: 'sawa' | 'you' | 'schedule' | 'nobody'
  stage: { key: string; label: string } | null
  message: string | null
}

export const submissions = {
  mine: (token: string) => request<Submission[]>('/submissions', { token }),

  /** Keyed by submission id. Answers {} rather than throwing — the selling page
   *  must render without it. */
  progress: (token: string) => request<Record<string, SellerProgress>>('/submissions/progress', { token }),

  /** Gated by requireVerified server-side — a 403 carries ID_VERIFICATION_REQUIRED. */
  create: (token: string, body: Record<string, unknown>) =>
    request<Submission>('/submissions', { token, method: 'POST', body: JSON.stringify(body) }),

  schedule: (token: string, id: string, body: { center: string; date: string; time: string }) =>
    request<Submission>(`/submissions/${id}/schedule`, {
      token, method: 'PATCH', body: JSON.stringify(body),
    }),
}

export const notifications = {
  list: (token: string) => request<AppNotification[]>('/notifications', { token }),
  markRead: (token: string, id: string) =>
    request<AppNotification>(`/notifications/${id}/read`, { token, method: 'PATCH' }),
  markAllRead: (token: string) =>
    request<{ success: true }>('/notifications/read-all', { token, method: 'PATCH' }),
}

export const messages = {
  conversations: (token: string) =>
    request<Conversation[]>('/messages/conversations', { token }),
  thread: (token: string, id: string) =>
    request<Message[]>(`/messages/conversations/${id}`, { token }),
  start: (token: string, car_id: string, message: string) =>
    request<{ conversation: Conversation }>('/messages/conversations', {
      token, method: 'POST', body: JSON.stringify({ car_id, message }),
    }),
  send: (token: string, id: string, text: string) =>
    request<Message>(`/messages/conversations/${id}`, {
      token, method: 'POST', body: JSON.stringify({ text }),
    }),
}

export const sellerListings = {
  mine: (token: string) => request<Car[]>('/cars/seller/mine', { token }),
  updatePrice: (token: string, id: string, price: number) =>
    request<Car>(`/cars/${id}/price`, { token, method: 'PATCH', body: JSON.stringify({ price }) }),
}

export const disputes = {
  raise: (token: string, handoverId: string, reason: string) =>
    request<any>('/disputes', {
      token, method: 'POST', body: JSON.stringify({ handover_id: handoverId, reason }),
    }),
}

export const referrals = {
  redeem: (token: string, code: string) =>
    request<{ success: true }>('/referrals/redeem', {
      token, method: 'POST', body: JSON.stringify({ code }),
    }),
}

export const handovers = {
  cancel: (token: string, id: string) =>
    request<{ success: true }>(`/handovers/${id}/cancel`, { token, method: 'POST' }),
}

export const api = {
  cars, rentals, sellers, auth, account, saved,
  submissions, notifications, messages, sellerListings,
  disputes, referrals, handovers,
}

export default api

