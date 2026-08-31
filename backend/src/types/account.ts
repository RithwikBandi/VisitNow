/**
 * Login identity for the five staff-side roles: super_admin, its
 * permission-scoped super_admin_staff, hospital_admin, its permission-
 * scoped hospital_staff, and doctor. Patients still have no account —
 * see lib/patientIdentity.ts on the frontend, unchanged and out of
 * scope here.
 *
 * Deliberately NOT a real auth system, on the same honesty precedent the
 * single shared staff passcode this replaces already established
 * (frontend/src/lib/staffAuth.ts's own doc comment): passwords are plain
 * strings compared with `===`, tokens are opaque strings in an in-memory
 * Map, no hashing/JWT/expiry. What changes from the passcode this
 * replaces is not "how secure is the credential" but "does the backend
 * actually know who's asking and only let them see/do what's theirs" —
 * see store/authEngine.ts.
 */

export type AccountRole = 'super_admin' | 'super_admin_staff' | 'hospital_admin' | 'doctor' | 'hospital_staff'

/** The module catalog a super_admin can grant, in any combination, to a
 * super_admin_staff account — see authEngine.hasPermission. Each one maps
 * to a real capability, not a placeholder: 'hospitals' = onboard/view
 * tenants, 'doctors' = attach doctor logins, 'payments' = unscoped
 * revenue view, 'settlements' = mark a clinic settled, 'refunds' =
 * issue/view any clinic's refunds, 'coupons' = coupon CRUD, 'users' =
 * create staff accounts (never edit another account's permissions — see
 * the plan's non-goals, that stays super_admin-only always), 'crm' = the
 * patient directory, 'notifications' = the platform activity feed,
 * 'reports' = trend analytics, 'system_settings' = the read-only info
 * panel. */
export type PlatformModule =
  | 'hospitals'
  | 'doctors'
  | 'payments'
  | 'settlements'
  | 'refunds'
  | 'coupons'
  | 'users'
  | 'crm'
  | 'notifications'
  | 'reports'
  | 'system_settings'

/** The module catalog a hospital_admin can grant to a hospital_staff
 * account. 'queue' = call-next/doctor-status/entry actions, 'tokens' =
 * walk-in generation + code verification, 'appointments' = the existing
 * appointment routes, 'payments' = the collect-fee action + scoped
 * revenue, 'refunds' = issuing/viewing this clinic's refunds,
 * 'notifications' = this clinic's activity feed. Deliberately excludes
 * staff/doctor account management and doctor-schedule editing — those
 * stay hospital_admin-only, never delegable, matching the product spec's
 * own capability list for Hospital Staff. */
export type HospitalModule = 'queue' | 'tokens' | 'appointments' | 'payments' | 'refunds' | 'notifications'

export interface Account {
  id: string
  role: AccountRole
  email: string
  /** Plain text on purpose for this phase — see file header. */
  password: string
  displayName: string

  /** Set for hospital_admin and hospital_staff — the one clinic this account
   * can act on. Never set for super_admin/super_admin_staff (act
   * platform-wide) or doctor (scoped via doctorId instead, since a
   * doctor can work at more than one clinic without this account
   * needing to enumerate them — see sessionsForDoctor in store.ts). */
  clinicId?: string

  /** Set for doctor accounts — links to the clinical Doctor entity this
   * login represents. The reverse pointer (Doctor.accountId) lives on
   * Doctor itself in types/index.ts. */
  doctorId?: string

  /** Only set for super_admin_staff (subset of PlatformModule) or
   * hospital_staff (subset of HospitalModule) — the modules this
   * specific account was granted. super_admin and hospital_admin never
   * carry this: they implicitly have every permission in their own
   * scope, checked once in authEngine.hasPermission rather than
   * re-derived per account. A doctor account never carries this either
   * — a doctor's access is entirely scoped by doctorId, not by module. */
  permissions?: string[]

  createdAt: string
}

/** Bearer token = the token string itself, looked up in an in-memory Map
 * (token -> AuthToken) in store.ts. No signing, no expiry — proportional
 * to this prototype's existing "everything is a Map, resets on restart"
 * architecture, not a production session-token implementation. */
export interface AuthToken {
  token: string
  accountId: string
  issuedAt: string
}

/** What the frontend actually receives — never the password. */
export type PublicAccount = Omit<Account, 'password'>

export function toPublicAccount(account: Account): PublicAccount {
  const { password: _password, ...rest } = account
  return rest
}
