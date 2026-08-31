/** Read side of the in-app activity feed — see store/notify.ts for the
 * write side and types/notification.ts for what's deliberately out of
 * scope (real push/SMS/email). Scoped by role, not by a query param: a
 * platform account (super_admin always, super_admin_staff needs the
 * 'notifications' module) sees PLATFORM-scope events; a hospital
 * account (hospital_admin always, hospital_staff needs the module)
 * sees only their own clinic's CLINIC-scope events. A doctor has no
 * 'notifications' module in either catalog and gets a plain 403 — this
 * feed was never part of a doctor's own console. */
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { assertHasPermission, AuthError } from '../store/authEngine.js'
import { notifications } from '../store/store.js'

export const notificationsRouter = Router()

notificationsRouter.get('/notifications', requireAuth, (req, res) => {
  const account = req.account!
  try {
    if (account.role === 'super_admin' || account.role === 'super_admin_staff') {
      assertHasPermission(account, 'notifications')
      const events = [...notifications.values()].filter((n) => n.scope === 'PLATFORM')
      res.json({ notifications: events.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) })
      return
    }
    if (account.role === 'hospital_admin' || account.role === 'hospital_staff') {
      assertHasPermission(account, 'notifications')
      const events = [...notifications.values()].filter((n) => n.scope === 'CLINIC' && n.clinicId === account.clinicId)
      res.json({ notifications: events.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) })
      return
    }
    res.status(403).json({ error: 'This account has no notifications feed.' })
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.status).json({ error: err.message })
      return
    }
    throw err
  }
})
