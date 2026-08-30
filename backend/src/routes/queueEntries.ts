/** Actions on one specific queue entry — the hospital panel's
 * skip/complete/no-show/priority buttons, and the patient side's single
 * "track my token" read. */
import { Router, type Request, type Response } from 'express'
import { clinics, doctors, queueEntries, sessions } from '../store/store.js'
import { assertCanActOnEntry } from '../store/authEngine.js'
import { requireAuth } from '../middleware/auth.js'
import type { QueueEntry } from '../types/index.js'
import {
  QueueEngineError,
  cancelEntry,
  completeEntry,
  estimateWait,
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

queueEntriesRouter.post('/queue-entries/:id/start', requireAuth, (req, res) => {
  if (!requireOwnedEntry(req, res)) return
  const result = guard(res, () => startConsultation(paramId(req)))
  if (result) res.json({ entry: result })
})

queueEntriesRouter.post('/queue-entries/:id/complete', requireAuth, (req, res) => {
  if (!requireOwnedEntry(req, res)) return
  const result = guard(res, () => completeEntry(paramId(req)))
  if (result) res.json({ entry: result })
})

queueEntriesRouter.post('/queue-entries/:id/skip', requireAuth, (req, res) => {
  if (!requireOwnedEntry(req, res)) return
  const result = guard(res, () => skipEntry(paramId(req)))
  if (result) res.json({ entry: result })
})

queueEntriesRouter.post('/queue-entries/:id/requeue', requireAuth, (req, res) => {
  if (!requireOwnedEntry(req, res)) return
  const result = guard(res, () => requeueEntry(paramId(req)))
  if (result) res.json({ entry: result })
})

queueEntriesRouter.post('/queue-entries/:id/no-show', requireAuth, (req, res) => {
  if (!requireOwnedEntry(req, res)) return
  const result = guard(res, () => markNoShow(paramId(req)))
  if (result) res.json({ entry: result })
})

/** Patient-facing — see the comment above this block. Deliberately no
 * requireAuth here. */
queueEntriesRouter.post('/queue-entries/:id/cancel', (req, res) => {
  const result = guard(res, () => cancelEntry(req.params.id))
  if (result) res.json({ entry: result })
})

queueEntriesRouter.post('/queue-entries/:id/priority', requireAuth, (req, res) => {
  const entry = requireOwnedEntry(req, res)
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
