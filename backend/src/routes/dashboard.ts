/** The three "who am I and what's mine" landing views — distinct from
 * /staff/revenue (a clinic_admin/super_admin report table) in that these
 * are always "me," never take a clinic/doctor id from the caller: a
 * doctor's dashboard is resolved from req.account.doctorId, never a URL
 * param, so there's no id to even get wrong. */
import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { clinics, doctors, queueEntriesForSession, sessionsForClinic, sessionsForDoctor } from '../store/store.js'
import { computeRevenueReport, feeFor, scopeReportToClinic } from '../store/revenue.js'
import type { Clinic, QueueEntry, Session } from '../types/index.js'

export const dashboardRouter = Router()

const today = () => new Date().toISOString().slice(0, 10)
const thisMonth = () => today().slice(0, 7) // "2026-08"

interface Row {
  entry: QueueEntry
  session: Session
  amount: number
  collected: boolean
}

function rowsFor(entriesBySession: Map<string, Session>): Row[] {
  const rows: Row[] = []
  for (const session of entriesBySession.values()) {
    for (const entry of queueEntriesForSession(session.id)) {
      const fee = feeFor(entry, session)
      rows.push({ entry, session, amount: fee.amount, collected: fee.collected })
    }
  }
  return rows
}

/** Doctor's own dashboard: today's tokens, today's revenue, monthly
 * revenue, and a daily-average token count over the days elapsed this
 * month — computed directly from this doctor's own sessions (via
 * sessionsForDoctor), not by name-matching a shared report, so it stays
 * correct even if two doctors ever share a display name. */
dashboardRouter.get('/dashboard/doctor', requireAuth, requireRole('doctor'), (req, res) => {
  const account = req.account!
  const doctor = doctors.get(account.doctorId!)
  if (!doctor) return res.status(404).json({ error: 'No doctor record linked to this account.' })

  const mySessions = sessionsForDoctor(doctor.id)
  const byId = new Map(mySessions.map((s) => [s.id, s]))
  const rows = rowsFor(byId)

  const day = today()
  const month = thisMonth()
  const todayRows = rows.filter((r) => r.session.date === day)
  const monthRows = rows.filter((r) => r.session.date.startsWith(month))

  const sum = (list: Row[]) => list.reduce((total, r) => total + (r.collected ? r.amount : 0), 0)
  const daysElapsedThisMonth = Number(day.slice(-2)) // "2026-08-30" -> 30

  const myClinicIds = [...new Set(mySessions.map((s) => s.clinicId))]
  const myClinics = myClinicIds.map((id) => clinics.get(id)).filter((c): c is Clinic => Boolean(c))

  res.json({
    doctor,
    todayTokensSeen: todayRows.length,
    todayRevenue: sum(todayRows),
    monthlyRevenue: sum(monthRows),
    dailyAverageTokens: daysElapsedThisMonth > 0 ? Math.round((monthRows.length / daysElapsedThisMonth) * 10) / 10 : 0,
    clinics: myClinics,
    sessions: mySessions,
  })
})

/** Clinic admin's own dashboard: the same scoped revenue report
 * /staff/revenue already returns for this role, plus a small clinic-
 * overview header (doctor/staff counts) a raw revenue table doesn't
 * carry. Doesn't duplicate scopeReportToClinic's aggregation — calls it. */
dashboardRouter.get('/dashboard/clinic', requireAuth, requireRole('clinic_admin'), (req, res) => {
  const account = req.account!
  const clinic = clinics.get(account.clinicId!)
  if (!clinic) return res.status(404).json({ error: 'No clinic linked to this account.' })

  const report = scopeReportToClinic(computeRevenueReport(), clinic.id)
  const doctorCount = new Set(sessionsForClinic(clinic.id).map((s) => s.doctorId)).size

  res.json({ clinic, doctorCount, report })
})

/** Super admin's platform overview: every clinic, and the full unscoped
 * revenue report — the same one a clinic_admin gets a filtered slice of. */
dashboardRouter.get('/dashboard/platform', requireAuth, requireRole('super_admin'), (_req, res) => {
  res.json({ clinics: [...clinics.values()], report: computeRevenueReport() })
})
