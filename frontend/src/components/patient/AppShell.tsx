import { Outlet } from 'react-router-dom'
import { PatientBottomNav, PatientHeader } from './PatientHeader'

/**
 * The one shell every patient route renders inside — replaces the
 * previous PatientShellLayout/PatientFlowLayout split, which existed to
 * separate "tab" screens from "drill-down" screens but ended up
 * expressing that split as two different phone-app chrome styles
 * instead of as ordinary web navigation. A real website doesn't need a
 * different screen frame for "Home" versus "the doctor detail page you
 * clicked into" — both are just pages, reachable by a link and a
 * browser back button. Drill-down pages that want a "back" affordance
 * render their own inline one (see SessionDetailPage, etc.) the way a
 * breadcrumb or back-link works on a normal site, not a persistent
 * OS-style app bar.
 */
export function AppShell() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <PatientHeader />
      <main className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-6 sm:px-6 md:pb-10 lg:px-10">
        <Outlet />
      </main>
      <PatientBottomNav />
    </div>
  )
}
