/** Read-only lookups a patient's "find a doctor" flow needs: clinics,
 * doctors, and — for a given doctor or clinic — their sessions. Nothing
 * here is more than a list/filter over the store; the actual queue logic
 * lives in sessions.ts and queueEngine.ts. */
import { Router } from 'express'
import { clinics, doctors, sessions, sessionsForClinic, sessionsForDoctor } from '../store/store.js'

export const catalogRouter = Router()

catalogRouter.get('/clinics', (_req, res) => {
  res.json({ clinics: [...clinics.values()] })
})

catalogRouter.get('/clinics/:id', (req, res) => {
  const clinic = clinics.get(req.params.id)
  if (!clinic) return res.status(404).json({ error: 'No such clinic.' })
  const clinicSessions = sessionsForClinic(clinic.id).map((s) => ({ ...s, doctor: doctors.get(s.doctorId), clinic }))
  res.json({ clinic, sessions: clinicSessions })
})

catalogRouter.get('/doctors', (req, res) => {
  const { clinicId, specialty } = req.query
  let list = [...doctors.values()]
  if (specialty && typeof specialty === 'string') {
    list = list.filter((d) => d.specialty.toLowerCase() === specialty.toLowerCase())
  }
  if (clinicId && typeof clinicId === 'string') {
    const doctorIdsAtClinic = new Set(sessionsForClinic(clinicId).map((s) => s.doctorId))
    list = list.filter((d) => doctorIdsAtClinic.has(d.id))
  }
  res.json({ doctors: list })
})

catalogRouter.get('/doctors/:id', (req, res) => {
  const doctor = doctors.get(req.params.id)
  if (!doctor) return res.status(404).json({ error: 'No such doctor.' })
  const doctorSessions = sessionsForDoctor(doctor.id).map((s) => ({ ...s, clinic: clinics.get(s.clinicId) }))
  res.json({ doctor, sessions: doctorSessions })
})

/** Every session, each with its clinic/doctor already attached — this is
 * what the patient home screen's "today's doctors" list renders from
 * directly, no N+1 client-side lookups. */
catalogRouter.get('/sessions/today', (_req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const list = [...sessions.values()]
    .filter((s) => s.date === today)
    .map((s) => ({ ...s, doctor: doctors.get(s.doctorId), clinic: clinics.get(s.clinicId) }))
  res.json({ sessions: list })
})
