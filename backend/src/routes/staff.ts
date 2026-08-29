/** Hospital-side-only endpoints — no separate backend auth exists for
 * these any more than for anything else in this prototype (see
 * lib/staffAuth.ts's own doc comment: the staff gate is a client-side
 * product gate, not a security boundary, by explicit prototype-scope
 * decision). This file exists to keep "things only the staff console
 * calls" visually separate from the patient-facing catalog/session
 * routes, not to imply a different trust level the backend enforces. */
import { Router } from 'express'
import { computeRevenueReport } from '../store/revenue.js'

export const staffRouter = Router()

staffRouter.get('/staff/revenue', (_req, res) => {
  res.json(computeRevenueReport())
})
