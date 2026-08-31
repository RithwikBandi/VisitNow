import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getCachedAccount, homeRouteFor } from '../../lib/auth'
import type { AccountRole } from '../../lib/accountTypes'

/** Gates a route group to signed-in accounts whose role is in `allow` —
 * replaces the old passcode-only RequireStaffAuth now that there's a
 * real per-account role to check, not just "is anyone signed in." An
 * account of the wrong role (e.g. a doctor hitting /admin) is bounced to
 * their own home route rather than the login page, since they *are*
 * signed in, just not allowed here — landing them back on login would
 * look like their session broke instead of just being the wrong door. */
export function RequireRole({ allow }: { allow: AccountRole[] }) {
  const location = useLocation()
  const account = getCachedAccount()

  if (!account) {
    return <Navigate to="/staff/login" replace state={{ from: location.pathname }} />
  }
  if (!allow.includes(account.role)) {
    return <Navigate to={homeRouteFor(account.role)} replace />
  }
  return <Outlet />
}
