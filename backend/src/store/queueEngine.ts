/**
 * All queue business rules live here — the "unified queue" concept from
 * the brief is really just this: one ordering function and one set of
 * status transitions that don't care whether an entry's source is
 * online, offline, or a converted appointment.
 */
import {
  PLATFORM_FEE_INR,
  QUEUE_TRANSITIONS,
  type PaymentMethod,
  type QueueEntry,
  type QueuePriority,
  type QueueStatus,
  type Session,
} from '../types/index.js'
import { nextId, queueEntries, queueEntriesForSession, sessions } from './store.js'

export class QueueEngineError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

function getSessionOrThrow(sessionId: string): Session {
  const session = sessions.get(sessionId)
  if (!session) throw new QueueEngineError(`No such session: ${sessionId}`, 404)
  return session
}

function getEntryOrThrow(entryId: string): QueueEntry {
  const entry = queueEntries.get(entryId)
  if (!entry) throw new QueueEngineError(`No such queue entry: ${entryId}`, 404)
  return entry
}

/** Emergency first, then priority, then regular — within a tier, strict
 * token order (i.e. arrival/assignment order). This is deliberately the
 * simplest rule that makes the product story demonstrable: priority
 * patients move up, but never past an emergency, and never so far up
 * that arrival order stops mattering within a tier. A real hospital's
 * actual policy is configurable in spirit only right now (see the
 * brief's §8) — this one function is the whole "algorithm," on purpose. */
const PRIORITY_RANK: Record<QueuePriority, number> = { emergency: 0, priority: 1, regular: 2 }

/** Negative when `a` is called before `b`, positive when after, 0 for equal
 * standing (can't happen in practice — token numbers are unique). Exported
 * on its own so callers that need "is this one ahead of that one" (see
 * estimateWait) don't have to re-sort a whole array to ask a pairwise
 * question. */
export function compareEntries(a: QueueEntry, b: QueueEntry): number {
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.tokenNumber - b.tokenNumber
}

export function orderEntries(entries: QueueEntry[]): QueueEntry[] {
  return [...entries].sort(compareEntries)
}

/** The queue as the hospital panel sees it: every entry, in call order,
 * regardless of status (completed/skipped ones stay visible — see the
 * brief's §10, entries are never deleted). */
export function fullQueue(sessionId: string): QueueEntry[] {
  getSessionOrThrow(sessionId)
  return orderEntries(queueEntriesForSession(sessionId))
}

/** Just the still-waiting ones, in the order they'll be called. */
export function waitingQueue(sessionId: string): QueueEntry[] {
  return fullQueue(sessionId).filter((e) => e.status === 'waiting')
}

/** 4 digits, unique among this session's currently non-terminal entries
 * — see decisions log §8.10 for why that scope (not globally unique) is
 * the right one, and why a small collision surface is an accepted
 * trade-off for what is a lookup key, not a credential. */
function generateVerificationCode(sessionId: string): string {
  const taken = new Set(
    queueEntriesForSession(sessionId)
      .filter((e) => !['completed', 'cancelled', 'no_show'].includes(e.status))
      .map((e) => e.verificationCode)
      .filter(Boolean),
  )
  let code: string
  do {
    code = String(Math.floor(1000 + Math.random() * 9000))
  } while (taken.has(code))
  return code
}

export function generateToken(
  sessionId: string,
  input: { source: QueueEntry['source']; patientName: string; patientPhone?: string; paymentMethod?: PaymentMethod },
): QueueEntry {
  const session = getSessionOrThrow(sessionId)
  if (session.doctorStatus === 'closed') {
    throw new QueueEngineError('This session is closed — new tokens are not being issued.')
  }

  const isOnline = input.source === 'online'
  if (isOnline && !input.paymentMethod) {
    throw new QueueEngineError('paymentMethod is required for an online token.')
  }

  const entry: QueueEntry = {
    id: nextId('queue'),
    sessionId,
    tokenNumber: session.nextTokenNumber,
    source: input.source,
    // Patients (and the offline reception flow) can only ever create a
    // 'regular' entry — priority/emergency is a separate staff-only
    // action (setPriority, below), exactly per the brief's §8.
    priority: 'regular',
    status: 'waiting',
    patientName: input.patientName,
    patientPhone: input.patientPhone,
    createdAt: new Date().toISOString(),
  }

  // Payment + verification code only apply to online tokens — see the
  // QueueEntry field docs in types/index.ts and decisions log §3/§6. A
  // walk-in never goes through VisitNow's payment step at all.
  if (isOnline) {
    entry.paymentMethod = input.paymentMethod
    entry.hospitalFeeAmount = session.hospitalFeeAmount
    entry.platformFeeAmount = PLATFORM_FEE_INR
    // Token creation *is* the payment confirmation in this prototype —
    // there's no separate gateway step that could leave this pending.
    // See decisions log §8.7 for exactly why, and what a real
    // integration would need to do differently.
    entry.platformFeeStatus = 'PAID'
    entry.hospitalFeeStatus = input.paymentMethod === 'ONLINE' ? 'PAID' : 'DUE'
    entry.verificationCode = generateVerificationCode(sessionId)
  }

  session.nextTokenNumber += 1
  queueEntries.set(entry.id, entry)
  return entry
}

