const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

function token() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('inzozi_admin_token')
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    ...(opts.headers as Record<string, string> | undefined),
  }
  if (!(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

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
