/** Appointments — deliberately the smallest route file here, matching
 * the brief's §14: a secondary capability, not the core product. An
 * appointment converts into a normal QueueEntry (source: 'appointment')
 * the moment it's meant to join the queue; it's never a queue of its own. */
import { Router } from 'express'
import { nextId, queueEntries, sessions } from '../store/store.js'
import { appointments, appointmentsForSession } from '../store/store.js'
import type { Appointment } from '../types/index.js'

export const appointmentsRouter = Router()

appointmentsRouter.get('/sessions/:id/appointments', (req, res) => {
  res.json({ appointments: appointmentsForSession(req.params.id) })
})

appointmentsRouter.post('/appointments', (req, res) => {
  const { sessionId, scheduledTime, patientName, patientPhone } = req.body ?? {}
  if (!sessions.has(sessionId)) return res.status(404).json({ error: 'No such session.' })
  if (!scheduledTime || typeof scheduledTime !== 'string') {
    return res.status(422).json({ error: 'scheduledTime is required, e.g. "10:30".' })
  }
  if (!patientName || typeof patientName !== 'string' || !patientName.trim()) {
    return res.status(422).json({ error: 'patientName is required.' })
  }
  const appointment: Appointment = {
    id: nextId('appt'),
    sessionId,
    scheduledTime,
    patientName: patientName.trim(),
    patientPhone,
    status: 'scheduled',
  }
  appointments.set(appointment.id, appointment)
  res.status(201).json({ appointment })
})

/** Turns a scheduled appointment into a real queue entry — the one place
 * an appointment actually enters the unified queue (brief's §14). */
appointmentsRouter.post('/appointments/:id/convert', (req, res) => {
  const appointment = appointments.get(req.params.id)
  if (!appointment) return res.status(404).json({ error: 'No such appointment.' })
  if (appointment.status !== 'scheduled') {
    return res.status(400).json({ error: `Appointment is already ${appointment.status}.` })
  }
  const session = sessions.get(appointment.sessionId)
  if (!session) return res.status(404).json({ error: 'No such session.' })

  const entry = {
    id: nextId('queue'),
    sessionId: appointment.sessionId,
    tokenNumber: session.nextTokenNumber,
    source: 'appointment' as const,
    priority: 'regular' as const,
    status: 'waiting' as const,
    patientName: appointment.patientName,
    patientPhone: appointment.patientPhone,
    createdAt: new Date().toISOString(),
    // Same reasoning as the offline case in queueEngine.generateToken —
    // an appointment-converted visit still owes the clinic its
    // consultation fee, collected at the counter, not through VisitNow.
    hospitalFeeAmount: session.hospitalFeeAmount,
    hospitalFeeStatus: 'PAID' as const,
  }
  session.nextTokenNumber += 1
  queueEntries.set(entry.id, entry)

  appointment.status = 'converted'
  appointment.queueEntryId = entry.id

  res.json({ appointment, entry })
})

appointmentsRouter.post('/appointments/:id/cancel', (req, res) => {
  const appointment = appointments.get(req.params.id)
  if (!appointment) return res.status(404).json({ error: 'No such appointment.' })
  if (appointment.status !== 'scheduled') {
    return res.status(400).json({ error: `Appointment is already ${appointment.status}.` })
  }
  appointment.status = 'cancelled'
  res.json({ appointment })
})