function transition(entry: QueueEntry, to: QueueStatus): void {
  const allowed = QUEUE_TRANSITIONS[entry.status]
  if (!allowed.includes(to)) {
    throw new QueueEngineError(`Can't move token ${entry.tokenNumber} from ${entry.status} to ${to}.`)
  }
  entry.status = to
  const now = new Date().toISOString()
  if (to === 'called') entry.calledAt = now
  if (to === 'in_progress') entry.startedAt = now
  if (to === 'completed') entry.completedAt = now
}

/** The hospital panel's single most important button. Finishes whoever's
 * currently being seen (if anyone) and calls the next person in queue
 * order — exactly the two-step transition the brief's §11 walks through
 * ("20 → COMPLETED, 21 → CALLED"). */
export function callNext(sessionId: string): { completed: QueueEntry | null; called: QueueEntry | null } {
  const session = getSessionOrThrow(sessionId)
  if (session.doctorStatus === 'paused' || session.doctorStatus === 'closed') {
    throw new QueueEngineError(`Queue is ${session.doctorStatus} — resume it before calling the next patient.`)
  }

  const current = fullQueue(sessionId).find((e) => e.status === 'called' || e.status === 'in_progress')
  let completed: QueueEntry | null = null
  if (current) {
    transition(current, 'completed')
    completed = current
  }

  const next = waitingQueue(sessionId)[0] ?? null
  if (next) {
    transition(next, 'called')
    session.currentToken = next.tokenNumber
  }
  return { completed, called: next }
}

export function skipEntry(entryId: string): QueueEntry {
  const entry = getEntryOrThrow(entryId)
  transition(entry, 'skipped')
  return entry
}

export function requeueEntry(entryId: string): QueueEntry {
  const entry = getEntryOrThrow(entryId)
  transition(entry, 'waiting')
  return entry
}

export function startConsultation(entryId: string): QueueEntry {
  const entry = getEntryOrThrow(entryId)
  transition(entry, 'in_progress')
  return entry
}

export function completeEntry(entryId: string): QueueEntry {
  const entry = getEntryOrThrow(entryId)
  transition(entry, 'completed')
  return entry
}

export function markNoShow(entryId: string): QueueEntry {
  const entry = getEntryOrThrow(entryId)
  transition(entry, 'no_show')
  return entry
}

export function cancelEntry(entryId: string): QueueEntry {
  const entry = getEntryOrThrow(entryId)
  transition(entry, 'cancelled')
  return entry
}

/** Staff-only — see the module docstring in types/index.ts and the
 * brief's §8: a patient can never set their own priority. There's no
 * staff-account system in this prototype to actually gate that (see
 * §24 — not the focus), so `assignedBy` is a free-text name from the
 * hospital-panel UI, not an authenticated identity yet. */
export function setPriority(entryId: string, priority: QueuePriority, assignedBy: string): QueueEntry {
  const entry = getEntryOrThrow(entryId)
  if (entry.status !== 'waiting') {
    throw new QueueEngineError('Only a waiting token can have its priority changed.')
  }
  entry.priority = priority
  entry.priorityAssignedBy = priority === 'regular' ? undefined : assignedBy
  return entry
}

export function setDoctorStatus(sessionId: string, status: Session['doctorStatus'], delayMinutes?: number): Session {
  const session = getSessionOrThrow(sessionId)
  session.doctorStatus = status
  session.delayMinutes = status === 'delayed' ? delayMinutes : undefined
  return session
}

/**
 * Simple, honest, and clearly labeled as an estimate — per the brief's
 * §13, not a prediction model. `patientsAhead` counts everyone still
 * waiting ahead of this entry in call order, plus one more slot if
 * someone is currently being seen (their consultation isn't done yet
 * either). Delay minutes from the doctor's status are added on top.
 */
export function estimateWait(sessionId: string, entryId: string): { patientsAhead: number; estimatedMinutes: number } {
  const session = getSessionOrThrow(sessionId)
  const entry = getEntryOrThrow(entryId)
  const ordered = fullQueue(sessionId)

  const inProgress = ordered.some((e) => e.status === 'called' || e.status === 'in_progress')
  const aheadWaiting = ordered.filter((e) => e.status === 'waiting' && e.id !== entry.id && compareEntries(e, entry) < 0).length

  const patientsAhead = entry.status === 'waiting' ? aheadWaiting + (inProgress ? 1 : 0) : 0
  const delay = session.doctorStatus === 'delayed' ? (session.delayMinutes ?? 0) : 0
  const estimatedMinutes = patientsAhead * session.avgConsultMinutes + delay

  return { patientsAhead, estimatedMinutes }
}
