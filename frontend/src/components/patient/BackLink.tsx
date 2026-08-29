import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/** An inline "back" affordance for drill-down pages — a normal website
 * pattern (like a breadcrumb), not a persistent app-style top bar. Each
 * page renders this itself, in its own content flow, instead of every
 * route being wrapped in a dedicated back-button layout. */
export function BackLink({ label = 'Back' }: { label?: string }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(-1)}
      className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
    >
      <ArrowLeft size={16} aria-hidden="true" />
      {label}
    </button>
  )
}
