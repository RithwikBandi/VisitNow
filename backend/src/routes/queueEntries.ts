/** Actions on one specific queue entry — the hospital panel's
 * skip/complete/no-show/priority buttons, and the patient side's single
 * "track my token" read. */
import { Router, type Request, type Response } from 'express'
import { clinics, doctors, queueEntries, sessions } from '../store/store.js'
import { assertCanActOnEntry, assertHasPermission, AuthError } from '../store/authEngine.js'
import { requireAuth } from '../middleware/auth.js'
import { emit } from '../store/notify.js'
import type { QueueEntry } from '../types/index.js'
import {
  QueueEngineError,
  cancelEntry,
  collectHospitalFee,
  completeEntry,
  estimateWait,
  issueRefund,
  markNoShow,
  requeueEntry,
  setPriority,
  skipEntry,
  startConsultation,
} from '../store/queueEngine.js'

export const queueEntriesRouter = Router()

/** Express's route-path param inference (":id" -> `params.id: string`)
 * only kicks in for a single inline handler with no preceding
 * middleware; chaining requireAuth before the handler (every action
 * route below does) falls back to a looser ParamsDictionary type whose
 * values TS sees as `string | string[]`. One cast in one place instead
 * of fighting the overload resolution at every call site. */
function paramId(req: Request): string {
  return req.params.id as string
}

/** Every action route below needs an entry to exist AND the caller to
 * own its session before the queue-engine transition even runs — this
 * one helper does both checks and returns the entry, or has already
 * written the 404/403 response and returned undefined. Kept separate
 * from queueEngine.ts's own guard() (which maps QueueEngineError, a
 * different error type) rather than merged into it. */
function requireOwnedEntry(req: Request, res: Response): QueueEntry | undefined {
  const entry = queueEntries.get(paramId(req))
  if (!entry) {
    res.status(404).json({ error: 'No such queue entry.' })
    return undefined
  }
  try {
    assertCanActOnEntry(req.account!, entry)
  } catch (err) {
    res.status(403).json({ error: (err as Error).message })
    return undefined
  }
  return entry
}

/** Runs a queue-engine action and turns a QueueEngineError into the right
 * HTTP status instead of a generic 500 — every entry-action route below
 * is one line of this plus one line of response. Returns undefined (and
 * has already written the error response) on failure, so callers just
 * check truthiness before responding with the result. */
function guard<T>(res: Response, fn: () => T): T | undefined {
  try {
    return fn()
  } catch (err) {
    if (err instanceof QueueEngineError) {
      res.status(err.status).json({ error: err.message })
      return undefined
    }
    throw err
  }
}

/** What a patient's "track my token" screen polls — the entry itself,
 * plus the live wait estimate and what token is currently being seen. */
queueEntriesRouter.get('/queue-entries/:id', (req, res) => {
  const entry = queueEntries.get(req.params.id)
  if (!entry) return res.status(404).json({ error: 'No such queue entry.' })
  const session = sessions.get(entry.sessionId)
  const doctor = session ? doctors.get(session.doctorId) : undefined
  const clinic = session ? clinics.get(session.clinicId) : undefined
  const { patientsAhead, estimatedMinutes } = estimateWait(entry.sessionId, entry.id)
  res.json({ entry, session, doctor, clinic, patientsAhead, estimatedMinutes })
})

// Staff-only actions below (start/complete/skip/requeue/no-show/priority)
// require auth + ownership of the entry's session. `cancel` is the one
// exception — see its own route below: that's the *patient's* "cancel
// my visit" button on ActiveVisitPage, not a staff action, and patients
// have no accounts to authenticate (unchanged, out of scope — see the
// multi-tenant auth plan's non-goals).

/** Wraps requireOwnedEntry with the 'queue' module check — every entry-
 * action route below needs both: ownership (whose entry is this) and
 * capability (were you granted the queue module — always true for
 * hospital_admin/super_admin/a doctor acting on their own session, only
 * true for hospital_staff/super_admin_staff if actually granted it). */
function requireOwnedEntryWithQueue(req: Request, res: Response): QueueEntry | undefined {
  const entry = requireOwnedEntry(req, res)
  if (!entry) return undefined
  try {
    assertHasPermission(req.account!, 'queue')
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.status).json({ error: err.message })
      return undefined
    }
    throw err
  }
  return entry
}

