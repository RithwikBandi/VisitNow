/**
 * VisitNow core data model — Phase 1 foundation.
 *
 * This is a prototype's data model, not a production EMR schema: it exists
 * to make the token-first, unified-queue product story demonstrable and
 * believable, not to solve every real hospital's operational edge case.
 * See the product brief's §24 (Prototype vs Production) for the line this
 * file deliberately does not cross.
 *
 * Two things are intentionally NOT modeled as their own entities yet:
 *
 * - **Patient accounts.** A queue entry carries a plain `patientName` (and
 *   optional `patientPhone`) instead of a `patientId` pointing at a
 *   `Patient` table. A demo needs "Aditi Rao has token 23," not a real
 *   auth/account system — building one now would be exactly the kind of
 *   production infrastructure the brief says to skip. The frontend gives a
 *   browser-local identity (a generated id kept in localStorage) purely so
 *   "my token" can find its own entry again after a refresh; that's a
 *   client-side convenience, not a backend concept.
 * - **A real prediction model for estimated wait.** It's computed on
 *   request from `avgConsultMinutes × patientsAhead`, adjusted by any
 *   doctor delay — see `estimate.ts`. Good enough to be honest and useful
 *   in a demo; a real model needs historical consultation data this
 *   prototype has no source for.
 */

export type QueueSource = 'online' | 'offline' | 'appointment'

export type QueuePriority = 'regular' | 'priority' | 'emergency'

export type QueueStatus =
  | 'waiting'
  | 'called'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'cancelled'
  | 'no_show'

/** States a queue entry can still move to from its current one — enforced
 * server-side so the UI can't, say, "complete" a token that was never
 * called. Terminal states have no further moves. */
export const QUEUE_TRANSITIONS: Record<QueueStatus, QueueStatus[]> = {
  waiting: ['called', 'skipped', 'cancelled'],
  called: ['in_progress', 'skipped', 'no_show'],
  in_progress: ['completed'],
  completed: [],
  skipped: ['waiting'], // a skipped patient can be re-queued
  cancelled: [],
  no_show: [],
}

export type DoctorStatus = 'available' | 'delayed' | 'paused' | 'closed'

/** How an online token's two fees get paid — see
 * docs/VISITNOW_PRODUCT_DECISIONS.md §3 for the full model. Offline and
 * appointment-sourced entries don't carry a payment method at all (see
 * QueueEntry below) — a walk-in patient pays the clinic in person the
 * way they always have, VisitNow's fee never applies to them. */
export type PaymentMethod = 'ONLINE' | 'PAY_AT_HOSPITAL'
export type FeeStatus = 'PAID' | 'DUE'

/** Fixed for this prototype — see the product decisions log §3. A real
 * version of this would live on a pricing/config table, not a constant. */
export const PLATFORM_FEE_INR = 9

export interface Clinic {
  id: string
  name: string
  /** Free-text is enough for a demo — no geocoding/maps in this phase. */
  location: string
  city: string
  /** Placeholder photography in demo data (see seed.ts) — swapping in a
   * real clinic's actual photo later is a seed-data change only. */
  photoUrl?: string
}

export interface Doctor {
  id: string
  name: string
  specialty: string
  qualifications: string
  /** Placeholder headshots in demo data (see seed.ts) — same swap-later
   * story as Clinic.photoUrl. */
  photoUrl?: string
  /** Reverse pointer to the Account (role: 'doctor') that logs in as this
   * doctor, if one exists — see types/account.ts. Optional because a
   * Doctor entity can exist (seeded, or added by a clinic admin) before
   * anyone's issued it a login. */
  accountId?: string
}

/**
 * One doctor, at one clinic, for one working window — the brief's central
 * "doctors work different shifts at different clinics" concept. A queue
 * belongs to exactly one session, never to a doctor directly, which is
 * what lets the same doctor have two completely independent, simultaneous
 * queues (a morning one at Clinic A, an evening one at Clinic B) without
 * either needing to know about the other.
 */
export interface Session {
  id: string
  doctorId: string
  clinicId: string
  label: string // "Morning Session", "Evening Session"
  /** ISO date this session runs on — demo data uses "today" throughout,
   * but the field exists so "upcoming session tomorrow" isn't a special
   * case later. */
  date: string
  startTime: string // "08:00"
  endTime: string // "12:00"
  /** Average minutes per consultation, used only for the wait estimate —
   * a per-session number because a dermatology follow-up and a general
   * physician's first visit genuinely take different amounts of time. */
  avgConsultMinutes: number
  /** The clinic's own token/consultation fee in INR — set by the clinic,
   * never by VisitNow, and separate from PLATFORM_FEE_INR. Snapshotted
   * onto each QueueEntry at creation time (see queueEngine.generateToken)
   * so a fee change here never retroactively changes what an already-
   * issued token owes — see decisions log §8, edge case #11. */
  hospitalFeeAmount: number

  doctorStatus: DoctorStatus
  /** Only meaningful when doctorStatus is 'delayed'. */
  delayMinutes?: number

  /** True once the session has started calling patients; sessions before
   * their start time are 'upcoming' from the frontend's point of view
   * (derived, not stored) rather than a separate stored state. */
  isQueueOpen: boolean
  /** Monotonically increasing — the next token number this session will
   * hand out, online or offline, doesn't matter which. */
  nextTokenNumber: number
  /** The token currently being seen, if any — null before the first call. */
  currentToken: number | null
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

  createdAt: string // ISO timestamp
  calledAt?: string
  startedAt?: string
  completedAt?: string

  /** Set only when priority !== 'regular' — who at the hospital assigned
   * it, per the brief's "patients can't self-declare emergency" rule. Now
   * backed by real auth (types/account.ts, store/authEngine.ts): the
   * route defaults this to the authenticated account's displayName rather
   * than trusting a client-supplied string, though an explicit override is
   * still accepted for backward compatibility. */
  priorityAssignedBy?: string

  /** Only set for source: 'online' — an offline (walk-in) or converted-
   * appointment entry never goes through VisitNow's payment step at all,
   * so these stay undefined for them rather than being forced into a
   * PAID/DUE state that doesn't mean anything for a walk-in. See
   * decisions log §3-4: payment fields never influence queue order or
   * anything in queueEngine.ts's ordering/transition logic — they exist
   * purely for the patient/receptionist to see. */
  paymentMethod?: PaymentMethod
  hospitalFeeAmount?: number
  platformFeeAmount?: number
  platformFeeStatus?: FeeStatus
  hospitalFeeStatus?: FeeStatus

  /** 4-digit, visit-specific — see decisions log §6. A lookup key for a
   * human at reception, not an authentication credential. Only issued
   * for source: 'online' (a walk-in patient is already standing in front
   * of the person who'd otherwise ask for it). */
  verificationCode?: string
}

export type AppointmentStatus = 'scheduled' | 'converted' | 'cancelled'

/** A scheduled slot that has not yet become a queue entry. Converting one
 * (see queueEngine.convertAppointment) creates a normal QueueEntry with
 * source: 'appointment' and links back here — appointments are a front
 * door into the same unified queue, never a second queue. */
export interface Appointment {
  id: string
  sessionId: string
  scheduledTime: string // "10:30"
  patientName: string
  patientPhone?: string
  status: AppointmentStatus
  /** Set once converted. */
  queueEntryId?: string
}
