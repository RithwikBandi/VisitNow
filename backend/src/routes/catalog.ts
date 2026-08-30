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
  const doctorSessions = sessionsForDoctor(doctor.id).map((s) => ({ ...s, doctor, clinic: clinics.get(s.clinicId) }))
  res.json({ doctor, sessions: doctorSessions })
})

/** Every session, each with its clinic/doctor already attached — this is
 * what the patient home screen's "today's doctors" list renders from
 * directly, no N+1 client-side lookups. Optional `clinicId` filter is
 * for StaffHomePage's session picker: a clinic_admin/clinic_staff
 * account shouldn't see another clinic's sessions in their own picker
 * (the write actions are already server-enforced regardless — see
 * sessions.ts's requireOwnedSession — this filter is about not showing
 * the option in the first place, same "don't even offer what you can't
 * do" spirit as StaffLayout's role-conditional nav). */
catalogRouter.get('/sessions/today', (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const { clinicId } = req.query
  let list = [...sessions.values()].filter((s) => s.date === today)
  if (clinicId && typeof clinicId === 'string') {
    list = list.filter((s) => s.clinicId === clinicId)
  }
  res.json({ sessions: list.map((s) => ({ ...s, doctor: doctors.get(s.doctorId), clinic: clinics.get(s.clinicId) })) })
})
