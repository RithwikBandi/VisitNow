/** Reads `Authorization: Bearer <token>`, resolves it to an Account via
 * authEngine, and attaches it to `req.account` for the route to use.
 * 401s if missing/invalid — every /auth (except login), /dashboard,
 * /admin route needs this, plus the write routes in sessions.ts and
 * queueEntries.ts. Public patient/catalog GETs never call it. */
import type { NextFunction, Request, Response } from 'express'
import type { Account, AccountRole } from '../types/account.js'
import { accountForToken, hasPermission } from '../store/authEngine.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      account?: Account
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined
  const account = accountForToken(token)
  if (!account) {
    res.status(401).json({ error: 'Sign in required.' })
    return
  }
  req.account = account
  next()
}

/** Composes after requireAuth — 403s unless the authenticated account's
 * role is one of `roles`. Ownership (which clinic/doctor) is a separate
 * check, done per-route via authEngine's assertCanActOnSession/Entry —
 * this middleware only answers "is this account even the right kind of
 * account," not "is this specifically theirs." */
export function requireRole(...roles: AccountRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.account || !roles.includes(req.account.role)) {
      res.status(403).json({ error: `This area requires one of: ${roles.join(', ')}.` })
      return
    }
    next()
  }
}

/** Composes after requireAuth — 403s unless the authenticated account
 * was actually granted `module` (see authEngine.hasPermission for the
 * exact rule: super_admin/hospital_admin always pass, super_admin_staff/
 * hospital_staff need the module in their own Account.permissions). Use
 * this for GET routes that are gated by capability alone; for a write
 * on a *specific* session/entry, check ownership via
 * assertCanActOnSession/Entry first and call authEngine.assertHasPermission
 * inline afterward — the two checks stay separate on purpose. */
export function requirePermission(module: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.account || !hasPermission(req.account, module)) {
      res.status(403).json({ error: `This area requires the "${module}" permission.` })
      return
    }
    next()
  }
}
