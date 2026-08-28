import { Link, Outlet } from 'react-router-dom'

/**
 * The hospital/staff shell — a working console, not a calm reading
 * screen. Dark, dense top bar (vs. the patient side's light, spacious
 * one), full-width content instead of a centered reading column, because
 * this is meant to be glanced at and acted on quickly by someone standing
 * at a reception desk, not read start to finish. This contrast IS the
 * point (brief §16: "completely different from the hospital panel").
 */
export function StaffLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F4F2EC]">
      <header className="bg-[var(--color-brand-800)]">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3.5 sm:px-8">
          <Link to="/staff" className="flex items-center gap-2.5">
            <span className="font-display text-lg font-semibold tracking-tight text-white">VisitNow</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/70">
              Staff console
            </span>
          </Link>
          <Link to="/" className="text-xs font-semibold text-white/60 transition-colors hover:text-white">
            ← Patient view
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 py-6 sm:px-8">
        <Outlet />
      </main>
    </div>
  )
}
