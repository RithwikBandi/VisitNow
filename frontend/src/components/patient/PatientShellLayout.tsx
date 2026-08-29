import { Calendar, Home, User } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

/**
 * The three-tab shell — Home / Visits / Profile, per the product brief's
 * §24. This is the *only* nav a patient ever needs; there's deliberately
 * no hamburger menu or secondary nav hiding extra destinations. Bottom-
 * fixed because the core product is a mobile experience (§41) — on a
 * wider viewport it stays bottom-fixed rather than migrating to a top
 * bar, so the app reads the same way regardless of screen size instead
 * of becoming a different product on desktop.
 */
export function PatientShellLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)]">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-5 sm:px-6">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-around px-4 py-2">
          <TabLink to="/home" icon={Home} label="Home" />
          <TabLink to="/visits" icon={Calendar} label="Visits" />
          <TabLink to="/profile" icon={User} label="Profile" />
        </div>
      </nav>
    </div>
  )
}

function TabLink({ to, icon: Icon, label }: { to: string; icon: typeof Home; label: string }) {
  return (
    <NavLink
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
  )
}
