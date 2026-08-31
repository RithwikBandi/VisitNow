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
 * true for: super_admin and super_admin_staff always (both are platform
 * roles with no clinicId to begin with — a platform staffer holding,
 * say, the 'refunds' permission needs to reach every clinic's sessions
 * by definition, so ownership here is a no-op for them; the actual
 * gate for what they can *do* once they're allowed near a session is
 * assertHasPermission, a separate check); hospital_admin/hospital_staff
 * whose clinicId matches the session's clinic; doctor whose doctorId
 * matches the session's doctor. This is the one ownership check every
 * scoped route calls (directly for session-scoped actions, or via
 * assertCanActOnEntry for entry-scoped ones) — keeping it in one place
 * means "who can touch this session" is answered once, not re-derived
 * per route the way it would drift if each route wrote its own check. */
export function assertCanActOnSession(account: Account, session: Session): void {
  if (account.role === 'super_admin' || account.role === 'super_admin_staff') return
  if (account.role === 'hospital_admin' || account.role === 'hospital_staff') {
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
 * ownership against yet, e.g. "only a hospital_admin may onboard staff"). */
export function assertHasRole(account: Account, ...roles: AccountRole[]): void {
  if (!roles.includes(account.role)) {
    throw new AuthError(`This action requires one of: ${roles.join(', ')}.`, 403)
  }
}

/**
 * Module-level capability check — a *separate* concern from
 * assertCanActOnSession's ownership check, never merged into it. A
 * route that needs both (e.g. "is this your clinic's entry" AND "were
 * you granted the payments module") calls both explicitly.
 *
 * super_admin and hospital_admin implicitly hold every permission in
 * their own scope — there's nothing to enumerate for an owner role, by
 * definition. super_admin_staff/hospital_staff are checked against
 * whatever subset of the module catalog they were actually granted
 * (Account.permissions); an account with no permissions array behaves
 * as if it has none, not everything — a staff account created without
 * explicit modules can do nothing until a super_admin/hospital_admin
 * actually assigns some, which is the correct fail-closed default for
 * a brand-new staff login. A doctor account implicitly passes only the
 * 'queue' module (running their own consultation queue — call-next,
 * start/complete/skip/no-show/priority on their own sessions, already
 * gated separately by doctorId ownership) — not 'payments', 'refunds',
 * 'tokens', or 'appointments'. A doctor isn't the one handling cash or
 * generating walk-in tokens at the counter; that's reception's job,
 * same real-world division the product spec's own role list implies. */
export function hasPermission(account: Account, module: string): boolean {
  if (account.role === 'super_admin' || account.role === 'hospital_admin') return true
  if (account.role === 'super_admin_staff' || account.role === 'hospital_staff') {
    return (account.permissions ?? []).includes(module)
  }
  if (account.role === 'doctor') return module === 'queue'
  return false
}

export function assertHasPermission(account: Account, module: string): void {
  if (!hasPermission(account, module)) {
    throw new AuthError(`This action requires the "${module}" permission.`, 403)
  }
}
