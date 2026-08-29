import { ApiError, type Appointment, type Clinic, type Doctor, type PaymentMethod, type QueueEntry, type QueuePriority, type QueueSource, type Session, type SessionWithRelations } from './types'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
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

export function fetchTodaysSessions(): Promise<{ sessions: SessionWithRelations[] }> {
  return request('/api/sessions/today')
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
  input: { source: QueueSource; patientName: string; patientPhone?: string; paymentMethod?: PaymentMethod },
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