queueEntriesRouter.post('/queue-entries/:id/start', requireAuth, (req, res) => {
  if (!requireOwnedEntryWithQueue(req, res)) return
  const result = guard(res, () => startConsultation(paramId(req)))
  if (result) res.json({ entry: result })
})

queueEntriesRouter.post('/queue-entries/:id/complete', requireAuth, (req, res) => {
  if (!requireOwnedEntryWithQueue(req, res)) return
  const result = guard(res, () => completeEntry(paramId(req)))
  if (result) res.json({ entry: result })
})

queueEntriesRouter.post('/queue-entries/:id/skip', requireAuth, (req, res) => {
  if (!requireOwnedEntryWithQueue(req, res)) return
  const result = guard(res, () => skipEntry(paramId(req)))
  if (result) res.json({ entry: result })
})

queueEntriesRouter.post('/queue-entries/:id/requeue', requireAuth, (req, res) => {
  if (!requireOwnedEntryWithQueue(req, res)) return
  const result = guard(res, () => requeueEntry(paramId(req)))
  if (result) res.json({ entry: result })
})

queueEntriesRouter.post('/queue-entries/:id/no-show', requireAuth, (req, res) => {
  if (!requireOwnedEntryWithQueue(req, res)) return
  const result = guard(res, () => markNoShow(paramId(req)))
  if (result) res.json({ entry: result })
})

/** Front desk's "cash received" action — see queueEngine.collectHospitalFee
 * for what this actually closes (a real, previously-unfillable gap).
 * Gated on the 'payments' module, not 'queue' — a reception account
 * with only queue/tokens (like the seeded Sunrise front desk) can run
 * the queue but not touch money; the seeded Sunrise payments desk is
 * the inverse. */
queueEntriesRouter.post('/queue-entries/:id/collect-fee', requireAuth, (req, res) => {
  const entry = requireOwnedEntry(req, res)
  if (!entry) return
  try {
    assertHasPermission(req.account!, 'payments')
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }
  const result = guard(res, () => collectHospitalFee(paramId(req), req.account!.displayName))
  if (result) res.json({ entry: result })
})

/** Issuing a refund — gated on 'refunds', separate from 'payments' on
 * purpose (a platform staffer might be trusted to view/refund without
 * blanket revenue visibility, matching the seeded "VisitNow Ops —
 * Payments" account which actually holds both, but the two seeded
 * hospital_staff accounts show the split: front desk has neither,
 * payments desk has both). */
queueEntriesRouter.post('/queue-entries/:id/refund', requireAuth, (req, res) => {
  const entry = requireOwnedEntry(req, res)
  if (!entry) return
  try {
    assertHasPermission(req.account!, 'refunds')
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }
  const { amount, reason } = req.body ?? {}
  const result = guard(res, () =>
    issueRefund(paramId(req), typeof amount === 'number' ? amount : undefined, typeof reason === 'string' ? reason : undefined, req.account!.displayName),
  )
  if (result) {
    const session = sessions.get(result.sessionId)
    emit('CLINIC', 'refund_issued', `₹${result.refundAmount} refunded for token #${result.tokenNumber}`, {
      clinicId: session?.clinicId,
      actorAccountId: req.account!.id,
    })
    res.json({ entry: result })
  }
})

/** Patient-facing — see the comment above this block. Deliberately no
 * requireAuth here. */
queueEntriesRouter.post('/queue-entries/:id/cancel', (req, res) => {
  const result = guard(res, () => cancelEntry(req.params.id))
  if (result) res.json({ entry: result })
})

queueEntriesRouter.post('/queue-entries/:id/priority', requireAuth, (req, res) => {
  const entry = requireOwnedEntryWithQueue(req, res)
  if (!entry) return
  const { priority, assignedBy } = req.body ?? {}
  const valid = ['regular', 'priority', 'emergency']
  if (!valid.includes(priority)) {
    return res.status(422).json({ error: `priority must be one of ${valid.join(', ')}.` })
  }
  // Prefer the authenticated account's name over a client-supplied
  // string — closes the gap types/index.ts's own comment on
  // priorityAssignedBy used to flag ("not enforced by real auth"). An
  // explicit assignedBy is still accepted as an override.
  const name = typeof assignedBy === 'string' && assignedBy.trim() ? assignedBy.trim() : req.account!.displayName
  const result = guard(res, () => setPriority(paramId(req), priority, name))
  if (result) res.json({ entry: result })
})
