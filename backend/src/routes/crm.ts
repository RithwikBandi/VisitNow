/** Patient directory — platform-level 'crm' module only. There is no
 * hospital-level equivalent (see accountTypes' HospitalModule list) —
 * a single clinic already sees its own patients in its queue history;
 * a cross-clinic directory is specifically a platform capability. */
import { Router } from 'express'
import { requireAuth, requirePermission, requireRole } from '../middleware/auth.js'
import { computePatientDirectory } from '../store/crm.js'

export const crmRouter = Router()

crmRouter.get('/crm/patients', requireAuth, requireRole('super_admin', 'super_admin_staff'), requirePermission('crm'), (req, res) => {
  const clinicId = typeof req.query.clinicId === 'string' ? req.query.clinicId : undefined
  res.json({ patients: computePatientDirectory(clinicId) })
})
