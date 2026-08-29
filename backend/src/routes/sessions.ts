/** Everything session- and queue-scoped: viewing the live queue, issuing
 * tokens (online + offline both land here — see generateToken's `source`
 * param, the one place "unified queue" actually shows up in the API
 * surface), calling next, and setting doctor status. */
import { Router } from 'express'
import { clinics, doctors, sessions } from '../store/store.js'
import {
  QueueEngineError,
  callNext,
  fullQueue,
  generateToken,
  setDoctorStatus,
} from '../store/queueEngine.js'

export const sessionsRouter = Router()

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
 * accepted here; see setPriority in queueEntries.ts and the brief's §8. */
sessionsRouter.post('/sessions/:id/token', (req, res) => {
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
  try {
    const entry = generateToken(req.params.id, { source, patientName: patientName.trim(), patientPhone, paymentMethod })
    res.status(201).json({ entry })
  } catch (err) {
    if (err instanceof QueueEngineError) return res.status(err.status).json({ error: err.message })
    throw err
  }
})

sessionsRouter.post('/sessions/:id/call-next', (req, res) => {
  try {
    const result = callNext(req.params.id)
    res.json(result)
  } catch (err) {
    if (err instanceof QueueEngineError) return res.status(err.status).json({ error: err.message })
    throw err
  }
})

sessionsRouter.post('/sessions/:id/doctor-status', (req, res) => {
  const { status, delayMinutes } = req.body ?? {}
  const valid = ['available', 'delayed', 'paused', 'closed']
  if (!valid.includes(status)) {
    return res.status(422).json({ error: `status must be one of ${valid.join(', ')}.` })
  }
  try {
    const session = setDoctorStatus(req.params.id, status, typeof delayMinutes === 'number' ? delayMinutes : undefined)
    res.json({ session })
  } catch (err) {
    if (err instanceof QueueEngineError) return res.status(err.status).json({ error: err.message })
    throw err
  }
})
