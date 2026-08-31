/** Tenant onboarding and account creation. A mix of platform-level
 * actions (gated by role + the relevant module permission) and
 * hospital_admin's own delegated capabilities (gated by clinic
 * ownership instead — a hospital_admin has no module list, they
 * implicitly hold everything in their own clinic). */
import { Router, type Request, type Response } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { assertHasPermission, AuthError } from '../store/authEngine.js'
import { accountByEmail, accounts, clinics, doctors, nextId, sessionsForDoctor } from '../store/store.js'
import { emit } from '../store/notify.js'
import { toPublicAccount, type Account } from '../types/account.js'
import type { Clinic } from '../types/index.js'

export const adminRouter = Router()

function addAccount(a: Omit<Account, 'id' | 'createdAt'>): Account {
  const account: Account = { id: nextId('account'), createdAt: new Date().toISOString(), ...a }
  accounts.set(account.id, account)
  return account
}

/** super_admin always passes; super_admin_staff needs the module.
 * hospital_admin/hospital_staff/doctor never reach routes gated by
 * this — those platform-only actions use requireRole to exclude them
 * before this even runs. */
function requirePlatformPermission(req: Request, res: Response, module: string): boolean {
  try {
    assertHasPermission(req.account!, module)
    return true
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.status).json({ error: err.message })
      return false
    }
    throw err
  }
}

/** Creates a new tenant: a Clinic plus its first hospital_admin login.
 * These two always get created together — a clinic with no admin login
 * would be an unreachable tenant, so there's no separate "create a bare
 * clinic" endpoint. Gated on the 'hospitals' module — matches the
 * product spec's own "Staff A -> Hospitals + Doctors" example: a
 * super_admin_staff account with that module can onboard a new
 * hospital, not just view the list. */
adminRouter.post('/admin/clinics', requireAuth, requireRole('super_admin', 'super_admin_staff'), (req, res) => {
  if (!requirePlatformPermission(req, res, 'hospitals')) return
  const { name, location, city, adminEmail, adminPassword, adminName } = req.body ?? {}
  for (const [key, value] of Object.entries({ name, location, city, adminEmail, adminPassword, adminName })) {
    if (!value || typeof value !== 'string' || !value.trim()) {
      return res.status(422).json({ error: `${key} is required.` })
    }
  }
  if (accountByEmail(adminEmail)) {
    return res.status(422).json({ error: 'An account with that email already exists.' })
  }

  const clinic: Clinic = { id: nextId('clinic'), name: name.trim(), location: location.trim(), city: city.trim() }
  clinics.set(clinic.id, clinic)
  const account = addAccount({
    role: 'hospital_admin',
    email: adminEmail.trim(),
    password: adminPassword,
    displayName: adminName.trim(),
    clinicId: clinic.id,
  })

  emit('PLATFORM', 'clinic_onboarded', `${clinic.name} joined VisitNow`, { actorAccountId: req.account!.id })
  res.status(201).json({ clinic, account: toPublicAccount(account) })
})

/** A hospital_admin may only create staff for their own clinic; a
 * platform account (super_admin always, super_admin_staff with
 * 'hospitals') may do it for any clinic — the support/onboarding-on-
 * someone's-behalf case. `permissions` lets the creating admin assign
 * the new hospital_staff account's module list at creation time,
 * matching the product spec's own examples ("Reception Staff -> offline
 * patients + appointments + queue"). */
adminRouter.post('/admin/clinics/:id/staff', requireAuth, requireRole('super_admin', 'super_admin_staff', 'hospital_admin'), (req, res) => {
  const account = req.account!
  const clinicId = req.params.id as string
  if (account.role === 'hospital_admin') {
    if (account.clinicId !== clinicId) return res.status(403).json({ error: 'You can only add staff to your own clinic.' })
  } else if (account.role === 'super_admin_staff') {
    if (!requirePlatformPermission(req, res, 'hospitals')) return
  }
  const clinic = clinics.get(clinicId)
  if (!clinic) return res.status(404).json({ error: 'No such clinic.' })

  const { email, password, displayName, permissions } = req.body ?? {}
  if (!email || !password || !displayName) {
    return res.status(422).json({ error: 'email, password, and displayName are required.' })
  }
  if (accountByEmail(email)) {
    return res.status(422).json({ error: 'An account with that email already exists.' })
  }

  const staffAccount = addAccount({
    role: 'hospital_staff',
    email: email.trim(),
    password,
    displayName: displayName.trim(),
    clinicId,
    permissions: Array.isArray(permissions) ? permissions.filter((p) => typeof p === 'string') : [],
  })
  emit('CLINIC', 'staff_account_created', `${staffAccount.displayName} added as hospital staff`, { clinicId, actorAccountId: account.id })
  res.status(201).json({ account: toPublicAccount(staffAccount) })
})

/** Lists this clinic's hospital_staff accounts — hospital_admin's own
 * clinic only, or any clinic for a platform account with 'hospitals'.
 * Powers StaffTeamPage's roster + the permission editor. */
adminRouter.get('/admin/clinics/:id/staff', requireAuth, requireRole('super_admin', 'super_admin_staff', 'hospital_admin'), (req, res) => {
  const account = req.account!
  const clinicId = req.params.id as string
  if (account.role === 'hospital_admin') {
    if (account.clinicId !== clinicId) return res.status(403).json({ error: 'You can only view your own clinic’s staff.' })
  } else if (account.role === 'super_admin_staff') {
    if (!requirePlatformPermission(req, res, 'hospitals')) return
  }
  const staff = [...accounts.values()].filter((a) => a.role === 'hospital_staff' && a.clinicId === clinicId).map(toPublicAccount)
  res.json({ staff })
})

