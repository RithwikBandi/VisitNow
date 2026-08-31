/** The three "who am I and what's mine" landing views — distinct from
 * /staff/revenue (a hospital_admin/super_admin report table) in that these
 * are always "me," never take a clinic/doctor id from the caller: a
 * doctor's dashboard is resolved from req.account.doctorId, never a URL
 * param, so there's no id to even get wrong. */
import { Router } from 'express'
import { requireAuth, requirePermission, requireRole } from '../middleware/auth.js'
import { clinics, doctors, queueEntriesForSession, sessionsForClinic, sessionsForDoctor } from '../store/store.js'
import { computeRevenueReport, feeFor, scopeReportToClinic } from '../store/revenue.js'
import type { Clinic, QueueEntry, QueueSource, QueueStatus, Session } from '../types/index.js'

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

export interface DoctorDailyTrendRow {
  date: string
  tokensSeen: number
  revenue: number
}

/** Groups this doctor's own rows by day — no new aggregation, just the
 * same rows the four stat cards above already sum, regrouped by
 * session.date instead of collapsed into a single today/month number.
 * All-time rather than scoped to "this month" like the monthlyRevenue
 * card: a demo's seed data is all dated "today," so a month-scoped trend
 * would render as one point — a deliberately broader window than the
 * card next to it, not an inconsistency. */
function dailyTrendFor(rows: Row[]): DoctorDailyTrendRow[] {
  const byDate = new Map<string, DoctorDailyTrendRow>()
  for (const r of rows) {
    const row = byDate.get(r.session.date) ?? { date: r.session.date, tokensSeen: 0, revenue: 0 }
    row.tokensSeen += 1
    if (r.collected) row.revenue += r.amount
    byDate.set(r.session.date, row)
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export interface DoctorClinicRow {
  clinicId: string
  clinicName: string
  city: string
  tokensIssued: number
  revenue: number
  due: number
}

/** Revenue broken down by which of the doctor's clinics it came from —
 * "total revenue from his total clinics," not just one combined number.
 * All-time, same window as dailyTrend, same reason (a demo's seed data
 * is all dated today). */
function byClinicFor(rows: Row[]): DoctorClinicRow[] {
  const byClinic = new Map<string, DoctorClinicRow>()
  for (const r of rows) {
    const clinic = clinics.get(r.session.clinicId)
    const row = byClinic.get(r.session.clinicId) ?? {
      clinicId: r.session.clinicId,
      clinicName: clinic?.name ?? 'Unknown clinic',
      city: clinic?.city ?? 'Unknown',
      tokensIssued: 0,
      revenue: 0,
      due: 0,
    }
    row.tokensIssued += 1
    if (r.collected) row.revenue += r.amount
    else row.due += r.amount
    byClinic.set(r.session.clinicId, row)
  }
  return [...byClinic.values()].sort((a, b) => b.revenue - a.revenue)
}

export interface DoctorSourceRow {
  source: QueueSource
  count: number
  revenue: number
}

/** How this doctor's patients actually reach the queue — the "analysis"
 * cut StaffRevenuePage's own bySource already gives hospitals, scoped
 * here to just this doctor's own rows. */
function bySourceFor(rows: Row[]): DoctorSourceRow[] {
  const bySource = new Map<QueueSource, DoctorSourceRow>()
  for (const r of rows) {
    const row = bySource.get(r.entry.source) ?? { source: r.entry.source, count: 0, revenue: 0 }
    row.count += 1
    if (r.collected) row.revenue += r.amount
    bySource.set(r.entry.source, row)
  }
  return [...bySource.values()]
}

export interface DoctorEntryRow {
  id: string
  tokenNumber: number
  patientName: string
  clinicName: string
  date: string
  source: QueueSource
  status: QueueStatus
  amount: number
  collected: boolean
  createdAt: string
}

/** The printable/exportable line-item report — same "download CSV /
 * print" affordance StaffRevenuePage already gives a hospital, scoped
 * to just this doctor's own tokens across every clinic they work at. */
function entriesFor(rows: Row[]): DoctorEntryRow[] {
  return rows
    .map((r) => ({
      id: r.entry.id,
      tokenNumber: r.entry.tokenNumber,
      patientName: r.entry.patientName,
      clinicName: clinics.get(r.session.clinicId)?.name ?? 'Unknown clinic',
      date: r.session.date,
      source: r.entry.source,
      status: r.entry.status,
      amount: r.amount,
      collected: r.collected,
      createdAt: r.entry.createdAt,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
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
    dailyTrend: dailyTrendFor(rows),
    byClinic: byClinicFor(rows),
    bySource: bySourceFor(rows),
    entries: entriesFor(rows),
  })
})

/** Clinic admin's own dashboard: the same scoped revenue report
 * /staff/revenue already returns for this role, plus a small clinic-
 * overview header (doctor/staff counts) a raw revenue table doesn't
 * carry. Doesn't duplicate scopeReportToClinic's aggregation — calls it. */
dashboardRouter.get('/dashboard/clinic', requireAuth, requireRole('hospital_admin'), (req, res) => {
  const account = req.account!
  const clinic = clinics.get(account.clinicId!)
  if (!clinic) return res.status(404).json({ error: 'No clinic linked to this account.' })

  const report = scopeReportToClinic(computeRevenueReport(), clinic.id)
  const doctorCount = new Set(sessionsForClinic(clinic.id).map((s) => s.doctorId)).size

  res.json({ clinic, doctorCount, report })
})

/** Super admin's platform overview: every clinic, gated on the
 * 'hospitals' module so a super_admin_staff account only reaches this
 * "view tenants" capability if actually granted it — matching the
 * product spec's own "Staff A -> Hospitals + Doctors" example. Revenue
 * is deliberately not duplicated here: /admin/revenue (reusing
 * StaffRevenuePage, gated on 'payments' separately) is the one place
 * for that, so a "hospitals"-only staffer never sees money data this
 * endpoint didn't need to expose. */
dashboardRouter.get('/dashboard/platform', requireAuth, requireRole('super_admin', 'super_admin_staff'), requirePermission('hospitals'), (_req, res) => {
  res.json({ clinics: [...clinics.values()] })
})
