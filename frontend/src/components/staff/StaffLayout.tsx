import { BarChart3, LogOut, ListChecks } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { staffLogout } from '../../lib/staffAuth'

const NAV_ITEMS = [
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

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F2EC]">
      <header className="bg-[var(--color-brand-800)] print:hidden">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-6">
            <Link to="/staff" className="flex items-center gap-2.5">
              <span className="font-display text-lg font-semibold tracking-tight text-white">VisitNow</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/70">
                Staff console
              </span>
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV_ITEMS.map((item) => (
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
            onClick={() => {
              staffLogout()
              navigate('/staff/login', { replace: true })
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-white/60 transition-colors hover:text-white"
          >
            <LogOut size={13} aria-hidden="true" />
            Sign out
          </button>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto px-5 pb-2.5 sm:hidden">
          {NAV_ITEMS.map((item) => (
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
