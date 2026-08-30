/**
 * Login + ownership rules for the four staff-side roles — the identity
 * counterpart to queueEngine.ts's queue rules, deliberately shaped the
 * same way (a throw-based error class, small pure functions, doc
 * comments explaining the "why" not just the "what") so this reads as
 * the same codebase, not a bolted-on auth library.
 *
 * See types/account.ts for what stays intentionally simplified here
 * (plain-text passwords, unsigned opaque tokens) and why that's still a
 * real improvement over the single shared passcode it replaces: the
 * thing that changed isn't credential strength, it's that the backend
 * now knows *who* is asking and actually checks *what's theirs* before
 * acting — see assertCanActOnSession below, which is the one function
 * every scoped route calls.
 */
import type { Account, AccountRole } from '../types/account.js'
import type { QueueEntry, Session } from '../types/index.js'
import { accountByEmail, accounts, authTokens, nextId, sessions } from './store.js'

export class AuthError extends Error {
  status: number
  constructor(message: string, status = 401) {
    super(message)
    this.status = status
  }
}

export function login(email: string, password: string): { account: Account; token: string } {
  const account = accountByEmail(email)
  if (!account || account.password !== password) {
    throw new AuthError('Incorrect email or password.')
  }
  const token = nextId('token')
  authTokens.set(token, { token, accountId: account.id, issuedAt: new Date().toISOString() })
  return { account, token }
}

export function logout(token: string): void {
  authTokens.delete(token)
}

export function accountForToken(token: string | undefined): Account | undefined {
  if (!token) return undefined
  const authToken = authTokens.get(token)
  if (!authToken) return undefined
  return accounts.get(authToken.accountId)
}

/** Throws AuthError(403) unless `account` may act on `session` —
 * true for: super_admin always; clinic_admin/clinic_staff whose
 * clinicId matches the session's clinic; doctor whose doctorId matches
 * the session's doctor. This is the one ownership check every scoped
 * route calls (directly for session-scoped actions, or via
 * assertCanActOnEntry for entry-scoped ones) — keeping it in one place
 * means "who can touch this session" is answered once, not re-derived
 * per route the way it would drift if each route wrote its own check. */
export function assertCanActOnSession(account: Account, session: Session): void {
  if (account.role === 'super_admin') return
  if (account.role === 'clinic_admin' || account.role === 'clinic_staff') {
    if (account.clinicId === session.clinicId) return
  }
  if (account.role === 'doctor') {
    if (account.doctorId === session.doctorId) return
  }
  throw new AuthError("You don't have access to this session.", 403)
}

export function assertCanActOnEntry(account: Account, entry: QueueEntry): void {
  const session = sessions.get(entry.sessionId)
  if (!session) throw new AuthError('No such session.', 404)
  assertCanActOnSession(account, session)
}

/** Throws AuthError(403) unless account.role is one of `roles` — used by
 * routes gated by role alone (no specific session/entry to check
 * ownership against yet, e.g. "only a clinic_admin may onboard staff"). */
export function assertHasRole(account: Account, ...roles: AccountRole[]): void {
  if (!roles.includes(account.role)) {
    throw new AuthError(`This action requires one of: ${roles.join(', ')}.`, 403)
  }
}
