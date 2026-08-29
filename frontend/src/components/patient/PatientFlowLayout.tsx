import { ArrowLeft } from 'lucide-react'
import { Outlet, useNavigate } from 'react-router-dom'

/** For drill-down screens (doctor detail, the token/payment flow,
 * confirmation, active visit) — no bottom tab bar, because these aren't
 * destinations you tab between, they're a linear path with a way back.
 * A back button standing in for browser-back keeps behavior consistent
 * even when a screen was reached via replace/redirect rather than a
 * normal push (e.g. arriving at Active Visit right after payment). */
export function PatientFlowLayout() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="sticky top-0 z-30 border-b border-[var(--color-border)]/70 bg-[var(--color-bg)]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center px-4 py-3 sm:px-6">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-border)]/60 hover:text-[var(--color-text)]"
          >
            <ArrowLeft size={19} aria-hidden="true" />
          </button>
        </div>
      </div>
      <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-2 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
