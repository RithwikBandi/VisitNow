import { ApiError, type Appointment, type Clinic, type Doctor, type PaymentMethod, type QueueEntry, type QueuePriority, type QueueSource, type QueueStatus, type RevenueReport, type Session, type SessionWithRelations } from './types'
import { getToken } from './auth'
import type { PublicAccount } from './accountTypes'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Every /staff, /dashboard, /admin call needs the bearer token — one
  // change point here instead of passing it through every call site
  // individually. Patient-facing calls have no token to send (getToken()
  // returns null for a browser with no staff session), which is fine:
  // those routes don't require one.
  const token = getToken()
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError("Couldn't reach the VisitNow server. Check your connection and try again.", 0)
  }

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // No/invalid JSON body — fall through with body left null.
  }

  if (!response.ok) {
    const detail = (body as { error?: string } | null)?.error ?? `Request failed (${response.status})`
    throw new ApiError(detail, response.status)
  }
  return body as T
}

// --- Catalog: doctors, clinics, today's sessions --------------------------

export function fetchTodaysSessions(clinicId?: string): Promise<{ sessions: SessionWithRelations[] }> {
  return request(`/api/sessions/today${clinicId ? `?clinicId=${encodeURIComponent(clinicId)}` : ''}`)
}

export function fetchClinics(): Promise<{ clinics: Clinic[] }> {
  return request('/api/clinics')
}

export function fetchClinic(clinicId: string): Promise<{ clinic: Clinic; sessions: SessionWithRelations[] }> {
  return request(`/api/clinics/${clinicId}`)
}

export function fetchDoctor(doctorId: string): Promise<{ doctor: Doctor; sessions: SessionWithRelations[] }> {
  return request(`/api/doctors/${doctorId}`)
}

export function fetchSession(sessionId: string): Promise<{ session: Session; doctor: Doctor; clinic: Clinic }> {
  return request(`/api/sessions/${sessionId}`)
}

// --- Queue ------------------------------------------------------------

export function fetchQueue(sessionId: string): Promise<{ entries: QueueEntry[] }> {
  return request(`/api/sessions/${sessionId}/queue`)
}

export function generateToken(
  sessionId: string,
  input: { source: QueueSource; patientName: string; patientPhone?: string; paymentMethod?: PaymentMethod; couponCode?: string },
): Promise<{ entry: QueueEntry }> {
  return request(`/api/sessions/${sessionId}/token`, { method: 'POST', body: JSON.stringify(input) })
}

export function fetchQueueEntry(
  entryId: string,
): Promise<{ entry: QueueEntry; session: Session; doctor: Doctor; clinic: Clinic; patientsAhead: number; estimatedMinutes: number }> {
  return request(`/api/queue-entries/${entryId}`)
}

export function callNext(sessionId: string): Promise<{ completed: QueueEntry | null; called: QueueEntry | null }> {
  return request(`/api/sessions/${sessionId}/call-next`, { method: 'POST' })
}

export function setDoctorStatus(
  sessionId: string,
  status: Session['doctorStatus'],
  delayMinutes?: number,
): Promise<{ session: Session }> {
  return request(`/api/sessions/${sessionId}/doctor-status`, { method: 'POST', body: JSON.stringify({ status, delayMinutes }) })
}

export function startConsultation(entryId: string): Promise<{ entry: QueueEntry }> {
  return request(`/api/queue-entries/${entryId}/start`, { method: 'POST' })
}

export function completeEntry(entryId: string): Promise<{ entry: QueueEntry }> {
  return request(`/api/queue-entries/${entryId}/complete`, { method: 'POST' })
}

export function skipEntry(entryId: string): Promise<{ entry: QueueEntry }> {
  return request(`/api/queue-entries/${entryId}/skip`, { method: 'POST' })
}

export function requeueEntry(entryId: string): Promise<{ entry: QueueEntry }> {
  return request(`/api/queue-entries/${entryId}/requeue`, { method: 'POST' })
}

export function markNoShow(entryId: string): Promise<{ entry: QueueEntry }> {
  return request(`/api/queue-entries/${entryId}/no-show`, { method: 'POST' })
}

