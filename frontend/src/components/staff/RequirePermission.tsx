import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getCachedAccount, homeRouteFor } from '../../lib/auth'

/** The module-capability counterpart to RequireRole — some routes need
 * more than "is this a hospital_admin," they need "was this specific
 * account granted the payments module." Mirrors RequireRole's shape
 * exactly (redirect to login if signed out, redirect to their own home
 * if signed in but not allowed here — never bounce a valid session back
 * to the login form over a permission gap, that reads as a broken
 * session rather than the wrong door). Hiding here is a courtesy, same
 * as StaffLayout's role-conditional nav — every route this guards is
 * also enforced server-side via requirePermission/assertHasPermission. */
export function hasPermission(module: string): boolean {
  const account = getCachedAccount()
  if (!account) return false
  if (account.role === 'super_admin' || account.role === 'hospital_admin') return true
  return (account.permissions ?? []).includes(module)
}

export function RequirePermission({ module }: { module: string }) {
  const location = useLocation()
  const account = getCachedAccount()

  if (!account) {
    return <Navigate to="/staff/login" replace state={{ from: location.pathname }} />
  }
  if (!hasPermission(module)) {
    return <Navigate to={homeRouteFor(account.role)} replace />
  }
  return <Outlet />
}
