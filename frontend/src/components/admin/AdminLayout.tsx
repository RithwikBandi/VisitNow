import { LogOut, ShieldCheck } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '../../lib/auth'
import { NotificationBell } from '../staff/NotificationBell'
import { hasPermission } from '../staff/RequirePermission'

const ALL_NAV_ITEMS: { to: string; label: string; end: boolean; module?: string }[] = [
  { to: '/admin', label: 'Tenants', end: true },
  { to: '/admin/revenue', label: 'Platform revenue', end: false, module: 'payments' },
  { to: '/admin/refunds', label: 'Refunds', end: false, module: 'refunds' },
  { to: '/admin/coupons', label: 'Coupons', end: false, module: 'coupons' },
  { to: '/admin/patients', label: 'Patients', end: false, module: 'crm' },
]

/** The super_admin shell — platform ops, not a clinic's own console.
 * Same dark dense-header register as StaffLayout/DoctorLayout, its own
 * identity (a shield mark, "Platform admin" label) so it doesn't read
 * as just another clinic's staff console. */
export function AdminLayout() {
  const navigate = useNavigate()
  const navItems = ALL_NAV_ITEMS.filter((i) => !i.module || hasPermission(i.module))

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)]">
      <header className="bg-[var(--color-ink)] print:hidden">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-6">
            <Link to="/admin" className="flex items-center gap-2.5">
              <ShieldCheck size={18} className="text-white/70" aria-hidden="true" />
              <span className="font-display text-lg font-semibold tracking-tight text-white">VisitNow</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/70">
                Platform admin
              </span>
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `rounded-[var(--radius-sm)] px-3 py-1.5 text-[13px] font-bold ${isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
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
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 py-6 sm:px-8">
        <Outlet />
      </main>
    </div>
  )
}