export function cancelEntry(entryId: string): Promise<{ entry: QueueEntry }> {
  return request(`/api/queue-entries/${entryId}/cancel`, { method: 'POST' })
}

export function collectHospitalFee(entryId: string): Promise<{ entry: QueueEntry }> {
  return request(`/api/queue-entries/${entryId}/collect-fee`, { method: 'POST' })
}

export function issueRefund(entryId: string, amount?: number, reason?: string): Promise<{ entry: QueueEntry }> {
  return request(`/api/queue-entries/${entryId}/refund`, { method: 'POST', body: JSON.stringify({ amount, reason }) })
}

export interface RefundCandidateRow {
  id: string
  tokenNumber: number
  patientName: string
  clinicId: string
  clinicName: string
  doctorName: string
  date: string
  status: QueueStatus
  maxRefundable: number
  refundStatus?: 'REFUNDED'
  refundAmount?: number
  refundedAt?: string
  refundedBy?: string
  refundReason?: string
}
export function fetchRefundCandidates(): Promise<{ refunds: RefundCandidateRow[] }> {
  return request('/api/staff/refunds')
}

// --- Coupons ---------------------------------------------------------

export interface Coupon {
  id: string
  code: string
  discountType: 'PERCENT' | 'FLAT'
  discountValue: number
  scope: 'PLATFORM' | 'CLINIC'
  clinicId?: string
  appliesTo: 'PLATFORM_FEE' | 'HOSPITAL_FEE' | 'BOTH'
  active: boolean
  maxUses?: number
  usedCount: number
  createdAt: string
  createdBy: string
}
export interface CouponDiscount {
  hospitalDiscount: number
  platformDiscount: number
  totalDiscount: number
}

export function validateCoupon(code: string, sessionId: string): Promise<{ coupon: Coupon; discount: CouponDiscount }> {
  return request(`/api/coupons/validate?code=${encodeURIComponent(code)}&sessionId=${encodeURIComponent(sessionId)}`)
}

export function fetchCoupons(): Promise<{ coupons: Coupon[] }> {
  return request('/api/admin/coupons')
}

export function createCoupon(input: {
  code: string
  discountType: 'PERCENT' | 'FLAT'
  discountValue: number
  scope: 'PLATFORM' | 'CLINIC'
  clinicId?: string
  appliesTo: 'PLATFORM_FEE' | 'HOSPITAL_FEE' | 'BOTH'
  maxUses?: number
}): Promise<{ coupon: Coupon }> {
  return request('/api/admin/coupons', { method: 'POST', body: JSON.stringify(input) })
}

