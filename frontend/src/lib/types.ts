/** Mirrors backend/src/types/index.ts exactly — see that file for the
 * reasoning behind each design choice (no Patient entity, no real
 * prediction model, etc.). Kept as a hand-mirrored copy rather than a
 * shared package: two small files staying in sync by inspection is
 * proportional for a prototype; a shared workspace package is the kind
 * of infrastructure worth adding only once this stops being one. */

export type QueueSource = 'online' | 'offline' | 'appointment'
export type QueuePriority = 'regular' | 'priority' | 'emergency'
export type QueueStatus = 'waiting' | 'called' | 'in_progress' | 'completed' | 'skipped' | 'cancelled' | 'no_show'
export type DoctorStatus = 'available' | 'delayed' | 'paused' | 'closed'

export interface Clinic {
  id: string
  name: string
  location: string
  city: string
  photoUrl?: string
}

export interface Doctor {
  id: string
  name: string
  specialty: string
  qualifications: string
  photoUrl?: string
}

export interface Session {
  id: string
  doctorId: string
  clinicId: string
  label: string
  date: string
  startTime: string
  endTime: string
  avgConsultMinutes: number
  doctorStatus: DoctorStatus
  delayMinutes?: number
  isQueueOpen: boolean
  nextTokenNumber: number
  currentToken: number | null
}

export interface SessionWithRelations extends Session {
  doctor: Doctor
  clinic: Clinic
}

export interface QueueEntry {
  id: string
  sessionId: string
  tokenNumber: number
  source: QueueSource
  priority: QueuePriority
  status: QueueStatus
  patientName: string
  patientPhone?: string
  createdAt: string
  calledAt?: string
  startedAt?: string
  completedAt?: string
  priorityAssignedBy?: string
}

export type AppointmentStatus = 'scheduled' | 'converted' | 'cancelled'

export interface Appointment {
  id: string
  sessionId: string
  scheduledTime: string
  patientName: string
  patientPhone?: string
  status: AppointmentStatus
  queueEntryId?: string
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
