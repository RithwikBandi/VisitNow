/** Hospital-side-only endpoints. Now genuinely role-scoped server-side
 * (see store/authEngine.ts, middleware/auth.ts) — a clinic_admin only
 * ever sees their own clinic's revenue, a super_admin sees everything,
 * and a doctor/clinic_staff account can't reach this at all (their own
 * scoped views are /dashboard/doctor and the operational queue console,
 * not a revenue report). */
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { computeRevenueReport, scopeReportToClinic } from '../store/revenue.js'

export const staffRouter = Router()

staffRouter.get('/staff/revenue', requireAuth, (req, res) => {
  const account = req.account!
  const report = computeRevenueReport()
  if (account.role === 'super_admin') return res.json(report)
  if (account.role === 'clinic_admin' && account.clinicId) {
    return res.json(scopeReportToClinic(report, account.clinicId))
  }
  res.status(403).json({ error: 'This area requires a clinic admin or super admin account.' })
})
