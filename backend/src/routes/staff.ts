/** Hospital-side-only endpoints. Now genuinely role-scoped server-side
 * (see store/authEngine.ts, middleware/auth.ts) — a hospital_admin only
 * ever sees their own clinic's revenue, a super_admin sees everything,
 * and a doctor/hospital_staff account can't reach this at all (their own
 * scoped views are /dashboard/doctor and the operational queue console,
 * not a revenue report). */
import { Router } from 'express'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { computeRevenueReport, listRefundCandidates, scopeReportToCity, scopeReportToClinic } from '../store/revenue.js'

export const staffRouter = Router()

staffRouter.get('/staff/revenue', requireAuth, requirePermission('payments'), (req, res) => {
  const account = req.account!
  const report = computeRevenueReport()
  if (account.role === 'super_admin' || account.role === 'super_admin_staff') {
    // ?city= is a platform-only filter — "select a location and see data
    // for that location" from the role spec. A hospital account is
    // already scoped to one clinic below, so a city param from them
    // would be meaningless and is ignored rather than erroring.
    const city = typeof req.query.city === 'string' ? req.query.city : undefined
    return res.json(city ? scopeReportToCity(report, city) : report)
  }
  if ((account.role === 'hospital_admin' || account.role === 'hospital_staff') && account.clinicId) {
    return res.json(scopeReportToClinic(report, account.clinicId))
  }
  res.status(403).json({ error: 'This area requires a clinic admin, clinic staffer, or super admin account.' })
})

/** Refund oversight — separate from /staff/revenue's own 'payments' gate
 * on purpose: an account might hold 'refunds' without 'payments' (view/
 * issue refunds without blanket revenue visibility) or the reverse. */
staffRouter.get('/staff/refunds', requireAuth, requirePermission('refunds'), (req, res) => {
  const account = req.account!
  if (account.role === 'super_admin' || account.role === 'super_admin_staff') {
    return res.json({ refunds: listRefundCandidates() })
  }
  res.json({ refunds: listRefundCandidates(account.clinicId) })
})