/** Edits an existing hospital_staff account's module list — same
 * ownership rule as creating one. Never lets anyone touch a
 * hospital_admin's own account (there's nothing to edit — admins hold
 * everything implicitly) or another clinic's staff. */
adminRouter.patch('/admin/clinics/:id/staff/:accountId/permissions', requireAuth, requireRole('super_admin', 'super_admin_staff', 'hospital_admin'), (req, res) => {
  const account = req.account!
  const clinicId = req.params.id as string
  if (account.role === 'hospital_admin') {
    if (account.clinicId !== clinicId) return res.status(403).json({ error: 'You can only manage your own clinic’s staff.' })
  } else if (account.role === 'super_admin_staff') {
    if (!requirePlatformPermission(req, res, 'hospitals')) return
  }
  const target = accounts.get(req.params.accountId as string)
  if (!target || target.role !== 'hospital_staff' || target.clinicId !== clinicId) {
    return res.status(404).json({ error: 'No such staff account at this clinic.' })
  }
  const { permissions } = req.body ?? {}
  if (!Array.isArray(permissions) || !permissions.every((p) => typeof p === 'string')) {
    return res.status(422).json({ error: 'permissions must be an array of strings.' })
  }
  target.permissions = permissions
  res.json({ account: toPublicAccount(target) })
})

/** Attaches a login to an existing (seed-authored) Doctor entity — there
 * is no general "create a new doctor" admin UI in this phase (see the
 * multi-tenant auth plan's non-goals), only this one action for giving
 * an already-existing doctor a way to sign in. A hospital_admin may only
 * do this for a doctor who actually has a session at their own clinic —
 * a real ownership check that didn't exist before (a doctor can work at
 * more than one clinic, so "any hospital_admin can grant any doctor a
 * login" would have been a real cross-tenant gap). */
adminRouter.post('/admin/doctors/:id/account', requireAuth, requireRole('super_admin', 'super_admin_staff', 'hospital_admin'), (req, res) => {
  const account = req.account!
  const doctorId = req.params.id as string
  const doctor = doctors.get(doctorId)
  if (!doctor) return res.status(404).json({ error: 'No such doctor.' })
  if (doctor.accountId) return res.status(422).json({ error: 'This doctor already has an account.' })

  if (account.role === 'hospital_admin') {
    const practicesHere = sessionsForDoctor(doctorId).some((s) => s.clinicId === account.clinicId)
    if (!practicesHere) return res.status(403).json({ error: 'This doctor has no session at your clinic.' })
  } else if (account.role === 'super_admin_staff') {
    if (!requirePlatformPermission(req, res, 'doctors')) return
  }

  const { email, password } = req.body ?? {}
  if (!email || !password) {
    return res.status(422).json({ error: 'email and password are required.' })
  }
  if (accountByEmail(email)) {
    return res.status(422).json({ error: 'An account with that email already exists.' })
  }

  const newAccount = addAccount({ role: 'doctor', email: email.trim(), password, displayName: doctor.name, doctorId: doctor.id })
  doctor.accountId = newAccount.id
  emit('CLINIC', 'doctor_account_created', `${doctor.name} can now sign in`, { clinicId: account.clinicId, actorAccountId: account.id })
  res.status(201).json({ doctor, account: toPublicAccount(newAccount) })
})

/** Platform staff management — super_admin only, always, even for a
 * super_admin_staff account holding the 'users' module. See the plan's
 * explicit anti-escalation rule: nobody but the actual super_admin can
 * create or edit a platform staff account's permissions, since that
 * account could otherwise grant itself (or a peer) more than it has. */
adminRouter.get('/admin/super-staff', requireAuth, requireRole('super_admin'), (_req, res) => {
  const staff = [...accounts.values()].filter((a) => a.role === 'super_admin_staff').map(toPublicAccount)
  res.json({ staff })
})

adminRouter.post('/admin/super-staff', requireAuth, requireRole('super_admin'), (req, res) => {
  const { email, password, displayName, permissions } = req.body ?? {}
  if (!email || !password || !displayName) {
    return res.status(422).json({ error: 'email, password, and displayName are required.' })
  }
  if (accountByEmail(email)) {
    return res.status(422).json({ error: 'An account with that email already exists.' })
  }
  const account = addAccount({
    role: 'super_admin_staff',
    email: email.trim(),
    password,
    displayName: displayName.trim(),
    permissions: Array.isArray(permissions) ? permissions.filter((p) => typeof p === 'string') : [],
  })
  res.status(201).json({ account: toPublicAccount(account) })
})

adminRouter.patch('/admin/super-staff/:accountId/permissions', requireAuth, requireRole('super_admin'), (req, res) => {
  const target = accounts.get(req.params.accountId as string)
  if (!target || target.role !== 'super_admin_staff') return res.status(404).json({ error: 'No such platform staff account.' })
  const { permissions } = req.body ?? {}
  if (!Array.isArray(permissions) || !permissions.every((p) => typeof p === 'string')) {
    return res.status(422).json({ error: 'permissions must be an array of strings.' })
  }
  target.permissions = permissions
  res.json({ account: toPublicAccount(target) })
})
