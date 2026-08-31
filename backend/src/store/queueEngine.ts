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
import type { Coupon } from '../types/coupon.js'
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

/** The front-desk "check this patient in" lookup — a receptionist types
 * the 4-digit code a patient shows on their phone, this finds the
 * matching token. Scoped to one session (the same scope
 * generateVerificationCode uses for uniqueness) and to non-terminal
 * entries, since a code from an already-completed/cancelled visit isn't
 * useful to look up and could otherwise collide with a newer entry's
 * reused code within the same session. Returns undefined rather than
 * throwing — "no match" is a normal, expected outcome here (a mistyped
 * code), not an error condition the way a missing session id would be. */
export function findByVerificationCode(sessionId: string, code: string): QueueEntry | undefined {
  return queueEntriesForSession(sessionId).find(
    (e) => e.verificationCode === code && !['completed', 'cancelled', 'no_show'].includes(e.status),
  )
}

/**
 * The real discount math a coupon produces against one specific
 * session — called both by the public /coupons/validate preview and,
 * independently, by generateToken itself when the token is actually
 * created, so a client-computed total is never trusted as the real
 * charge (the same "server recomputes the real number" rule
 * Session.hospitalFeeAmount's own snapshot logic already follows).
 * Throws if the coupon can't be used here at all (inactive, maxed out,
 * wrong clinic) — a normal, expected outcome for a mistyped/expired
 * code, same error-shape convention as the rest of this file.
 */
export function computeDiscount(coupon: Coupon, session: Session): { hospitalDiscount: number; platformDiscount: number; totalDiscount: number } {
  if (!coupon.active) throw new QueueEngineError('This coupon is no longer active.')
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    throw new QueueEngineError('This coupon has reached its usage limit.')
  }
  if (coupon.scope === 'CLINIC' && coupon.clinicId !== session.clinicId) {
    throw new QueueEngineError("This coupon isn't valid for this clinic.")
  }

  const hospitalFee = session.hospitalFeeAmount
  const platformFee = PLATFORM_FEE_INR
  let hospitalDiscount = 0
  let platformDiscount = 0

  if (coupon.discountType === 'PERCENT') {
    if (coupon.appliesTo === 'HOSPITAL_FEE' || coupon.appliesTo === 'BOTH') hospitalDiscount = Math.round(hospitalFee * (coupon.discountValue / 100))
    if (coupon.appliesTo === 'PLATFORM_FEE' || coupon.appliesTo === 'BOTH') platformDiscount = Math.round(platformFee * (coupon.discountValue / 100))
  } else {
    // FLAT — spent against hospital fee first, any remainder against
    // platform fee, so a "BOTH" flat coupon reads as one rebate off the
    // total rather than doubling the same amount off each fee.
    let remaining = coupon.discountValue
    if (coupon.appliesTo === 'HOSPITAL_FEE' || coupon.appliesTo === 'BOTH') {
      hospitalDiscount = Math.min(hospitalFee, remaining)
      remaining -= hospitalDiscount
    }
    if (coupon.appliesTo === 'PLATFORM_FEE' || coupon.appliesTo === 'BOTH') {
      platformDiscount = Math.min(platformFee, remaining)
    }
  }

  return { hospitalDiscount, platformDiscount, totalDiscount: hospitalDiscount + platformDiscount }
}

