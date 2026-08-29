/** Actions on one specific queue entry — the hospital panel's
 * skip/complete/no-show/priority buttons, and the patient side's single
 * "track my token" read. */
import { Router, type Response } from 'express'
import { clinics, doctors, queueEntries, sessions } from '../store/store.js'
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

queueEntriesRouter.post('/queue-entries/:id/start', (req, res) => {
  const result = guard(res, () => startConsultation(req.params.id))
  if (result) res.json({ entry: result })
})

queueEntriesRouter.post('/queue-entries/:id/complete', (req, res) => {
  const result = guard(res, () => completeEntry(req.params.id))
  if (result) res.json({ entry: result })
})

queueEntriesRouter.post('/queue-entries/:id/skip', (req, res) => {
  const result = guard(res, () => skipEntry(req.params.id))
  if (result) res.json({ entry: result })
})

queueEntriesRouter.post('/queue-entries/:id/requeue', (req, res) => {
  const result = guard(res, () => requeueEntry(req.params.id))
  if (result) res.json({ entry: result })
})

queueEntriesRouter.post('/queue-entries/:id/no-show', (req, res) => {
  const result = guard(res, () => markNoShow(req.params.id))
  if (result) res.json({ entry: result })
})

queueEntriesRouter.post('/queue-entries/:id/cancel', (req, res) => {
  const result = guard(res, () => cancelEntry(req.params.id))
  if (result) res.json({ entry: result })
})

queueEntriesRouter.post('/queue-entries/:id/priority', (req, res) => {
  const { priority, assignedBy } = req.body ?? {}
  const valid = ['regular', 'priority', 'emergency']
  if (!valid.includes(priority)) {
    return res.status(422).json({ error: `priority must be one of ${valid.join(', ')}.` })
  }
  if (priority !== 'regular' && (!assignedBy || typeof assignedBy !== 'string' || !assignedBy.trim())) {
    return res.status(422).json({ error: 'assignedBy is required when setting a non-regular priority.' })
  }
  const result = guard(res, () => setPriority(req.params.id, priority, (assignedBy ?? '').trim()))
  if (result) res.json({ entry: result })
})
