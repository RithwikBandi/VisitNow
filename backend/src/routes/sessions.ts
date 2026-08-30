/** Everything session- and queue-scoped: viewing the live queue, issuing
 * tokens (online + offline both land here — see generateToken's `source`
 * param, the one place "unified queue" actually shows up in the API
 * surface), calling next, and setting doctor status. */
import { Router, type NextFunction, type Request, type Response } from 'express'
import { clinics, doctors, sessions } from '../store/store.js'
import { AuthError, assertCanActOnSession } from '../store/authEngine.js'
import { requireAuth } from '../middleware/auth.js'
import {
  QueueEngineError,
  callNext,
  findByVerificationCode,
  fullQueue,
  generateToken,
  setDoctorStatus,
} from '../store/queueEngine.js'

export const sessionsRouter = Router()

/** Express's route-path param inference only kicks in for a single
 * inline handler with no preceding middleware — every route below
 * chains requireAuth (or the conditional wrapper) first, which falls
 * back to a looser ParamsDictionary type TS sees as `string | string[]`.
 * One cast in one place instead of fighting the overload resolution at
 * every call site — see the identical comment in queueEntries.ts. */
function paramId(req: Request): string {
  return req.params.id as string
}

/** 404 (no such session) or 403 (not this account's session) before the
 * queue-engine call even runs — every staff-only action route below
 * calls this first. Returns true and has already responded on failure,
 * so callers just `if (!requireOwnedSession(...)) return`. */
function requireOwnedSession(req: Request, res: Response): boolean {
  const session = sessions.get(paramId(req))
  if (!session) {
    res.status(404).json({ error: 'No such session.' })
    return false
  }
  try {
    assertCanActOnSession(req.account!, session)
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.status).json({ error: err.message })
      return false
    }
    throw err
  }
  return true
}

sessionsRouter.get('/sessions/:id', (req, res) => {
  const session = sessions.get(req.params.id)
  if (!session) return res.status(404).json({ error: 'No such session.' })
  res.json({ session, doctor: doctors.get(session.doctorId), clinic: clinics.get(session.clinicId) })
})

/** The hospital panel's live queue view — every entry, in call order,
 * every status still visible (see queueEngine's fullQueue). */
sessionsRouter.get('/sessions/:id/queue', (req, res) => {
  const session = sessions.get(req.params.id)
  if (!session) return res.status(404).json({ error: 'No such session.' })
  res.json({ entries: fullQueue(req.params.id) })
})

/** Patient flow ("Get Token") and staff flow ("Generate Walk-in") both
 * call this — only `source` differs. Priority is deliberately not
 * accepted here; see setPriority in queueEntries.ts and the brief's §8.
 * Online stays unauthenticated (a patient has no account); offline is
 * reception creating a token on someone's behalf, so it now requires
 * auth + ownership of this session — applied as conditional middleware
 * rather than splitting into two routes, so generateToken keeps its
 * single-entry-point property (see its own docstring in queueEngine.ts). */
function requireAuthForOfflineToken(req: Request, res: Response, next: NextFunction): void {
  if (req.body?.source === 'offline') return requireAuth(req, res, next)
  next()
}
sessionsRouter.post('/sessions/:id/token', requireAuthForOfflineToken, (req, res) => {
  const { source, patientName, patientPhone, paymentMethod } = req.body ?? {}
  if (source !== 'online' && source !== 'offline') {
    return res.status(422).json({ error: "source must be 'online' or 'offline'." })
  }
  if (!patientName || typeof patientName !== 'string' || !patientName.trim()) {
    return res.status(422).json({ error: 'patientName is required.' })
  }
  if (source === 'online' && paymentMethod !== 'ONLINE' && paymentMethod !== 'PAY_AT_HOSPITAL') {
    return res.status(422).json({ error: "paymentMethod must be 'ONLINE' or 'PAY_AT_HOSPITAL' for an online token." })
  }
  if (source === 'offline' && !requireOwnedSession(req, res)) return
  try {
    const entry = generateToken(paramId(req), { source, patientName: patientName.trim(), patientPhone, paymentMethod })
    res.status(201).json({ entry })
  } catch (err) {
    if (err instanceof QueueEngineError) return res.status(err.status).json({ error: err.message })
    throw err
  }
})

/** Front desk's "verify code" lookup — see findByVerificationCode's own
 * doc comment. `?code=1234` rather than a body since this is a read,
 * not a mutation. */
sessionsRouter.get('/sessions/:id/verify', requireAuth, (req, res) => {
  if (!requireOwnedSession(req, res)) return
  const code = typeof req.query.code === 'string' ? req.query.code : ''
  if (!/^\d{4}$/.test(code)) {
    return res.status(422).json({ error: 'code must be a 4-digit string.' })
  }
  const entry = findByVerificationCode(paramId(req), code)
  if (!entry) return res.status(404).json({ error: 'No token found with that code.' })
  res.json({ entry })
})

sessionsRouter.post('/sessions/:id/call-next', requireAuth, (req, res) => {
  if (!requireOwnedSession(req, res)) return
  try {
    const result = callNext(paramId(req))
    res.json(result)
  } catch (err) {
    if (err instanceof QueueEngineError) return res.status(err.status).json({ error: err.message })
    throw err
  }
})

sessionsRouter.post('/sessions/:id/doctor-status', requireAuth, (req, res) => {
  if (!requireOwnedSession(req, res)) return
  const { status, delayMinutes } = req.body ?? {}
  const valid = ['available', 'delayed', 'paused', 'closed']
  if (!valid.includes(status)) {
    return res.status(422).json({ error: `status must be one of ${valid.join(', ')}.` })
  }
  try {
    const session = setDoctorStatus(paramId(req), status, typeof delayMinutes === 'number' ? delayMinutes : undefined)
    res.json({ session })
  } catch (err) {
    if (err instanceof QueueEngineError) return res.status(err.status).json({ error: err.message })
    throw err
  }
})
