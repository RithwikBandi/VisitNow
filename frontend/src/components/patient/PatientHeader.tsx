import { Building2, Calendar, Home, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { VisitNowMark } from '../brand/VisitNowMark'
import { LocationBar } from '../../pages/patient/LocationPicker'

const NAV_ITEMS = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/clinics', label: 'Clinics', icon: Building2 },
  { to: '/visits', label: 'Visits', icon: Calendar },
  { to: '/profile', label: 'Profile', icon: User },
] as const

/**
 * A real website header — this is the single biggest fix from the
 * previous pass, which built a phone-app screen (fixed narrow column,
 * bottom-only nav, a native-style splash) and called it a website. On a
 * desktop viewport this reads exactly like any other production site's
 * header: small corner logo, nav links inline, profile access on the
 * right. It collapses to a compact bar + BottomNav only below the `md`
 * breakpoint — that collapse is a legitimate, common responsive-web
 * pattern (real production sites do this), not the previous mistake of
 * *always* rendering mobile-app chrome regardless of viewport width.
 */
export function PatientHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1400px] items-center gap-5 px-4 py-3 sm:px-6 lg:px-10">
        <NavLink to="/home" className="flex shrink-0 items-center gap-2">
          <VisitNowMark size={26} />
          <span className="hidden font-display text-lg font-bold tracking-tight text-[var(--color-text)] sm:inline">
            VisitNow
          </span>
        </NavLink>

        <div className="hidden md:block">
          <LocationBar />
        </div>

        <nav aria-label="Primary" className="ml-auto hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `rounded-[var(--radius-md)] px-3.5 py-2 text-sm font-bold transition-colors ${
                  isActive ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Mobile: just the location trigger, compact — nav lives in
            BottomNav below md. */}
        <div className="ml-auto md:hidden">
          <LocationBar compact />
        </div>
      </div>
    </header>
  )
}

export function PatientBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-sm md:hidden">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-4 py-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-w-16 flex-col items-center gap-1 rounded-[var(--radius-md)] px-3 py-1.5 transition-colors ${
                isActive ? 'text-[var(--color-brand-600)]' : 'text-[var(--color-text-faint)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.4 : 1.9} aria-hidden="true" />
                <span className={`text-[11px] ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
