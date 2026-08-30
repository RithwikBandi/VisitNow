import { LogOut, Stethoscope } from 'lucide-react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { getCachedAccount, logout } from '../../lib/auth'

/** A minimal shell for the doctor's own dashboard — one page, so no nav
 * beyond a logout, unlike StaffLayout's multi-section console. Same dark
 * dense header register as StaffLayout for the "professional console,
 * not the patient app" contrast, without inheriting a Sessions/Revenue
 * nav that doesn't apply here. */
export function DoctorLayout() {
  const navigate = useNavigate()
  const account = getCachedAccount()

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)]">
      <header className="bg-[var(--color-brand-800)] print:hidden">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link to="/doctor" className="flex items-center gap-2.5">
            <Stethoscope size={18} className="text-white/70" aria-hidden="true" />
            <span className="font-display text-lg font-semibold tracking-tight text-white">{account?.displayName ?? 'Doctor'}</span>
          </Link>
          <button
            onClick={async () => {
              await logout()
              navigate('/staff/login', { replace: true })
            }}
            className="press-scale flex items-center gap-1.5 text-xs font-semibold text-white/60 hover:text-white"
          >
            <LogOut size={13} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 py-6 sm:px-8">
        <Outlet />
      </main>
    </div>
  )
}
