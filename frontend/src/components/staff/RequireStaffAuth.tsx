import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isStaffAuthed } from '../../lib/staffAuth'

/** Gates every /staff/* route except the login page itself. See
 * staffAuth.ts for exactly what this does and doesn't protect against. */
export function RequireStaffAuth() {
  const location = useLocation()
  if (!isStaffAuthed()) {
    return <Navigate to="/staff/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