export function setCouponActive(id: string, active: boolean): Promise<{ coupon: Coupon }> {
  return request(`/api/admin/coupons/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) })
}

// --- CRM ---------------------------------------------------------------

export interface PatientDirectoryRow {
  key: string
  name: string
  phone?: string
  visitCount: number
  firstVisitAt: string
  lastVisitAt: string
  lastStatus: QueueStatus
  clinicNames: string[]
  totalPaid: number
}
export function fetchPatientDirectory(): Promise<{ patients: PatientDirectoryRow[] }> {
  return request('/api/crm/patients')
}

// --- Notifications -------------------------------------------------------

export interface NotificationEvent {
  id: string
  scope: 'PLATFORM' | 'CLINIC'
  clinicId?: string
  type: 'clinic_onboarded' | 'staff_account_created' | 'doctor_account_created' | 'refund_issued' | 'coupon_created'
  message: string
  createdAt: string
  actorAccountId?: string
}
export function fetchNotifications(): Promise<{ notifications: NotificationEvent[] }> {
  return request('/api/notifications')
}

export function setPriority(entryId: string, priority: QueuePriority, assignedBy: string): Promise<{ entry: QueueEntry }> {
  return request(`/api/queue-entries/${entryId}/priority`, { method: 'POST', body: JSON.stringify({ priority, assignedBy }) })
}

// --- Appointments -------------------------------------------------------

export function fetchAppointments(sessionId: string): Promise<{ appointments: Appointment[] }> {
  return request(`/api/sessions/${sessionId}/appointments`)
}

export function bookAppointment(input: {
  sessionId: string
  scheduledTime: string
  patientName: string
  patientPhone?: string
}): Promise<{ appointment: Appointment }> {
  return request('/api/appointments', { method: 'POST', body: JSON.stringify(input) })
}

export function convertAppointment(appointmentId: string): Promise<{ appointment: Appointment; entry: QueueEntry }> {
  return request(`/api/appointments/${appointmentId}/convert`, { method: 'POST' })
}

// --- Staff: revenue & analytics ------------------------------------------

export function fetchRevenueReport(city?: string): Promise<RevenueReport> {
  return request(`/api/staff/revenue${city ? `?city=${encodeURIComponent(city)}` : ''}`)
}

// --- Auth-scoped dashboards & admin ---------------------------------------

export interface DoctorDailyTrendRow {
  date: string
  tokensSeen: number
  revenue: number
}
export interface DoctorClinicRow {
  clinicId: string
  clinicName: string
  city: string
  tokensIssued: number
  revenue: number
  due: number
}
export interface DoctorSourceRow {
  source: QueueSource
  count: number
  revenue: number
}
export interface DoctorEntryRow {
  id: string
  tokenNumber: number
  patientName: string
  clinicName: string
  date: string
  source: QueueSource
  status: QueueStatus
  amount: number
  collected: boolean
  createdAt: string
}
export interface DoctorDashboard {
  doctor: Doctor
  todayTokensSeen: number
  todayRevenue: number
  monthlyRevenue: number
  dailyAverageTokens: number
  clinics: Clinic[]
  sessions: Session[]
  dailyTrend: DoctorDailyTrendRow[]
  byClinic: DoctorClinicRow[]
  bySource: DoctorSourceRow[]
  entries: DoctorEntryRow[]
}
export function fetchDoctorDashboard(): Promise<DoctorDashboard> {
  return request('/api/dashboard/doctor')
}

export interface ClinicDashboard {
  clinic: Clinic
  doctorCount: number
  report: RevenueReport
}
export function fetchClinicDashboard(): Promise<ClinicDashboard> {
  return request('/api/dashboard/clinic')
}

export interface PlatformDashboard {
  clinics: Clinic[]
}
export function fetchPlatformDashboard(): Promise<PlatformDashboard> {
  return request('/api/dashboard/platform')
}

export function verifyCode(sessionId: string, code: string): Promise<{ entry: QueueEntry }> {
  return request(`/api/sessions/${sessionId}/verify?code=${encodeURIComponent(code)}`)
}

export function onboardClinic(input: {
  name: string
  location: string
  city: string
  adminEmail: string
  adminPassword: string
  adminName: string
}): Promise<{ clinic: Clinic; account: PublicAccount }> {
  return request('/api/admin/clinics', { method: 'POST', body: JSON.stringify(input) })
}

export function createClinicStaff(
  clinicId: string,
  input: { email: string; password: string; displayName: string; permissions?: string[] },
): Promise<{ account: PublicAccount }> {
  return request(`/api/admin/clinics/${clinicId}/staff`, { method: 'POST', body: JSON.stringify(input) })
}

export function fetchClinicStaff(clinicId: string): Promise<{ staff: PublicAccount[] }> {
  return request(`/api/admin/clinics/${clinicId}/staff`)
}

export function updateClinicStaffPermissions(clinicId: string, accountId: string, permissions: string[]): Promise<{ account: PublicAccount }> {
  return request(`/api/admin/clinics/${clinicId}/staff/${accountId}/permissions`, { method: 'PATCH', body: JSON.stringify({ permissions }) })
}

// --- Platform staff (super_admin-only, always — see the anti-escalation
// rule in admin.ts) ---------------------------------------------------

export function fetchSuperStaff(): Promise<{ staff: PublicAccount[] }> {
  return request('/api/admin/super-staff')
}

export function createSuperStaff(input: { email: string; password: string; displayName: string; permissions?: string[] }): Promise<{ account: PublicAccount }> {
  return request('/api/admin/super-staff', { method: 'POST', body: JSON.stringify(input) })
}

export function updateSuperStaffPermissions(accountId: string, permissions: string[]): Promise<{ account: PublicAccount }> {
  return request(`/api/admin/super-staff/${accountId}/permissions`, { method: 'PATCH', body: JSON.stringify({ permissions }) })
}