export function generateToken(
  sessionId: string,
  input: { source: QueueEntry['source']; patientName: string; patientPhone?: string; paymentMethod?: PaymentMethod; couponCode?: string; coupon?: Coupon },
): QueueEntry {
  const session = getSessionOrThrow(sessionId)
  if (session.doctorStatus === 'closed') {
    throw new QueueEngineError('This session is closed. New tokens are not being issued.')
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

  // Payment method + verification code are online-only concepts — a
  // walk-in never goes through VisitNow's own payment step, and is
  // already standing in front of the person who'd otherwise ask for a
  // code. But the clinic's own consultation fee is real money changing
  // hands at the counter either way — see decisions log §18 (revenue
  // dashboard): a walk-in's fee just wasn't being recorded anywhere
  // before, which made "how much did we collect today" impossible to
  // answer honestly for anything but online tokens. It's snapshotted
  // here exactly like the online case (see Session.hospitalFeeAmount's
  // own doc comment on why a snapshot, not a live lookup), assumed
  // collected at issue time — a walk-in receptionist wouldn't hand over
  // a token before being paid.
  entry.hospitalFeeAmount = session.hospitalFeeAmount
  entry.hospitalFeeStatus = isOnline ? (input.paymentMethod === 'ONLINE' ? 'PAID' : 'DUE') : 'PAID'
  if (isOnline) {
    entry.paymentMethod = input.paymentMethod
    entry.platformFeeAmount = PLATFORM_FEE_INR
    // Token creation *is* the payment confirmation in this prototype —
    // there's no separate gateway step that could leave this pending.
    // See decisions log §8.7 for exactly why, and what a real
    // integration would need to do differently.
    entry.platformFeeStatus = 'PAID'
    entry.verificationCode = generateVerificationCode(sessionId)

    // Coupons are an online-only, VisitNow-payment concept — a walk-in
    // never goes through this step to redeem one against (matches
    // paymentMethod's own online-only scoping just above). The route
    // resolves the coupon by code and passes the object in; this
    // function re-derives the real discount via computeDiscount
    // (never trusts a client-supplied amount) and applies it to the
    // fee snapshot it's already taking.
    if (input.coupon) {
      const discount = computeDiscount(input.coupon, session)
      entry.hospitalFeeAmount = Math.max(0, entry.hospitalFeeAmount - discount.hospitalDiscount)
      entry.platformFeeAmount = Math.max(0, entry.platformFeeAmount - discount.platformDiscount)
      entry.couponCode = input.coupon.code
      entry.discountAmount = discount.totalDiscount
      input.coupon.usedCount += 1
    }
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
    throw new QueueEngineError(`Queue is ${session.doctorStatus}. Resume it before calling the next patient.`)
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

/** The front-desk "cash received" action — closes a real, confirmed gap:
 * before this, hospitalFeeStatus was set once at token creation ('DUE'
 * for a PAY_AT_HOSPITAL entry) and never updated again anywhere, so
 * there was no way for reception to ever mark that fee as actually
 * collected in person. Only valid for a still-DUE PAY_AT_HOSPITAL
 * entry — an ONLINE entry's hospitalFeeStatus is already 'PAID' at
 * creation, and there's nothing to "collect" for offline/appointment
 * entries either (their fee is assumed collected at issue time, see
 * generateToken above). */
export function collectHospitalFee(entryId: string, collectedBy: string): QueueEntry {
  const entry = getEntryOrThrow(entryId)
  if (entry.paymentMethod !== 'PAY_AT_HOSPITAL' || entry.hospitalFeeStatus !== 'DUE') {
    throw new QueueEngineError('This token has no pending clinic-fee collection.')
  }
  entry.hospitalFeeStatus = 'PAID'
  entry.hospitalFeeCollectedAt = new Date().toISOString()
  entry.hospitalFeeCollectedBy = collectedBy
  return entry
}

/** Resolves decisions log edge case #31 ("no refund model"). Eligible
 * only for a cancelled/no-show entry that actually had a fee paid —
 * refunding a still-waiting token makes no sense (nothing was
 * collected to give back), and refunding a completed visit isn't a
 * "cancel" scenario this prototype models. `amount` is clamped to
 * whatever was actually paid (hospital fee if collected + platform
 * fee if paid) rather than trusted as-is from the caller — the same
 * "server computes the real number" rule generateToken's fee snapshot
 * already follows. Fee *statuses* stay PAID (historically true);
 * refundStatus layers on top rather than reopening them to DUE. */
export function issueRefund(entryId: string, amount: number | undefined, reason: string | undefined, issuedBy: string): QueueEntry {
  const entry = getEntryOrThrow(entryId)
  if (!['cancelled', 'no_show'].includes(entry.status)) {
    throw new QueueEngineError('Only a cancelled or no-show token can be refunded.')
  }
  if (entry.refundStatus === 'REFUNDED') {
    throw new QueueEngineError('This token has already been refunded.')
  }
  const paidHospitalFee = entry.hospitalFeeStatus === 'PAID' ? (entry.hospitalFeeAmount ?? 0) : 0
  const paidPlatformFee = entry.platformFeeStatus === 'PAID' ? (entry.platformFeeAmount ?? 0) : 0
  const maxRefundable = paidHospitalFee + paidPlatformFee
  if (maxRefundable <= 0) {
    throw new QueueEngineError('Nothing was collected on this token, so there is nothing to refund.')
  }
  const refundAmount = Math.min(Math.max(0, amount ?? maxRefundable), maxRefundable)
  entry.refundStatus = 'REFUNDED'
  entry.refundAmount = refundAmount
  entry.refundedAt = new Date().toISOString()
  entry.refundedBy = issuedBy
  entry.refundReason = reason
  return entry
}

/** Staff-only — see the module docstring in types/index.ts and the
 * brief's §8: a patient can never set their own priority. `assignedBy`
 * now defaults to the authenticated account's own display name at the
 * route level (see queueEntries.ts) rather than trusting a client-
 * supplied string, closing the gap this comment used to flag before
 * real staff accounts existed. */
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
