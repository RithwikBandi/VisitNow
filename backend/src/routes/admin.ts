/** Tenant onboarding — super_admin only, plus the one clinic_admin
 * capability (creating their own clinic's staff logins) that also
 * belongs here rather than in staff.ts, since it's account creation,
 * not a queue/revenue concern. */
import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { accountByEmail, accounts, clinics, doctors, nextId } from '../store/store.js'
import { toPublicAccount, type Account } from '../types/account.js'
import type { Clinic } from '../types/index.js'

export const adminRouter = Router()

function addAccount(a: Omit<Account, 'id' | 'createdAt'>): Account {
  const account: Account = { id: nextId('account'), createdAt: new Date().toISOString(), ...a }
  accounts.set(account.id, account)
  return account
}

/** Creates a new tenant: a Clinic plus its first clinic_admin login.
 * These two always get created together — a clinic with no admin login
 * would be an unreachable tenant, so there's no separate "create a bare
 * clinic" endpoint. */
adminRouter.post('/admin/clinics', requireAuth, requireRole('super_admin'), (req, res) => {
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
    role: 'clinic_admin',
    email: adminEmail.trim(),
    password: adminPassword,
    displayName: adminName.trim(),
    clinicId: clinic.id,
  })

  res.status(201).json({ clinic, account: toPublicAccount(account) })
})

/** A clinic_admin may only create staff for their own clinic; a
 * super_admin may do it for any clinic (support/onboarding-on-someone's-
 * behalf case). */
adminRouter.post('/admin/clinics/:id/staff', requireAuth, requireRole('super_admin', 'clinic_admin'), (req, res) => {
  const account = req.account!
  const clinicId = req.params.id as string
  if (account.role === 'clinic_admin' && account.clinicId !== clinicId) {
    return res.status(403).json({ error: "You can only add staff to your own clinic." })
  }
  const clinic = clinics.get(clinicId)
  if (!clinic) return res.status(404).json({ error: 'No such clinic.' })

  const { email, password, displayName } = req.body ?? {}
  if (!email || !password || !displayName) {
    return res.status(422).json({ error: 'email, password, and displayName are required.' })
  }
  if (accountByEmail(email)) {
    return res.status(422).json({ error: 'An account with that email already exists.' })
  }

  const staffAccount = addAccount({ role: 'clinic_staff', email: email.trim(), password, displayName: displayName.trim(), clinicId })
  res.status(201).json({ account: toPublicAccount(staffAccount) })
})

/** Attaches a login to an existing (seed-authored) Doctor entity — there
 * is no general "create a new doctor" admin UI in this phase (see the
 * multi-tenant auth plan's non-goals), only this one action for giving
 * an already-existing doctor a way to sign in. */
adminRouter.post('/admin/doctors/:id/account', requireAuth, requireRole('super_admin', 'clinic_admin'), (req, res) => {
  const doctorId = req.params.id as string
  const doctor = doctors.get(doctorId)
  if (!doctor) return res.status(404).json({ error: 'No such doctor.' })
  if (doctor.accountId) return res.status(422).json({ error: 'This doctor already has an account.' })

  const { email, password } = req.body ?? {}
  if (!email || !password) {
    return res.status(422).json({ error: 'email and password are required.' })
  }
  if (accountByEmail(email)) {
    return res.status(422).json({ error: 'An account with that email already exists.' })
  }

  const account = addAccount({ role: 'doctor', email: email.trim(), password, displayName: doctor.name, doctorId: doctor.id })
  doctor.accountId = account.id
  res.status(201).json({ doctor, account: toPublicAccount(account) })
})
