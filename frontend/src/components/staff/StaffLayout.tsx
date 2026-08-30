import { BarChart3, LogOut, ListChecks } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { getCachedAccount, logout } from '../../lib/auth'

const ALL_NAV_ITEMS = [
  { to: '/staff', label: 'Sessions', icon: ListChecks, end: true },
  { to: '/staff/revenue', label: 'Revenue', icon: BarChart3, end: false },
]

/**
 * The hospital/staff shell — a working console, not a calm reading
 * screen. Dark, dense top bar (vs. the patient side's light, spacious
 * one), full-width content instead of a centered reading column, because
 * this is meant to be glanced at and acted on quickly by someone standing
 * at a reception desk, not read start to finish. This contrast IS the
 * point (brief §16: "completely different from the hospital panel").
 *
 * Two sections now instead of one (Sessions, Revenue) — the console
 * stopped being a single page once the revenue dashboard existed
 * alongside the live queue console (see decisions log §18).
 */
export function StaffLayout() {
  const navigate = useNavigate()
  const account = getCachedAccount()
  // clinic_staff is operational-only — no Revenue nav item, and the
  // backend also 403s that call for this role (see routes/staff.ts), so
  // this hiding is a courtesy, not the actual enforcement boundary.
  const navItems = account?.role === 'clinic_staff' ? ALL_NAV_ITEMS.filter((i) => i.to !== '/staff/revenue') : ALL_NAV_ITEMS

  // Was a hardcoded #F4F2EC cream, a second undocumented "paper" color
  // independent of the design tokens — meant this page didn't pick up
  // the v3.1 background fix (docs/VISITNOW_PRODUCT_DECISIONS.md §23)
  // even though every other page did. Now uses the same token.
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)]">
      <header className="bg-[var(--color-brand-800)] print:hidden">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-6">
            <Link to="/staff" className="flex items-center gap-2.5">
              <span className="font-display text-lg font-semibold tracking-tight text-white">VisitNow</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/70">
                {account?.displayName ?? 'Staff console'}
              </span>
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-[13px] font-bold transition-colors ${
                      isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                    }`
                  }
                >
                  <item.icon size={14} aria-hidden="true" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
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
        <nav className="flex items-center gap-1 overflow-x-auto px-5 pb-2.5 sm:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-[13px] font-bold transition-colors ${
                  isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                }`
              }
            >
              <item.icon size={14} aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 py-6 sm:px-8">
        <Outlet />
      </main>
    </div>
  )
}
