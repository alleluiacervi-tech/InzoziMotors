// ─────────────────────────────────────────────────────────────────────────────
// The API contract, typed once.
//
// SOURCE OF TRUTH: backend/src/schema.sql and backend/src/routes/*.js.
// These are snake_case on purpose — they mirror the wire format exactly rather
// than a camelCase translation, so a field name in a component can be traced
// straight to the SQL column that produced it. The mobile app maps to camelCase
// inside AppContext; the web reads the wire shape directly.
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'buyer' | 'seller' | 'admin'
export type IdVerificationStatus = 'none' | 'pending' | 'approved' | 'rejected'

export interface User {
  id: string
  name: string
  email: string
  phone?: string | null
  role: UserRole
  id_verified: IdVerificationStatus
  trust_score: number
  response_rate?: number
  completed_sales?: number
  avatar_url?: string | null
  created_at: string
}

export type CarStatus =
  | 'under_review'
  | 'scheduled'
  | 'inspecting'
  | 'live'
  | 'reserved'
  | 'sold'
  | 'archived'

export interface PricePoint {
  price: number
  at: string
}

export interface Car {
  id: string
  seller_id: string
  title: string
  make: string
  model: string
  year: number
  mileage: number
  fuel_type?: string | null
  transmission?: string | null
  body_type?: string | null
  color?: string | null
  price: number
  location?: string | null
  /** RHD = Japanese import, LHD = locally purchased. A real filter in Rwanda. */
  drive_side?: 'RHD' | 'LHD' | null
  vin?: string | null
  description?: string | null
  images?: string[] | null
  inspected: boolean
  inspection_score?: number | null
  status: CarStatus
  views: number
  saves?: number
  listed_at?: string | null
  sold_at?: string | null
  created_at: string
  featured_until?: string | null

  // Joined by the API
  seller_name?: string
  seller_phone?: string | null
  seller_trust?: number
  seller_id_verified?: IdVerificationStatus
  seller_sales?: number
  saves_count?: number

  // Server-computed market intelligence (backend/src/routes/cars.js).
  // market_avg is null when there were fewer than 3 real comparables — in that
  // case the UI must not make a market claim at all.
  market_avg?: number | null
  market_diff?: number | null
  below_market?: number
  comparables?: number
  listed_days?: number | null
  price_history?: PricePoint[]
}

export interface VehicleHistory {
  vin: string | null
  vin_verified: boolean
  make: string
  model: string
  year: number
  drive_side?: string | null
  import_origin: string
  mileage: number
  mileage_verified: boolean
  rra_duty_paid: string
  registration: string
  service_history: string
  insurance_valid: string
  inspection_score?: number | null
  inspected_at?: string | null
  seller: { name: string; id_verified: boolean; completed_sales: number }
  accident_history: string
}

export type ChecklistVerdict = 'pass' | 'flag' | 'fail'

export interface InspectionReport {
  car_id?: string
  score: number
  checklist_results: Record<string, ChecklistVerdict>
  notes?: string | null
  completed_at?: string | null
  center?: string
}

export interface RentalCar {
  id: string
  title: string
  make?: string
  model?: string
  year?: number
  category?: string
  seats?: number
  fuel?: string
  transmission?: string
  mileage?: number
  daily_rate: number
  weekly_rate?: number | null
  deposit: number
  min_days: number
  inspected: boolean
  inspection_score?: number | null
  rating?: string | number | null
  trips: number
  location?: string | null
  images?: string[] | null
  safari_ready: boolean
  status: 'active' | 'maintenance' | 'retired'
  booked_ranges?: { start_date: string; days: number }[]
}

export type HandoverStatus = 'pending' | 'confirmed' | 'complete' | 'cancelled'

export interface Handover {
  id: string
  booking_id: string
  car_id: string
  buyer_id: string
  seller_id: string
  center?: string | null
  handover_date?: string | null
  handover_time?: string | null
  contact_phone?: string | null
  agreed_price?: number | null
  status: HandoverStatus
  booked_at: string
  confirmed_at?: string | null
  // Joined
  car_title?: string
  car_images?: string[] | null
  price?: number
  seller_name?: string
  buyer_name?: string
}

export type SubmissionStatus =
  | 'under_review'
  | 'approved'
  | 'scheduled'
  | 'inspecting'
  | 'inspected'
  | 'live'
  | 'rejected'

export interface Submission {
  id: string
  car_id?: string | null
  seller_id: string
  status: SubmissionStatus
  make?: string
  model?: string
  year?: number
  mileage?: number
  condition?: string
  transmission?: string
  body_type?: string
  color?: string
  fuel_type?: string
  asking_price: number
  notes?: string | null
  admin_notes?: string | null
  reference_images?: string[] | null
  inspection_center?: string | null
  inspection_date?: string | null
  inspection_time?: string | null
  submitted_at: string
  // Joined
  car_title?: string
  car_images?: string[] | null
  listing_status?: CarStatus
}

export type NotificationType =
  | 'price_drop'
  | 'new_message'
  | 'message'
  | 'listing_update'
  | 'handover'
  | 'search_match'

export interface AppNotification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  meta?: Record<string, unknown> | null
  created_at: string
}

export interface SavedSearch {
  id: string
  label: string
  filters: {
    make?: string
    model?: string
    category?: string
    maxPrice?: number
    maxMileage?: number
    query?: string
  }
  notify_enabled: boolean
  created_at: string
}

export interface Conversation {
  id: string
  car_id?: string | null
  buyer_id: string
  seller_id: string
  last_message?: string | null
  last_message_at?: string | null
  created_at: string
  buyer_name?: string
  seller_name?: string
  car_title?: string
  car_images?: string[] | null
  unread_count?: string | number
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  text: string
  read: boolean
  created_at: string
  sender_name?: string
}

export type DisputeStatus = 'open' | 'resolved' | 'rejected'

export interface Dispute {
  id: string
  handover_id: string
  raised_by: string
  reason: string
  status: DisputeStatus
  resolution?: string | null
  created_at: string
  resolved_at?: string | null
  booking_id?: string
  car_title?: string
}

export interface Referral {
  user_id: string
  code: string
  uses: number
  redemptions: number
  created_at: string
}

export interface TrustScore {
  total: number
  breakdown: {
    id_verified: number
    completed_sales: number
    response_rate: number
    reviews: number
  }
  profile?: Record<string, unknown>
}

export interface Review {
  id: string
  handover_id: string
  reviewer_id: string
  seller_id: string
  rating: number
  comment?: string | null
  created_at: string
  reviewer_name?: string
}

export interface Valuation {
  comparables: number
  low?: number
  high?: number
  market_avg?: number
  range_seen?: { low: number; high: number }
  message?: string
}

/** Filters accepted by GET /cars. Mirrors the query params the route parses. */
export interface CarQuery {
  q?: string
  make?: string
  model?: string
  min_price?: number
  max_price?: number
  min_year?: number
  max_year?: number
  fuel_type?: string
  transmission?: string
  body_type?: string
  drive_side?: string
  sort?: 'listed_at' | 'price' | 'mileage' | 'year' | 'views'
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}
