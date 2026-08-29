import { Link, Outlet } from 'react-router-dom'

/**
 * The patient-facing shell — calm, spacious, single-column-biased. No
 * sidebar, no dense nav: a patient only ever needs to go "home" or look
 * at their token, so that's all the header offers. Deliberately visually
 * distinct from StaffLayout (see brief §16) — warm background, serif
 * wordmark, generous vertical rhythm, one quiet link to the hospital side
 * rather than a peer nav item.
 */
export function PatientLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)]">
      <header className="border-b border-[var(--color-border)]/70">
        <div className="mx-auto flex max-w-6xl items-center px-5 py-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-[22px] font-semibold tracking-tight text-[var(--color-brand-700)]">
              VisitNow
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 pt-6 sm:px-8">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--color-border)]/70 py-6 text-center text-xs text-[var(--color-text-faint)]">
        <p>VisitNow — get your token remotely, track your queue, arrive closer to your turn.</p>
        {/* Deliberately quiet, not a nav item — this app's patient side
            and hospital side are two different audiences (see App.tsx's
            RequireStaffAuth), not two tabs of the same product. */}
        <Link to="/staff/login" className="mt-1 inline-block hover:text-[var(--color-brand-700)]">
          Hospital or clinic staff sign in →
        </Link>
      </footer>
    </div>
  )
}
