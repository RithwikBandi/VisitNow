/**
 * Login identity for the four staff-side roles (super_admin, clinic_admin,
 * doctor, clinic_staff). Patients still have no account — see
 * lib/patientIdentity.ts on the frontend, unchanged and out of scope here.
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

export type AccountRole = 'super_admin' | 'clinic_admin' | 'doctor' | 'clinic_staff'

export interface Account {
  id: string
  role: AccountRole
  email: string
  /** Plain text on purpose for this phase — see file header. */
  password: string
  displayName: string

  /** Set for clinic_admin and clinic_staff — the one clinic this account
   * can act on. Never set for super_admin (acts on all) or doctor (scoped
   * via doctorId instead, since a doctor can work at more than one clinic
   * without this account needing to enumerate them — see
   * sessionsForDoctor in store.ts). */
  clinicId?: string

  /** Set for doctor accounts — links to the clinical Doctor entity this
   * login represents. The reverse pointer (Doctor.accountId) lives on
   * Doctor itself in types/index.ts. */
  doctorId?: string

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
