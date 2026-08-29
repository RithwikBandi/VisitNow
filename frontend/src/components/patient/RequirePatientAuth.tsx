import { Navigate, Outlet } from 'react-router-dom'
import { getPatientIdentity } from '../../lib/patientIdentity'

/** Gates every patient route except Splash and Auth themselves. See
 * lib/patientIdentity.ts for exactly what this is (and isn't). */
export function RequirePatientAuth() {
  if (!getPatientIdentity()) {
    return <Navigate to="/auth" replace />
  }
  return <Outlet />
}
